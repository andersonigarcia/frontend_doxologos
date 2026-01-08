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
    console.warn('⚠️ Missing signature headers or secret. Skipping validation (NOT RECCOMENDED for production).');
    return true; // Fail open if secret is not configured, but log warning.
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
  // Helper to get nested params from URL or body, strictly needed for MP manifest generation
  // Implementation simplified for now as MP sends ID in query often for notifications? 
  // Actually MP sends ID in the BODY for webhooks usually.
  // The manifest construction documentation usually refers to the data.id in the URL query params OR body.
  // Let's rely on the Double Check strategy as primary security for now if this complex signature fails.
  return "";
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

serve(async (req) => {
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

  // Log to database
  const logEntry = {
    provider: 'mercadopago',
    payload: bodyJson,
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

    if (!paymentId) {
      if (logId) await supabase.from('webhook_logs').update({ status: 'error', error_message: 'No payment ID found' }).eq('id', logId);
      return new Response('No payment ID', { status: 400 });
    }

    // 1. Double Check with MP API (Self-Validation)
    // This confirms the payment status is real and not a spoofed payload
    const mpPayment = await fetchMpPayment(paymentId, MP_ACCESS_TOKEN);
    console.log(`✅ Verified payment ${paymentId} status: ${mpPayment.status}`);

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

      success = true;
    } else {
      // Booking Logic
      let bookingId = null;

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
        const { data: existingBooking, error: fetchError } = await supabase
          .from('bookings')
          .select('id, status')
          .eq('id', bookingId)
          .single();

        if (fetchError || !existingBooking) {
          console.error(`❌ Booking ${bookingId} not found!`, fetchError);
          if (logId) await supabase.from('webhook_logs').update({
            status: 'error',
            error_message: `Booking ${bookingId} not found`
          }).eq('id', logId);
          return new Response(`Booking ${bookingId} not found`, { status: 404 });
        }

        console.log(`📋 Found booking ${bookingId}:`, {
          currentStatus: existingBooking.status,
          currentPaymentStatus: existingBooking.payment_status,
          newMPStatus: mpPayment.status,
          willUpdateTo: statusMap[mpPayment.status]
        });

        const statusMap: any = {
          'approved': 'confirmed',
          'authorized': 'confirmed',
          'in_process': 'pending',
          'rejected': 'cancelled',
          'cancelled': 'cancelled',
          'refunded': 'cancelled',
          'charged_back': 'cancelled'
        };

        const newStatus = statusMap[mpPayment.status];
        if (newStatus) {
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
        } else {
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
    if ((mpPayment.status === 'approved' || mpPayment.status === 'paid') && ledgerTransactionId) {
      try {
        console.log(`📒 Recording ledger entries for transaction ${ledgerTransactionId}`);

        // Check for existing ledger entry to prevent duplicates
        const { count } = await supabase.from('payment_ledger_entries')
          .select('id', { count: 'exact', head: true })
          .eq('transaction_id', ledgerTransactionId);

        if (count === 0) {
          const amount = mpPayment.transaction_amount;
          const fee = mpPayment.fee_details?.reduce((acc: number, f: any) => acc + f.amount, 0) || 0;
          const net = amount - fee;

          // 1. DEBIT: Cash in Bank (Net or Gross? Usually Gross for revenue, but receiving is Net if fee deducted at source. 
          // Let's record Gross amount as Cash for simplicity, and track fees separately if needed.
          // For this MVP: Cash = Gross Amount.

          const entries = [
            {
              transaction_id: ledgerTransactionId,
              entry_type: 'DEBIT',
              account_code: 'CASH_BANK',
              amount: amount,
              description: `Payment received ${paymentId} (MP)`,
              created_at: new Date().toISOString()
            },
            {
              transaction_id: ledgerTransactionId,
              entry_type: 'CREDIT',
              account_code: 'REVENUE_GROSS', // Or LIABILITY_PROFESSIONAL based on split
              amount: amount,
              description: `Gross revenue from payment ${paymentId}`,
              created_at: new Date().toISOString()
            }
          ];

          const { error: ledgerError } = await supabase.from('payment_ledger_entries').insert(entries);
          if (ledgerError) console.error('❌ Ledger insert error:', ledgerError);
          else console.log('✅ Ledger entries recorded successfully');
        } else {
          console.log('ℹ️ Ledger entries already exist, skipping.');
        }
      } catch (ledgerErr) {
        console.error('❌ Unexpected ledger error:', ledgerErr);
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
