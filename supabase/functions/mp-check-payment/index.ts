// Supabase Edge Function - check Mercado Pago payment status
// Location: functions/mp-check-payment/index.ts
// Env required: MP_ACCESS_TOKEN

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    // Determinar ambiente (test ou production)
    const environment = Deno.env.get('MP_ENVIRONMENT') || 'production';
    const mpAccessToken = environment === 'test' 
      ? Deno.env.get('MP_ACCESS_TOKEN_TEST')
      : Deno.env.get('MP_ACCESS_TOKEN');
    
    console.log(`🔧 Mercado Pago Environment: ${environment}`);

    if (!mpAccessToken) {
      console.error('MP_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'MP_ACCESS_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { payment_id } = body;
    
    if (!payment_id) {
      return new Response(
        JSON.stringify({ error: 'payment_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Checking payment status:', payment_id);

    // Buscar status do pagamento no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpAccessToken}`
      }
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('❌ Mercado Pago API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Mercado Pago API error', details: errorText }),
        { status: mpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentData = await mpResponse.json();
    console.log('✅ Payment status:', paymentData.status);

    return new Response(
      JSON.stringify({
        success: true,
        status: paymentData.status,
        status_detail: paymentData.status_detail,
        payment_method: paymentData.payment_method_id,
        amount: paymentData.transaction_amount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
