// Supabase Edge Function - Mercado Pago Webhook handler
// Location: functions/mp-webhook/index.ts
// Env required: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, { 
      auth: { persistSession: false } 
    });

    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    // Mercado Pago webhook structure:
    // { type: "payment", action: "payment.updated", data: { id: "payment_id" } }
    const { type, action, data } = body;

    if (type !== 'payment') {
      console.log('Ignoring non-payment notification:', type);
      return new Response(
        JSON.stringify({ message: 'notification received' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentId = data?.id;
    if (!paymentId) {
      console.error('No payment ID in webhook data');
      return new Response(
        JSON.stringify({ error: 'no payment id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing payment ${paymentId}, action: ${action}`);

    // Fetch payment details from Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
      }
    });

    if (!mpRes.ok) {
      const txt = await mpRes.text();
      console.error('Failed to fetch payment from MP:', txt);
      return new Response(
        JSON.stringify({ error: 'failed to fetch payment', details: txt }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payment = await mpRes.json();
    console.log('Payment details:', JSON.stringify(payment, null, 2));

    const externalReference = payment.external_reference; // booking_id
    const status = payment.status; // approved, rejected, pending, etc.
    const statusDetail = payment.status_detail;

    // Find payment record in database by mp_payment_id or external_reference
    let { data: existingPayment, error: findErr } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('mp_payment_id', paymentId)
      .maybeSingle();

    // If not found by mp_payment_id, try by booking_id + pending status
    if (!existingPayment && externalReference) {
      const { data: paymentByBooking } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('booking_id', externalReference)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      existingPayment = paymentByBooking;
    }

    const paymentData = {
      mp_payment_id: paymentId,
      booking_id: externalReference,
      status: status,
      status_detail: statusDetail,
      payment_method: payment.payment_method_id,
      payment_type: payment.payment_type_id,
      amount: payment.transaction_amount,
      net_amount: payment.transaction_details?.net_received_amount,
      fee_amount: payment.fee_details?.reduce((sum: number, fee: any) => sum + (fee.amount || 0), 0) || 0,
      currency: payment.currency_id,
      payer_email: payment.payer?.email,
      payer_name: payment.payer?.first_name + ' ' + payment.payer?.last_name,
      payer_document: payment.payer?.identification?.number,
      description: payment.description,
      external_reference: externalReference,
      payment_url: payment.transaction_details?.external_resource_url,
      qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: payment.transaction_details?.external_resource_url,
      date_approved: payment.date_approved,
      date_created: payment.date_created,
      date_last_updated: payment.date_last_updated,
      raw_payload: payment,
      updated_at: new Date().toISOString()
    };

    if (existingPayment) {
      // Update existing payment
      console.log('Updating payment:', existingPayment.id);
      const { error: updateErr } = await supabaseAdmin
        .from('payments')
        .update(paymentData)
        .eq('id', existingPayment.id);

      if (updateErr) {
        console.error('Error updating payment:', updateErr);
      }
    } else {
      // Create new payment record
      console.log('Creating new payment record');
      const { error: insertErr } = await supabaseAdmin
        .from('payments')
        .insert(paymentData);

      if (insertErr) {
        console.error('Error inserting payment:', insertErr);
      }
    }

    // Update booking status based on payment status
    if (externalReference && status === 'approved') {
      console.log('Payment approved, updating booking to confirmed');
      const { error: bookingErr } = await supabaseAdmin
        .from('bookings')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', externalReference);

      if (bookingErr) {
        console.error('Error updating booking:', bookingErr);
      }
    } else if (externalReference && (status === 'rejected' || status === 'cancelled')) {
      console.log('Payment rejected/cancelled, updating booking to cancelled');
      const { error: bookingErr } = await supabaseAdmin
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', externalReference);

      if (bookingErr) {
        console.error('Error updating booking:', bookingErr);
      }
    }

    console.log('Webhook processed successfully');

    return new Response(
      JSON.stringify({ success: true, payment_id: paymentId, status: status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'internal error', details: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
