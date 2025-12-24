// Supabase Edge Function - create Mercado Pago PIX payment
// Location: functions/mp-create-payment/index.ts
// Env required: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key, x-idempotency-key',
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
    const { booking_id, inscricao_id, amount, description, payer, payment_method_id } = body;

    if (!booking_id && !inscricao_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id or inscricao_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'valid amount required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isBookingPayment = Boolean(booking_id);
    const referenceId = booking_id || inscricao_id;

    let booking = null;
    let inscricao = null;

    if (isBookingPayment) {
      const { data: bookingData, error: bookErr } = await supabaseAdmin
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
      if (!bookingData) {
        return new Response(
          JSON.stringify({ error: 'booking not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      booking = bookingData;
    } else {
      const { data: inscricaoData, error: inscricaoErr } = await supabaseAdmin
        .from('inscricoes_eventos')
        .select('*, evento:eventos(*)')
        .eq('id', inscricao_id)
        .maybeSingle();

      if (inscricaoErr) {
        return new Response(
          JSON.stringify({ error: 'error fetching inscricao', details: inscricaoErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!inscricaoData) {
        return new Response(
          JSON.stringify({ error: 'inscricao not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      inscricao = inscricaoData;
    }

    const finalAmount = Number(amount);
    const payerData = {
      ...(typeof payer === 'object' && payer ? payer : {}),
      ...(isBookingPayment
        ? {
          name: (typeof payer?.name === 'string' && payer.name.trim().length > 0) ? payer.name : booking?.patient_name,
          email: (typeof payer?.email === 'string' && payer.email.trim().length > 0) ? payer.email : booking?.patient_email,
          phone: payer?.phone || (booking?.patient_phone
            ? {
              area_code: booking.patient_phone.substring(0, 2) || '11',
              number: booking.patient_phone.substring(2) || '999999999'
            }
            : undefined)
        }
        : {
          name: (typeof payer?.name === 'string' && payer.name.trim().length > 0) ? payer.name : inscricao?.patient_name,
          email: (typeof payer?.email === 'string' && payer.email.trim().length > 0) ? payer.email : inscricao?.patient_email,
          phone: payer?.phone || (inscricao?.patient_phone
            ? {
              area_code: inscricao.patient_phone.substring(0, 2) || '11',
              number: inscricao.patient_phone.substring(2) || '999999999'
            }
            : undefined)
        })
    };

    const paymentDescription = description || (
      isBookingPayment
        ? `Consulta ${booking?.services?.name || 'Doxologos'} - Agendamento ${booking_id}`
        : `Evento ${inscricao?.evento?.titulo || 'Doxologos'} - Inscrição ${inscricao_id}`
    );

    const metadata: Record<string, unknown> = {
      integration_type: 'direct_payment'
    };

    if (booking_id) {
      metadata.booking_id = booking_id;
    }
    if (inscricao_id) {
      metadata.inscricao_id = inscricao_id;
    }

    // Criar pagamento PIX no Mercado Pago
    console.log('🔵 Creating PIX payment in Mercado Pago...');

    const paymentPayload = {
      transaction_amount: finalAmount,
      description: paymentDescription,
      payment_method_id: payment_method_id || 'pix',
      payer: {
        email: payerData.email,
        first_name: payerData.name?.split(' ')[0] || 'Cliente',
        last_name: payerData.name?.split(' ').slice(1).join(' ') || '',
      },
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
      metadata,
      external_reference: referenceId
    };

    console.log('📤 Mercado Pago payment payload:', JSON.stringify(paymentPayload, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpAccessToken}`,
        'X-Idempotency-Key': `${referenceId}-${Date.now()}`
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
    const paymentInsert: Record<string, unknown> = {
      mp_payment_id: paymentResult.id.toString(),
      status: paymentResult.status,
      status_detail: paymentResult.status_detail,
      payment_method: paymentResult.payment_method_id,
      amount: finalAmount,
      payer_email: payerData.email,
      payer_name: payerData.name,
      external_reference: referenceId,
      qr_code: qrCodeData.qr_code,
      qr_code_base64: qrCodeData.qr_code_base64,
      ticket_url: qrCodeData.ticket_url,
      raw_payload: paymentResult
    };

    if (booking_id) {
      paymentInsert.booking_id = booking_id;
    }
    if (inscricao_id) {
      paymentInsert.inscricao_id = inscricao_id;
    }

    const { data: insertedPayment, error: insertErr } = await supabaseAdmin
      .from('payments')
      .insert(paymentInsert)
      .select()
      .single();

    if (insertErr) {
      console.error('❌ Error inserting payment:', insertErr);
      // Não retornar erro aqui, pois o pagamento foi criado com sucesso no MP
    } else {
      console.log('✅ Payment saved to database:', insertedPayment?.id);
    }

    // Atualizar booking com ID do pagamento
    const nowIso = new Date().toISOString();

    if (booking_id) {
      await supabaseAdmin
        .from('bookings')
        .update({
          marketplace_payment_id: paymentResult.id.toString(),
          payment_status: 'pending',
          updated_at: nowIso
        })
        .eq('id', booking_id);
    } else if (inscricao_id) {
      const { error: inscricaoUpdateErr } = await supabaseAdmin
        .from('inscricoes_eventos')
        .update({
          marketplace_payment_id: paymentResult.id.toString(),
          status_pagamento: 'pendente',
          updated_at: nowIso
        })
        .eq('id', inscricao_id);

      if (inscricaoUpdateErr) {
        console.error('❌ Error updating inscrição:', inscricaoUpdateErr);
      }
    }

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
