// Supabase Edge Function (Deno) - mp-webhook
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

async function verifySignature(req: Request, bodyText: string, secret: string): Promise<boolean> {
  const xSignature = req.headers.get('x-signature');
  const xRequestId = req.headers.get('x-request-id');

  if (!xSignature || !xRequestId || !secret) {
    // M-06: Fail-CLOSED — nunca aceitar webhooks sem assinatura verificável em produção.
    console.error('🔒 MP_WEBHOOK_SECRET não configurado ou headers ausentes. Rejeitando requisição.');
    return false;
  }

  // Parse x-signature
  const parts = xSignature.split(',');
  let ts = '';
  let v1 = '';

  parts.forEach(part => {
    const [key, value] = part.split('=');
    if (key.trim() === 'ts') ts = value.trim();
    if (key.trim() === 'v1') v1 = value.trim();
  });

  const manifest = `id:${getUrlParam(req, 'data.id')};request-id:${xRequestId};ts:${ts};`;

  // Create HMAC
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(manifest)
  );

  const hexSignature = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return hexSignature === v1;
}

function getUrlParam(req: Request, param: string): string {
  // O Mercado Pago envia o data.id tanto no body quanto como query param na URL.
  // O manifest de assinatura usa o data.id da query string da notification_url.
  try {
    const url = new URL(req.url);
    if (param === 'data.id') {
      return url.searchParams.get('data.id') || url.searchParams.get('id') || '';
    }
    return url.searchParams.get(param) || '';
  } catch {
    return '';
  }
}


