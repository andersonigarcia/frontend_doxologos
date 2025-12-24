// Supabase Edge Function (Deno) - mp-create-preference

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key, x-idempotency-key',
};

Deno.serve(async (req) => {
  console.log('[MP] === FUNÇÃO INICIADA ===');
  console.log('[MP] Method:', req.method);
  console.log('[MP] URL:', req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[MP] Retornando CORS preflight');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[MP] Parseando body...');
    const body = await req.json();
    console.log('[MP] Body recebido:', JSON.stringify(body));

    const { booking_id, inscricao_id, amount, description, payer, payment_methods } = body;
    console.log('[MP] payment_methods extraído:', payment_methods);

    if (!booking_id && !inscricao_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id or inscricao_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SERVICE_ROLE = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') || '';
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';

    if (!MP_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'MP_ACCESS_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let finalAmount = amount || 0;
    let payerData = payer || {};
    let referenceId = booking_id || inscricao_id;
    let referenceType = booking_id ? 'booking' : 'evento';

    // Se for booking, buscar dados do booking
    if (booking_id) {
      const bookingRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*,services:service_id(*)&id=eq.${booking_id}`, {
        headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` }
      });

      if (!bookingRes.ok) {
        return new Response(
          JSON.stringify({ error: 'booking lookup failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const bookings = await bookingRes.json();
      const booking = bookings[0];

      if (!booking) {
        return new Response(
          JSON.stringify({ error: 'booking not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      finalAmount = amount || booking.services?.price || 0;
      payerData = payer || {
        name: booking.patient_name,
        email: booking.patient_email
      };
    }
    // Se for inscrição de evento, buscar dados da inscrição
    else if (inscricao_id) {
      const inscricaoRes = await fetch(`${SUPABASE_URL}/rest/v1/inscricoes_eventos?select=*,evento:eventos(*)&id=eq.${inscricao_id}`, {
        headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` }
      });

      if (!inscricaoRes.ok) {
        return new Response(
          JSON.stringify({ error: 'inscricao lookup failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const inscricoes = await inscricaoRes.json();
      const inscricao = inscricoes[0];

      if (!inscricao) {
        return new Response(
          JSON.stringify({ error: 'inscricao not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      finalAmount = amount || inscricao.evento?.valor || 0;
      payerData = payer || {
        name: inscricao.patient_name,
        email: inscricao.patient_email
      };
    }

    // Simplificado: sempre garantir que payment_methods tem a estrutura correta
    let finalPaymentMethods: any = {
      excluded_payment_methods: [] as string[],
      excluded_payment_types: [] as string[],
      installments: 1
    };

    if (payment_methods) {
      console.log('[MP] Received payment_methods:', JSON.stringify(payment_methods));
      console.log('[MP] Type of excluded_payment_types:', typeof payment_methods.excluded_payment_types);
      console.log('[MP] Is array?:', Array.isArray(payment_methods.excluded_payment_types));

      // Se veio installments, usar
      if (payment_methods.installments) {
        finalPaymentMethods.installments = payment_methods.installments;
      }

      // Garantir que excluded_payment_types é array
      if (payment_methods.excluded_payment_types) {
        if (Array.isArray(payment_methods.excluded_payment_types)) {
          finalPaymentMethods.excluded_payment_types = payment_methods.excluded_payment_types;
        } else {
          // Se veio como string ou outro tipo, converter para array
          finalPaymentMethods.excluded_payment_types = [String(payment_methods.excluded_payment_types)];
        }
      }

      // Garantir que excluded_payment_methods é array
      if (payment_methods.excluded_payment_methods) {
        if (Array.isArray(payment_methods.excluded_payment_methods)) {
          finalPaymentMethods.excluded_payment_methods = payment_methods.excluded_payment_methods;
        } else {
          finalPaymentMethods.excluded_payment_methods = [String(payment_methods.excluded_payment_methods)];
        }
      }
    }

    console.log('[MP] Final payment_methods to MP:', JSON.stringify(finalPaymentMethods));
    console.log('[MP] Final excluded_payment_types is array?:', Array.isArray(finalPaymentMethods.excluded_payment_types));

    // Criar objeto de preferência base
    const preference: any = {
      items: [{
        title: description || (referenceType === 'booking' ? 'Consulta Online' : 'Inscrição em Evento'),
        description: referenceType === 'booking' ? `Agendamento ${booking_id}` : `Evento ${inscricao_id}`,
        quantity: 1,
        unit_price: Number(finalAmount),
        currency_id: 'BRL'
      }],
      external_reference: referenceId,
      payer: {
        name: payerData.name,
        email: payerData.email,
        phone: payerData.phone || {},
        identification: payerData.identification || {},
        address: payerData.address || {}
      },
      // Forçar checkout como guest (sem login)
      purpose: 'wallet_purchase',
      binary_mode: false,
      // Configurações adicionais para evitar login
      additional_info: JSON.stringify({
        items: [{
          id: referenceId,
          title: description || 'Consulta',
          quantity: 1,
          unit_price: Number(finalAmount)
        }]
      }),
      back_urls: {
        success: `${FRONTEND_URL}/checkout/success?external_reference=${referenceId}&type=${referenceType}`,
        failure: `${FRONTEND_URL}/checkout/failure?external_reference=${referenceId}&type=${referenceType}`,
        pending: `${FRONTEND_URL}/checkout/pending?external_reference=${referenceId}&type=${referenceType}`
      },
      auto_return: 'approved',
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      statement_descriptor: 'DOXOLOGOS',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };

    // NÃO enviar payment_methods devido a bug de serialização do Deno
    // As configurações purpose e binary_mode já ajudam a evitar saldo em conta
    console.log('[MP] Preferência criada (sem payment_methods):', JSON.stringify(preference, null, 2));

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
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

    // Update booking or inscricao com marketplace_preference_id
    if (booking_id) {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE,
          'Authorization': `Bearer ${SERVICE_ROLE}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ marketplace_preference_id: mpJson.id })
      });
    } else if (inscricao_id) {
      await fetch(`${SUPABASE_URL}/rest/v1/inscricoes_eventos?id=eq.${inscricao_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE,
          'Authorization': `Bearer ${SERVICE_ROLE}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ marketplace_preference_id: mpJson.id })
      });
    }

    // Create payment record
    const paymentRecord: any = {
      mp_preference_id: mpJson.id,
      status: 'pending',
      transaction_amount: finalAmount,
      currency_id: 'BRL',
      payer_email: payerData.email,
      payment_url: mpJson.init_point,
      qr_code: mpJson.qr_code,
      qr_code_base64: mpJson.qr_code_base64,
      raw_payload: mpJson
    };

    // Adicionar booking_id ou inscricao_id dependendo do tipo
    if (booking_id) {
      paymentRecord.booking_id = booking_id;
    } else if (inscricao_id) {
      paymentRecord.inscricao_id = inscricao_id;
    }

    await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(paymentRecord)
    });

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
