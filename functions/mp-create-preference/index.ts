// Supabase Edge Function - create Mercado Pago preference
// Location: functions/mp-create-preference/index.ts
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
    // Supabase URL and Service Role Key are automatically available in Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? `https://${Deno.env.get('SUPABASE_REFERENCE_ID')}.supabase.co`;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN');

    if (!mpAccessToken) {
      console.error('MP_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'MP_ACCESS_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Supabase credentials not available', { supabaseUrl: !!supabaseUrl, hasKey: !!supabaseServiceRoleKey });
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating Supabase client...');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, { 
      auth: { persistSession: false } 
    });

    const body = await req.json();
    const { booking_id, amount, description, payer, payment_methods } = body;
    
    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'valid amount required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load booking
    const { data: booking, error: bookErr } = await supabaseAdmin
      .from('bookings')
      .select('*, services:service_id(*), professional:professional_id(*)')
      .eq('id', booking_id)
      .maybeSingle();

    if (bookErr) {
      return new Response(
        JSON.stringify({ error: 'error fetching booking', details: bookErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!booking) {
      return new Response(
        JSON.stringify({ error: 'booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já existe preferência
    if (booking.marketplace_preference_id) {
      return new Response(
        JSON.stringify({
          message: 'Preference already exists',
          preference_id: booking.marketplace_preference_id,
          init_point: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${booking.marketplace_preference_id}`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finalAmount = Number(amount);
    const payerData = payer || {
      name: booking.patient_name,
      email: booking.patient_email
    };

    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';

    // Parse payment_methods se vier como string
    let parsedPaymentMethods = payment_methods;
    if (typeof payment_methods === 'string') {
      try {
        parsedPaymentMethods = JSON.parse(payment_methods);
      } catch (e) {
        console.error('Failed to parse payment_methods:', e);
        parsedPaymentMethods = {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12
        };
      }
    }

    // Garantir que excluded_payment_types é sempre array
    if (parsedPaymentMethods && typeof parsedPaymentMethods.excluded_payment_types === 'string') {
      parsedPaymentMethods.excluded_payment_types = [parsedPaymentMethods.excluded_payment_types];
    }

    // Create preference payload
    const preference = {
      items: [
        {
          title: description || `Consulta Online - ${booking.services?.name || 'Atendimento'}`,
          description: `Agendamento ${booking_id}`,
          quantity: 1,
          unit_price: finalAmount,
          currency_id: 'BRL',
        }
      ],
      external_reference: booking_id,
      payer: {
        name: payerData.name,
        email: payerData.email,
        phone: payerData.phone || {},
        identification: payerData.identification || {},
        address: payerData.address || {}
      },
      payment_methods: parsedPaymentMethods || {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12
      },
      back_urls: {
        success: `${frontendUrl}/checkout/success?external_reference=${booking_id}`,
        failure: `${frontendUrl}/checkout/failure?external_reference=${booking_id}`,
        pending: `${frontendUrl}/checkout/pending?external_reference=${booking_id}`
      },
      auto_return: 'approved',
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
      statement_descriptor: 'DOXOLOGOS',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
    };

    console.log('Creating MP preference:', JSON.stringify(preference, null, 2));

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    if (!mpRes.ok) {
      const txt = await mpRes.text();
      console.error('MP preference failed', txt);
      return new Response(
        JSON.stringify({ error: 'mercadopago error', details: txt }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mpJson = await mpRes.json();
    console.log('MP preference created:', mpJson.id);

    // Update booking with marketplace_preference_id
    const { error: updErr } = await supabaseAdmin
      .from('bookings')
      .update({ 
        marketplace_preference_id: mpJson.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id);

    if (updErr) {
      console.error('Error updating booking with preference', updErr);
    }

    // Create initial payment record
    const { error: paymentErr } = await supabaseAdmin
      .from('payments')
      .insert({
        booking_id: booking_id,
        mp_preference_id: mpJson.id,
        status: 'pending',
        amount: finalAmount,
        currency: 'BRL',
        payer_email: payerData.email,
        payer_name: payerData.name,
        description: description,
        payment_url: mpJson.init_point,
        qr_code: mpJson.qr_code,
        qr_code_base64: mpJson.qr_code_base64,
        raw_payload: mpJson
      });

    if (paymentErr) {
      console.error('Error creating payment record', paymentErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        init_point: mpJson.init_point,
        sandbox_init_point: mpJson.sandbox_init_point,
        preference_id: mpJson.id,
        qr_code: mpJson.qr_code,
        qr_code_base64: mpJson.qr_code_base64
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('create preference error', err);
    return new Response(
      JSON.stringify({ error: 'internal error', details: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
