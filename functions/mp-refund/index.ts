// Supabase Edge Function - refund Mercado Pago payment
// Location: functions/mp-refund/index.ts
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
    const { payment_id, amount } = body;
    
    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load payment from database
    const { data: payment, error: paymentErr } = await supabaseAdmin
      .from('payments')
      .select('*, booking:bookings(*)')
      .eq('id', payment_id)
      .single();

    if (paymentErr || !payment) {
      return new Response(
        JSON.stringify({ error: 'payment not found', details: paymentErr?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payment status
    if (payment.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'only approved payments can be refunded', current_status: payment.status }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already refunded
    if (payment.refund_status === 'refunded') {
      return new Response(
        JSON.stringify({ error: 'payment already refunded' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refundAmount = amount || payment.transaction_amount;

    // Call Mercado Pago refund API
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}/refunds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: refundAmount })
      }
    );

    if (!mpRes.ok) {
      const txt = await mpRes.text();
      console.error('MP refund failed', txt);
      return new Response(
        JSON.stringify({ error: 'mercadopago refund error', details: txt }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mpJson = await mpRes.json();
    console.log('MP refund created:', mpJson.id);

    // Update payment record
    const { error: updateErr } = await supabaseAdmin
      .from('payments')
      .update({
        refund_status: 'refunded',
        refunded_amount: refundAmount,
        status: 'refunded',
        updated_at: new Date().toISOString()
      })
      .eq('id', payment_id);

    if (updateErr) {
      console.error('Error updating payment', updateErr);
    }

    // Cancel associated booking
    if (payment.booking_id) {
      const { error: bookingErr } = await supabaseAdmin
        .from('bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.booking_id);

      if (bookingErr) {
        console.error('Error cancelling booking', bookingErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund_id: mpJson.id,
        status: mpJson.status,
        amount: refundAmount,
        payment_id: payment.mp_payment_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('refund error', err);
    return new Response(
      JSON.stringify({ error: 'internal error', details: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
