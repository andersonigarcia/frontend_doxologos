// Supabase Edge Function - create Mercado Pago PIX payment
// Location: functions/mp-create-payment/index.ts
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? `https://${Deno.env.get('SUPABASE_REFERENCE_ID')}.supabase.co`;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY');
    
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

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Supabase credentials not available');
      return new Response(
        JSON.stringify({ error: 'Supabase credentials not available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, { 
      auth: { persistSession: false } 
    });

    const body = await req.json();
    const { booking_id, amount, description, payer, payment_method_id } = body;
    
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

    const finalAmount = Number(amount);
    const payerData = payer || {
      name: booking.patient_name,
      email: booking.patient_email
    };

    // Criar pagamento PIX no Mercado Pago
    console.log('🔵 Creating PIX payment in Mercado Pago...');
    
    const paymentPayload = {
      transaction_amount: finalAmount,
      description: description || `Consulta ${booking.services?.name} - Agendamento ${booking_id}`,
      payment_method_id: payment_method_id || 'pix',
      payer: {
        email: payerData.email,
        first_name: payerData.name?.split(' ')[0] || 'Cliente',
        last_name: payerData.name?.split(' ').slice(1).join(' ') || '',
      },
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
      metadata: {
        booking_id: booking_id,
        integration_type: 'direct_payment'
      }
    };

    console.log('📤 Mercado Pago payment payload:', JSON.stringify(paymentPayload, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpAccessToken}`,
        'X-Idempotency-Key': `${booking_id}-${Date.now()}`
      },
      body: JSON.stringify(paymentPayload)
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('❌ Mercado Pago API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Mercado Pago API error', details: errorText }),
        { status: mpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentResult = await mpResponse.json();
    console.log('✅ Payment created:', paymentResult);

    // Extrair dados do QR Code PIX
    const qrCodeData = paymentResult.point_of_interaction?.transaction_data;
    
    if (!qrCodeData || !qrCodeData.qr_code) {
      console.error('❌ QR Code not found in payment response');
      return new Response(
        JSON.stringify({ error: 'QR Code not generated', payment: paymentResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Salvar pagamento no banco de dados
    console.log('💾 Salvando pagamento no banco de dados...');
    const { data: insertedPayment, error: insertErr } = await supabaseAdmin
      .from('payments')
      .insert({
        booking_id: booking_id,
        mp_payment_id: paymentResult.id.toString(),
        status: paymentResult.status,
        status_detail: paymentResult.status_detail,
        payment_method: paymentResult.payment_method_id,
        amount: finalAmount,
        payer_email: payerData.email,
        payer_name: payerData.name,
        external_reference: booking_id,
        qr_code: qrCodeData.qr_code,
        qr_code_base64: qrCodeData.qr_code_base64,
        ticket_url: qrCodeData.ticket_url,
        raw_payload: paymentResult
      })
      .select()
      .single();

    if (insertErr) {
      console.error('❌ Error inserting payment:', insertErr);
      // Não retornar erro aqui, pois o pagamento foi criado com sucesso no MP
    } else {
      console.log('✅ Payment saved to database:', insertedPayment?.id);
    }

    // Atualizar booking com ID do pagamento
    await supabaseAdmin
      .from('bookings')
      .update({ 
        marketplace_payment_id: paymentResult.id.toString(),
        payment_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id);

    // Retornar dados do pagamento PIX
    return new Response(
      JSON.stringify({
        success: true,
        payment_id: paymentResult.id,
        status: paymentResult.status,
        qr_code: qrCodeData.qr_code,
        qr_code_base64: qrCodeData.qr_code_base64,
        ticket_url: qrCodeData.ticket_url
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
