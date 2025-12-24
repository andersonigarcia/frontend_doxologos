// Supabase Edge Function - Process Card Payment with Mercado Pago
// Recebe token do cartão e processa o pagamento

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key, x-idempotency-key',
};

Deno.serve(async (req) => {
  console.log('[MP Card] === FUNÇÃO INICIADA ===');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[MP Card] Body recebido:', JSON.stringify(body));

    const { token, amount, installments, description, payer, booking_id, inscricao_id } = body;

    if (!token || !amount) {
      return new Response(
        JSON.stringify({ error: 'token and amount required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SERVICE_ROLE = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') || '';

    if (!MP_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'MP_ACCESS_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar e converter valor
    let transactionAmount = Number(amount);

    // Validar valor mínimo
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      return new Response(
        JSON.stringify({
          error: 'invalid_amount',
          message: 'Valor do pagamento inválido ou zero',
          received: amount
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mercado Pago exige valor mínimo de R$ 0,50 para cartão
    if (transactionAmount < 0.50) {
      console.warn('[MP Card] Valor muito baixo, ajustando para R$ 0,50');
      transactionAmount = 0.50;
    }

    // Garantir 2 casas decimais
    transactionAmount = Math.round(transactionAmount * 100) / 100;

    console.log('[MP Card] Valor processado:', transactionAmount);

    // Criar pagamento no Mercado Pago
    const paymentPayload = {
      token: token,
      transaction_amount: transactionAmount,
      installments: Number(installments) || 1,
      description: description || 'Consulta Doxologos',
      payment_method_id: 'master', // será detectado automaticamente pelo token
      payer: {
        email: payer?.email || 'contato@doxologos.com.br',
        identification: payer?.identification || {}
      },
      external_reference: booking_id || inscricao_id,
      statement_descriptor: 'DOXOLOGOS',
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`
    };

    console.log('[MP Card] Criando pagamento no MP:', JSON.stringify(paymentPayload, null, 2));

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${booking_id || inscricao_id}-${Date.now()}`
      },
      body: JSON.stringify(paymentPayload)
    });

    if (!mpRes.ok) {
      const errorText = await mpRes.text();
      console.error('[MP Card] Erro do Mercado Pago:', errorText);
      return new Response(
        JSON.stringify({ error: 'mercadopago error', details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mpJson = await mpRes.json();
    console.log('[MP Card] Pagamento criado:', mpJson.id, 'Status:', mpJson.status);

    // Salvar pagamento no banco
    const paymentRecord: any = {
      mp_payment_id: String(mpJson.id),
      status: mpJson.status,
      status_detail: mpJson.status_detail,
      transaction_amount: mpJson.transaction_amount,
      currency_id: mpJson.currency_id,
      payment_method_id: mpJson.payment_method_id,
      payment_type_id: mpJson.payment_type_id,
      date_created: mpJson.date_created,
      date_approved: mpJson.date_approved,
      payer_email: mpJson.payer?.email,
      payer_name: mpJson.payer?.first_name + ' ' + (mpJson.payer?.last_name || ''),
      raw_payload: mpJson
    };

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

    // Atualizar booking ou inscrição
    if (booking_id && mpJson.status === 'approved') {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE,
          'Authorization': `Bearer ${SERVICE_ROLE}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payment_status: 'paid' })
      });
    } else if (inscricao_id && mpJson.status === 'approved') {
      await fetch(`${SUPABASE_URL}/rest/v1/inscricoes_eventos?id=eq.${inscricao_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE,
          'Authorization': `Bearer ${SERVICE_ROLE}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ payment_status: 'paid' })
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: mpJson.id,
        status: mpJson.status,
        status_detail: mpJson.status_detail,
        transaction_amount: mpJson.transaction_amount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[MP Card] Erro:', err);
    return new Response(
      JSON.stringify({ error: 'internal error', details: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