async function fetchMpPayment(paymentId: string, mpAccessToken: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` }
  });
  if (!res.ok) throw new Error(`MP fetch failed ${res.status}`);
  return res.json();
}

async function sendEmail(sendgridKey: string, from: string, to: string, subject: string, html: string) {
  if (!sendgridKey || !from || !to) return false;
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: from }, subject, content: [{ type: 'text/html', value: html }] })
  });
  return res.ok;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
  const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET');

  let bodyText = '';
  let bodyJson: any = {};

  try {
    bodyText = await req.text();
    bodyJson = JSON.parse(bodyText);
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Verificação de assinatura HMAC do Mercado Pago.
  // Quando MP_WEBHOOK_SECRET está configurado (produção), rejeita requisições com assinatura inválida.
  // Quando não está configurado, apenas loga aviso e continua (modo permissivo para ambientes de teste).
  if (MP_WEBHOOK_SECRET) {
    const xSignature = req.headers.get('x-signature');
    if (xSignature) {
      // Formato v2.0 (MercadoPago Feed): possui x-signature — verificar HMAC
      const signatureValid = await verifySignature(req, bodyText, MP_WEBHOOK_SECRET);
      if (!signatureValid) {
        console.warn('⚠️ [M-06] Assinatura v2.0 inválida. Requisição rejeitada.');
        return new Response('Unauthorized', { status: 401 });
      }
      console.log('✅ Assinatura v2.0 verificada com sucesso.');
    } else {
      // Formato v1.0 legacy (IPN): não envia x-signature — aceitar e logar.
      // O payload é validado internamente via fetchMpPayment (double-check na API do MP)
      // antes de qualquer atualização de dados, portanto a segurança é mantida.
      console.info('ℹ️ Notificação v1.0 recebida (sem x-signature). Aceita sem HMAC (formato legacy MP).');
    }
  } else {
    console.warn('⚠️ MP_WEBHOOK_SECRET não configurado — assinatura não verificada. Configure em produção.');
  }

function sanitizeForLog(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeForLog);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('card') ||
      lowerKey.includes('cvv') ||
      lowerKey.includes('security_code') ||
      lowerKey.includes('password') ||
      lowerKey.includes('token')
    ) {
      sanitized[key] = '***REDACTED***';
    } else if (lowerKey.includes('email') && typeof value === 'string') {
      const [user, domain] = value.split('@');
      sanitized[key] = user ? `${user.substring(0, 2)}***@${domain || ''}` : '***@***';
    } else if (lowerKey.includes('phone') && typeof value === 'string') {
      sanitized[key] = value.length > 4 ? `***${value.slice(-4)}` : '***';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForLog(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

  // Log to database (com saneamento PII)
  const logEntry = {
    provider: 'mercadopago',
    payload: sanitizeForLog(bodyJson),
    status: 'pending',
    signature: req.headers.get('x-signature')
  };

  const { data: logData, error: logError } = await supabase
    .from('webhook_logs')
    .insert(logEntry)
    .select()
    .single();


  const logId = logData?.id;

  try {
    const paymentId = bodyJson.data?.id || bodyJson.id; // MP sends data.id usually
    const type = bodyJson.type;

    if (type !== 'payment') {
      // Just log and ignore non-payment events (like test notifications)
      if (logId) await supabase.from('webhook_logs').update({ status: 'ignored', error_message: 'Not a payment event' }).eq('id', logId);
      return new Response('Ignored non-payment event', { status: 200 });
    }

    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');

    let bookingId: string | null = null;
    let existingBooking: any = null;

    // 1. Double Check with MP API (Self-Validation)
    // This confirms the payment status is real and not a spoofed payload
    const mpPayment = await fetchMpPayment(paymentId, MP_ACCESS_TOKEN);
    console.log(`✅ Verified payment ${paymentId} status: ${mpPayment.status}`);
    console.log(`💳 Payment method: ${mpPayment.payment_method_id}`);
    console.log(`📊 Payment type: ${mpPayment.payment_type_id}`);

    const externalRef = mpPayment.external_reference;
    console.log(`🔍 Processing external_reference: ${externalRef}`);
    let success = false;

    // 2. Process based on Reference
    let ledgerTransactionId = null;

    if (externalRef && externalRef.startsWith('EVENTO_')) {
      // ... Event Logic ...
      const inscricaoId = externalRef.replace('EVENTO_', '');
      console.log(`🎫 Processing event payment - Enrollment ID: ${inscricaoId}`);

      const { error: eventError } = await supabase.from('inscricoes_eventos')
        .update({
          payment_status: mpPayment.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', inscricaoId);

      if (eventError) console.error('Error updating event:', eventError);

      // Update Payment Record for Event
      const { data: payData } = await supabase.from('payments')
        .update({ status: mpPayment.status, raw_payload: mpPayment })
        .eq('mp_payment_id', paymentId.toString())
        .select()
        .single();

      if (payData) ledgerTransactionId = payData.id;

      // =====================================================
      // FINANCIAL SPLIT LOGIC FOR EVENTS
      // =====================================================
      if (mpPayment.status === 'approved' && payData) {
        console.log('💰 Processing financial split for event payment...');

        try {
          // 1. Fetch event details and configuration
          const { data: inscricao, error: inscricaoError } = await supabase
            .from('inscricoes_eventos')
            .select(`
              evento_id,
              eventos (
                id,
                titulo,
                valor,
                professional_id,
                platform_fee_type,
                platform_fee_value
              )
            `)
            .eq('id', inscricaoId)
            .single();

          if (inscricaoError || !inscricao) {
            console.error('❌ Error fetching event details for split:', inscricaoError);
          } else {
            const evento = inscricao.eventos;
            const totalAmount = mpPayment.transaction_amount;

            // 2. Calculate split using database function
            const { data: splitData, error: splitCalcError } = await supabase
              .rpc('calculate_event_split', {
                p_evento_id: evento.id,
                p_total_amount: totalAmount
              });

            if (splitCalcError || !splitData || splitData.length === 0) {
              console.error('❌ Error calculating split:', splitCalcError);
            } else {
              const split = splitData[0];

              // 3. Register split in database
              const { data: splitRecord, error: splitInsertError } = await supabase
                .from('event_financial_splits')
                .insert({
                  evento_id: evento.id,
                  inscricao_id: inscricaoId,
                  payment_id: payData.id,
                  total_amount: totalAmount,
                  platform_amount: split.platform_amount,
                  professional_amount: split.professional_amount,
                  split_calculation: split.calculation_details,
                  professional_id: evento.professional_id
                })
                .select()
                .single();

              if (splitInsertError) {
                console.error('❌ Error inserting split record:', splitInsertError);
              } else {
                console.log('✅ Financial split registered successfully:', {
                  split_id: splitRecord.id,
                  total: totalAmount,
                  platform: split.platform_amount,
                  professional: split.professional_amount,
                  evento: evento.titulo
                });
              }
            }
          }
        } catch (splitError) {
          console.error('❌ Unexpected error in split processing:', splitError);
          // Don't fail the webhook - split is not critical for payment confirmation
        }
      }
      // =====================================================
      // END FINANCIAL SPLIT LOGIC
      // =====================================================

      success = true;
    } else {
      // Booking Logic

      // UUID format validation
      // Standard: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with hyphens)
      // Alternative: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (32 chars without hyphens)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uuidNoHyphensRegex = /^[0-9a-f]{32}$/i;

      if (externalRef && !externalRef.startsWith('EVENTO_')) {
        if (uuidRegex.test(externalRef) || uuidNoHyphensRegex.test(externalRef)) {
          bookingId = externalRef;
          console.log(`✅ Valid booking UUID detected: ${bookingId}`);
        } else {
          console.warn(`⚠️ Invalid UUID format for external_reference: ${externalRef}`);
          console.warn(`   UUID regex test: ${uuidRegex.test(externalRef)}`);
          console.warn(`   UUID no-hyphens test: ${uuidNoHyphensRegex.test(externalRef)}`);
        }
      } else if (externalRef) {
        console.log(`🎫 Event reference detected: ${externalRef}`);
      } else {
        console.warn(`⚠️ No external_reference provided in payment ${paymentId}`);
      }

      if (bookingId) {
        // Verify booking exists before updating
        const { data: bookingData, error: fetchError } = await supabase
          .from('bookings')
          .select('id, status, valor_consulta, valor_repasse_profissional, professional_id, patient_name, booking_date')
          .eq('id', bookingId)
          .single();

        existingBooking = bookingData;

        if (fetchError || !existingBooking) {
          console.error(`❌ Booking ${bookingId} not found!`, fetchError);
          if (logId) await supabase.from('webhook_logs').update({
            status: 'error',
            error_message: `Booking ${bookingId} not found`
          }).eq('id', logId);
          return new Response(`Booking ${bookingId} not found`, { status: 404 });
        }

        // M-03: statusMap declarado antes de qualquer uso
        const statusMap: any = {
          'approved': 'confirmed',
          'authorized': 'confirmed',
          'paid': 'confirmed',
          'in_process': 'pending',
          'rejected': 'cancelled',
          'cancelled': 'cancelled',
          'refunded': 'cancelled',
          'charged_back': 'cancelled'
        };

        console.log(`📋 Found booking ${bookingId}:`, {
          currentStatus: existingBooking.status,
          currentPaymentStatus: existingBooking.payment_status,
          newMPStatus: mpPayment.status,
          willUpdateTo: statusMap[mpPayment.status]
        });


        const newStatus = statusMap[mpPayment.status];

        // M-03: Máquina de estados — impede regressões de status por webhooks tardios
        const ALLOWED_TRANSITIONS: Record<string, string[]> = {
          'pending': ['confirmed', 'cancelled'],
          'awaiting_payment': ['confirmed', 'cancelled'],
          'confirmed': ['cancelled', 'completed'],
          'completed': [], // estado terminal — nenhuma transição permitida
          'cancelled': [], // estado terminal — nenhuma transição permitida
        };
        const allowedNext = ALLOWED_TRANSITIONS[existingBooking.status] ?? [];

        if (newStatus && !allowedNext.includes(newStatus)) {
          console.warn(`⚠️ [M-03] Transição bloqueada: ${existingBooking.status} → ${newStatus} para booking ${bookingId}. Webhook ignorado.`);
          success = true; // considera processado sem erro
        } else if (newStatus) {
          const { error: updateError } = await supabase.from('bookings')
            .update({
              status: newStatus,
              payment_status: mpPayment.status,
              marketplace_payment_id: paymentId.toString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', bookingId);

          if (updateError) {
            console.error(`❌ Error updating booking ${bookingId}:`, updateError);
            throw updateError;
          }

          console.log(`✅ Booking ${bookingId} updated successfully:`, {
            oldStatus: existingBooking.status,
            newStatus: newStatus,
            paymentStatus: mpPayment.status,
            mpPaymentId: paymentId,
            transactionAmount: mpPayment.transaction_amount
          });
          success = true;
        } else if (!newStatus) {
          console.warn(`⚠️ No status mapping for MP status: ${mpPayment.status}`);
        }
      } else {
        console.warn(`⚠️ No valid booking ID found in external_reference: ${externalRef}`);
      }

      const { data: payData, error: payUpdateError } = await supabase.from('payments')
        .update({ status: mpPayment.status, raw_payload: mpPayment })
        .eq('mp_payment_id', paymentId.toString())
        .select()
        .single();

      if (payUpdateError) {
        console.error(`❌ Error updating payment record:`, payUpdateError);
      } else {
        console.log(`✅ Payment record updated for MP payment ${paymentId}`);
      }

      if (payData) ledgerTransactionId = payData.id;
    }

    // ========================================
    // 3. LEDGER ENTRY (Double Entry Accounting)
    // ========================================
    const isPositiveStatus = ['approved', 'authorized', 'paid'].includes(mpPayment.status);
    const isReversalStatus = ['refunded', 'charged_back'].includes(mpPayment.status);

    if ((isPositiveStatus || isReversalStatus) && ledgerTransactionId) {
      try {
        console.log(`📒 Recording ledger entries for transaction ${ledgerTransactionId} (Status: ${mpPayment.status})`);

        // Check for existing ledger entry for this specific status/type to prevent duplicates
        // Note: UNIQUE constraint (transaction_id, account_code, entry_type) protects this
        const { data: existingEntries } = await supabase.from('payment_ledger_entries')
          .select('account_code, entry_type')
          .eq('transaction_id', ledgerTransactionId);

        const hasEntry = (account: string, type: string) =>
          existingEntries?.some((e: any) => e.account_code === account && e.entry_type === type);

        const totalAmount = mpPayment.transaction_amount;
        const profPayout = existingBooking?.valor_repasse_profissional || 0;
        const platformFee = (existingBooking?.valor_consulta || totalAmount) - profPayout;

        let entries: any[] = [];

        if (isPositiveStatus && !hasEntry('CASH_BANK', 'DEBIT')) {
          // Normal Payment Split
          entries = [
            {
              transaction_id: ledgerTransactionId,
              entry_type: 'DEBIT',
              account_code: 'CASH_BANK',
              amount: totalAmount,
              description: `Recebimento: Agendamento #${bookingId || externalRef}`,
              created_at: new Date().toISOString()
            },
            {
              transaction_id: ledgerTransactionId,
              entry_type: 'CREDIT',
              account_code: 'REVENUE_SERVICE',
              amount: platformFee,
              description: `Receita Plataforma: Agendamento #${bookingId || externalRef}`,
              created_at: new Date().toISOString()
            },
            {
              transaction_id: ledgerTransactionId,
              entry_type: 'CREDIT',
              account_code: 'LIABILITY_PROFESSIONAL',
              amount: profPayout,
              description: `A Pagar Profissional: Agendamento #${bookingId || externalRef}`,
              created_at: new Date().toISOString()
            }
          ];
        } else if (isReversalStatus && !hasEntry('CASH_BANK', 'CREDIT')) {
          // M-05: Reversal Entry (Refund/Chargeback)
          console.log(`🔄 Creating reversal entries for ${mpPayment.status}`);
          entries = [
            {
              transaction_id: ledgerTransactionId,
              entry_type: 'CREDIT', // Money leaving bank
              account_code: 'CASH_BANK',
              amount: totalAmount,
              description: `ESTORNO (${mpPayment.status}): Agendamento #${bookingId || externalRef}`,
              created_at: new Date().toISOString()
            },
            {
              transaction_id: ledgerTransactionId,
              entry_type: 'DEBIT', // Reversing platform revenue
              account_code: 'REVENUE_SERVICE',
              amount: platformFee,
              description: `REVERSÃO RECEITA: Agendamento #${bookingId || externalRef}`,
              created_at: new Date().toISOString()
            },
            {
              transaction_id: ledgerTransactionId,
              entry_type: 'DEBIT', // Reversing professional liability
              account_code: 'LIABILITY_PROFESSIONAL',
              amount: profPayout,
              description: `REVERSÃO REPASSE: Agendamento #${bookingId || externalRef}`,
              created_at: new Date().toISOString()
            }
          ];
        }

        if (entries.length > 0) {
          const finalEntries = entries.filter(e => e.amount > 0 || e.account_code === 'CASH_BANK');
          const { error: ledgerError } = await supabase.from('payment_ledger_entries').insert(finalEntries);
          if (ledgerError) console.error('❌ Ledger insert error:', ledgerError);
          else console.log(`✅ Ledger entries (${isReversalStatus ? 'reversal' : 'split'}) recorded successfully`);
        } else {
          console.log('ℹ️ Ledger entries for this status already exist or status not applicable, skipping.');
        }
      } catch (ledgerErr: any) {
        console.error('❌ Unexpected ledger error:', ledgerErr);
      }
    }

    // ========================================
    // 4. AUTOMATED NFS-E EMISSION (BHISS PBH)
    // ========================================
    if (isPositiveStatus) {
      try {
        console.log(`🧾 Triggering automated NFS-e emission for payment ${paymentId}...`);
        const { error: nfseInvokeError } = await supabase.functions.invoke('emit-nfse', {
          body: {
            booking_id: bookingId,
            inscricao_id: externalRef && externalRef.startsWith('EVENTO_') ? externalRef.replace('EVENTO_', '') : null,
            payment_id: ledgerTransactionId
          }
        });
        if (nfseInvokeError) {
          console.error('⚠️ Warning: Automatic NFS-e emission invocation failed:', nfseInvokeError);
        } else {
          console.log('✅ NFS-e emission triggered successfully.');
        }
      } catch (nfseErr) {
        console.error('⚠️ Non-fatal error triggering NFS-e:', nfseErr);
      }
    }

    // Update Log
    if (logId) await supabase.from('webhook_logs').update({ status: 'success' }).eq('id', logId);


    return new Response('OK', { status: 200 });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    if (logId) await supabase.from('webhook_logs').update({ status: 'error', error_message: error.message }).eq('id', logId);
    return new Response('Internal Error', { status: 500 });
  }
});
