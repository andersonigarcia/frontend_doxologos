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

  let bodyJson: any = {};
  try {
    bodyJson = JSON.parse(bodyText);
  } catch (e) {
    // ignore
  }

  const urlId = getUrlParam(req, 'data.id');
  const finalId = urlId || bodyJson?.data?.id || bodyJson?.id || '';

  const manifest = `id:${finalId};request-id:${xRequestId};ts:${ts};`;

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

// FIX #7: sanitizeForLog movida para escopo de módulo (fora do handler)
// Evita problemas de hoisting instável em Deno com arrow functions
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
    // FIX #6: flag para evitar dupla emissão de NFS-e quando já tratada inline
    let nfseHandledInline = false;

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

    if (externalRef && externalRef.startsWith('LIVRO_')) {
      // ── Recurso Digital do Livro ──────────────────────────────
      const resourceId = externalRef.replace('LIVRO_', '');
      console.log(`📚 Processing digital resource payment - Resource ID: ${resourceId}`);

      if (mpPayment.status === 'approved') {
        // Atualizar user_book_downloads via payment_id (reconciliação)
        const { error: dlUpdateErr } = await supabase
          .from('user_book_downloads')
          .update({ payment_status: 'completed' })
          .eq('payment_id', paymentId.toString())
          .eq('download_type', 'paid');

        if (dlUpdateErr) {
          console.error('❌ Error updating user_book_downloads:', dlUpdateErr);
        } else {
          console.log('✅ user_book_downloads updated to completed');
        }

        // Incrementar purchase_count no recurso
        await supabase.rpc('increment_book_resource_purchases', { p_resource_id: resourceId });

        // Notificação de sistema no painel admin
        await supabase.from('notifications').insert([{
          user_id: null,
          type: 'book:purchase',
          title: 'Nova venda de material do livro',
          message: `Pagamento ${paymentId} aprovado para recurso ${resourceId} — R$ ${mpPayment.transaction_amount?.toFixed(2)}`,
          link: '/admin?tab=book-resources',
          metadata: {
            resource_id: resourceId,
            payment_id: paymentId,
            payer_email: mpPayment.payer?.email,
            amount: mpPayment.transaction_amount,
          },
        }]);

        success = true;
      } else {
        // Pagamento recusado/cancelado — marcar como failed
        await supabase
          .from('user_book_downloads')
          .update({ payment_status: 'failed' })
          .eq('payment_id', paymentId.toString())
          .eq('download_type', 'paid');
      }

      if (logId) {
        await supabase.from('webhook_logs')
          .update({ status: success ? 'processed' : 'ignored', processed_at: new Date().toISOString() })
          .eq('id', logId);
      }

      return new Response(JSON.stringify({ ok: true, type: 'digital_resource' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (externalRef && externalRef.startsWith('EVENTO_')) {
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
    } else if (externalRef && externalRef.startsWith('PACOTE_')) {
      // =====================================================
      // PACKAGE LOGIC (Agendamento Múltiplo / Pacotes)
      // =====================================================
      const packageId = externalRef.replace('PACOTE_', '');
      console.log(`📦 Processing package payment - Package ID: ${packageId}`);

      const { data: pkgData, error: pkgFetchError } = await supabase
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (pkgFetchError || !pkgData) {
        console.error(`❌ Package ${packageId} not found!`, pkgFetchError);
      } else {
        // Update Package status
        await supabase.from('packages').update({
          status: mpPayment.status === 'approved' ? 'paid' : mpPayment.status,
          marketplace_payment_id: paymentId.toString(),
          updated_at: new Date().toISOString()
        }).eq('id', packageId);

        // Update all child bookings
        await supabase.from('bookings').update({
          status: mpPayment.status === 'approved' ? 'confirmed' : 'pending',
          payment_status: mpPayment.status,
          marketplace_payment_id: paymentId.toString(),
          updated_at: new Date().toISOString()
        }).eq('package_id', packageId);

        // Update Payments table
        const { data: payData } = await supabase.from('payments')
          .update({ status: mpPayment.status, raw_payload: mpPayment })
          .eq('mp_payment_id', paymentId.toString())
          .select()
          .single();

        if (payData) ledgerTransactionId = payData.id;

        // Register Ledger Entry for Package Custody: CASH_BANK (Debit) -> PACKAGE_ESCROW (Credit)
        if (mpPayment.status === 'approved' && payData) {
          await supabase.from('payment_ledger_entries').insert([
            {
              transaction_id: payData.id,
              entry_type: 'DEBIT',
              account_code: 'CASH_BANK',
              amount: pkgData.gross_amount,
              description: `Recebimento Pacote #${packageId} (${pkgData.total_sessions} sessões)`,
              created_at: new Date().toISOString()
            },
            {
              transaction_id: payData.id,
              entry_type: 'CREDIT',
              account_code: 'PACKAGE_ESCROW',
              amount: pkgData.gross_amount,
              description: `Custódia Pacote #${packageId} (${pkgData.total_sessions} sessões)`,
              created_at: new Date().toISOString()
            }
          ]);

          // FIX #6: Emissão inline de NFS-e para pacotes (evita duplo disparo no bloco externo)
          try {
            console.log(`🧾 Disparando NFS-e para pacote ${packageId} (payment_id: ${payData.id})...`);
            const { error: nfsePkgErr } = await supabase.functions.invoke('emit-nfse', {
              body: {
                package_id: packageId,
                payment_id: payData.id,
              }
            });
            if (nfsePkgErr) {
              console.error('⚠️ Falha ao disparar NFS-e para pacote (non-fatal):', nfsePkgErr);
            } else {
              console.log('✅ NFS-e de pacote disparada com sucesso.');
              nfseHandledInline = true; // Marca como tratada — bloco externo não re-emitirá
            }
          } catch (nfseErr) {
            console.error('⚠️ Exceção ao disparar NFS-e de pacote (non-fatal):', nfseErr);
          }
        }
      }
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
          .select('id, user_id, status, valor_consulta, valor_repasse_profissional, professional_id, patient_name, booking_date')
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
        let didCancelBooking = false;

        // M-03: Máquina de estados — impede regressões de status por webhooks tardios
        const ALLOWED_TRANSITIONS: Record<string, string[]> = {
          'pending_payment': ['awaiting_payment', 'confirmed', 'cancelled'],
          'awaiting_payment': ['confirmed', 'cancelled'], // cartão in_process → aprovado/recusado
          'pending': ['confirmed', 'cancelled'],
          'confirmed': ['cancelled', 'completed'],
          'completed': [], // estado terminal — nenhuma transição permitida
          'cancelled': [], // estado terminal — nenhuma transição permitida
          'cancelled_by_patient': [],
          'cancelled_by_professional': [],
          'no_show_unjustified': []
        };
        
        // Se o status não está mapeado (fallback), permitimos transições padrão para não bloquear o fluxo
        const allowedNext = ALLOWED_TRANSITIONS[existingBooking.status] ?? ['awaiting_payment', 'confirmed', 'cancelled'];

        if (newStatus && !allowedNext.includes(newStatus)) {
          console.warn(`⚠️ [M-03] Transição bloqueada: ${existingBooking.status} → ${newStatus} para booking ${bookingId}. Webhook ignorado.`);
          success = true; // considera processado sem erro
        } else if (newStatus) {
          // ==========================================
          // LAZY REGISTRATION (Guest Checkout)
          // ==========================================
          if (newStatus === 'confirmed' && !existingBooking.user_id && existingBooking.patient_email) {
            try {
              console.log(`👤 Criando conta para novo paciente (Lazy Registration): ${existingBooking.patient_email}`);
              const randomPassword = crypto.randomUUID() + 'A1@';
              
              const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
                email: existingBooking.patient_email,
                password: randomPassword,
                email_confirm: true,
                user_metadata: {
                  full_name: existingBooking.patient_name,
                  name: existingBooking.patient_name,
                  is_lazy_registered: true
                }
              });

              if (createUserError) {
                if (createUserError.message.includes('already registered')) {
                    const { data: rpcUserId } = await supabase.rpc('get_user_id_by_email', { user_email: existingBooking.patient_email });
                    if (rpcUserId) {
                        existingBooking.user_id = rpcUserId;
                    }
                } else {
                    console.error('❌ Erro ao criar conta lazy:', createUserError);
                }
              } else if (newUser?.user?.id) {
                console.log(`✅ Conta criada com sucesso via Lazy Registration. ID: ${newUser.user.id}`);
                existingBooking.user_id = newUser.user.id;
              }
            } catch (err) {
              console.error('⚠️ Erro inesperado na criação lazy:', err);
            }
          }

          const { error: updateError } = await supabase.from('bookings')
            .update({
              status: newStatus,
              payment_status: mpPayment.status,
              marketplace_payment_id: paymentId.toString(),
              user_id: existingBooking.user_id, // Atualiza o user_id caso tenha sido criado via lazy registration
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
          
          if (newStatus === 'cancelled') {
            didCancelBooking = true;
          }

          // ── Post-Payment Orchestrator (fire-and-forget) ─────────────────
          // Dispara email de confirmação ao paciente e ao profissional.
          // Falha aqui NÃO impede o webhook de retornar 200.
          // Controlado por variável de ambiente POST_PAYMENT_ORCHESTRATOR.
          if (newStatus === 'confirmed') {
            const orchestratorEnabled = (Deno.env.get('POST_PAYMENT_ORCHESTRATOR') || 'false').toLowerCase() === 'true';
            if (orchestratorEnabled) {
              supabase.functions.invoke('post-payment-orchestrator', {
                body: { booking_id: bookingId }
              }).then(({ error: orchErr }: any) => {
                if (orchErr) {
                  console.error(`⚠️ [Orchestrator] Falha ao invocar para booking ${bookingId} (non-fatal):`, orchErr);
                } else {
                  console.log(`✅ [Orchestrator] Invocado com sucesso para booking ${bookingId}`);
                }
              }).catch((e: any) => {
                console.error(`⚠️ [Orchestrator] Exceção na invocação (non-fatal):`, e);
              });
            } else {
              console.log(`ℹ️ [Orchestrator] Desativado (POST_PAYMENT_ORCHESTRATOR=false). Email não disparado.`);
            }
          }
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
      
      if (didCancelBooking && payData && Number(payData.wallet_balance_used) > 0) {
        console.log(`💰 Refunding wallet balance of ${payData.wallet_balance_used} for booking ${bookingId}`);
        const { error: refundError } = await supabase.rpc('process_wallet_transaction', {
            p_patient_id: existingBooking.user_id,
            p_amount: Number(payData.wallet_balance_used),
            p_type: 'credit_cancellation',
            p_description: 'Estorno de saldo por falha ou expiração no pagamento',
            p_booking_id: bookingId
        });
        if (refundError) {
            console.error('❌ Failed to refund wallet balance:', refundError);
        } else {
            console.log('✅ Wallet balance refunded successfully');
        }
      }
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
    // FIX #6: Só dispara se não foi tratado inline (evita dupla emissão para pacotes)
    // FIX #6: Garante que bookingId ou ledgerTransactionId estão resolvidos antes de invocar
    // ========================================
    if (isPositiveStatus && !nfseHandledInline) {
      const hasValidReference = !!(bookingId || ledgerTransactionId ||
        (externalRef && externalRef.startsWith('EVENTO_')));

      if (!hasValidReference) {
        console.warn('⚠️ NFS-e não disparada: nenhuma referência válida (bookingId, ledgerTransactionId ou inscricaoId) resolvida.');
      } else {
        try {
          const inscricaoId = externalRef && externalRef.startsWith('EVENTO_')
            ? externalRef.replace('EVENTO_', '')
            : null;

          console.log(`🧾 Disparando NFS-e: booking=${bookingId} | inscricao=${inscricaoId} | payment=${ledgerTransactionId}`);

          const { error: nfseInvokeError } = await supabase.functions.invoke('emit-nfse', {
            body: {
              booking_id: bookingId,
              inscricao_id: inscricaoId,
              payment_id: ledgerTransactionId,
            }
          });

          if (nfseInvokeError) {
            console.error('⚠️ Falha ao disparar NFS-e (non-fatal):', nfseInvokeError);
          } else {
            console.log('✅ NFS-e disparada com sucesso.');
          }
        } catch (nfseErr) {
          console.error('⚠️ Exceção ao disparar NFS-e (non-fatal):', nfseErr);
        }
      }
    } else if (nfseHandledInline) {
      console.log('ℹ️ NFS-e já tratada inline (pacote). Bloco externo ignorado.');
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
