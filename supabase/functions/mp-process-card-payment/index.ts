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

    const { token, amount, wallet_used, user_id, installments, description, payer, booking_id, inscricao_id, package_id, payment_method_id, device_id } = body;

    if (!token || !amount) {
      return new Response(
        JSON.stringify({ error: 'token and amount required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SERVICE_ROLE = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const environment = Deno.env.get('MP_ENVIRONMENT') || 'production';
    const MP_ACCESS_TOKEN = (environment === 'test'
      ? Deno.env.get('MP_ACCESS_TOKEN_TEST')
      : Deno.env.get('MP_ACCESS_TOKEN')) || '';

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

    let walletUsedAmount = Number(wallet_used) || 0;
    if (walletUsedAmount > 0) {
      if (walletUsedAmount > transactionAmount) {
        walletUsedAmount = transactionAmount;
      }
      transactionAmount -= walletUsedAmount;
    }

    // Mercado Pago exige valor mínimo de R$ 0,50 para cartão
    if (transactionAmount < 0.50 && transactionAmount > 0) {
      console.warn('[MP Card] Valor muito baixo, ajustando para R$ 0,50');
      transactionAmount = 0.50;
    }

    // Garantir 2 casas decimais
    transactionAmount = Math.round(transactionAmount * 100) / 100;

    console.log('[MP Card] Valor processado:', transactionAmount);

    const externalRef = package_id
      ? `PACOTE_${package_id}`
      : booking_id
        ? booking_id
        : inscricao_id
          ? `EVENTO_${inscricao_id}`
          : '';

    // Estruturar dados do pagador para validação anti-fraude do Mercado Pago
    const payerNameParts = (payer?.name || '').trim().split(/\s+/);
    const firstName = payer?.first_name || payerNameParts[0] || 'Cliente';
    const lastName = payer?.last_name || (payerNameParts.length > 1 ? payerNameParts.slice(1).join(' ') : 'Doxologos');

    let phoneObj = undefined;
    if (payer?.phone) {
      if (typeof payer.phone === 'object') {
        phoneObj = payer.phone;
      } else if (typeof payer.phone === 'string') {
        const cleanedPhone = payer.phone.replace(/\D/g, '');
        if (cleanedPhone.length >= 10) {
          phoneObj = {
            area_code: cleanedPhone.substring(0, 2),
            number: cleanedPhone.substring(2)
          };
        }
      }
    }

    const payerPayload: any = {
      email: payer?.email || 'contato@doxologos.com.br',
      first_name: firstName,
      last_name: lastName,
      identification: payer?.identification || {}
    };

    if (phoneObj) {
      payerPayload.phone = phoneObj;
    }

    // Criar pagamento no Mercado Pago
    const paymentPayload: any = {
      token: token,
      transaction_amount: transactionAmount,
      installments: Number(installments) || 1,
      description: description || 'Consulta Doxologos',
      // payment_method_id: bandeira real do cartão detectada pelo SDK do MP no frontend
      // (visa, master, elo, hipercard, etc.). Não pode ser hardcoded — o MP rejeita se não
      // corresponder ao cartão tokenizado.
      payment_method_id: payment_method_id || 'master',
      payer: payerPayload,
      external_reference: externalRef,
      statement_descriptor: 'DOXOLOGOS',
      notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`
    };

    console.log('[MP Card] Criando pagamento no MP:', JSON.stringify(paymentPayload, null, 2));

    // Idempotency key determinística por tentativa: permite novas tentativas se o cartão for recusado
    const idempotencyRef = package_id || booking_id || inscricao_id;
    const attemptStamp = body.attempt_id || Date.now();
    const idempotencyKey = `${idempotencyRef}-card-${attemptStamp}`;

    const mpHeaders: Record<string, string> = {
      'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey
    };

    // Telemetria oficial anti-fraude: repassar identificador de sessão do dispositivo
    const deviceSessionId = device_id || req.headers.get('x-meli-session-id') || req.headers.get('device-id');
    if (deviceSessionId) {
      mpHeaders['X-Meli-Session-Id'] = deviceSessionId;
      console.log('[MP Card] Telemetria de dispositivo X-Meli-Session-Id vinculada:', deviceSessionId);
    } else {
      console.warn('[MP Card] ⚠️ Device ID não fornecido na requisição');
    }

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: mpHeaders,
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

    // Deduct wallet balance immediately
    if (walletUsedAmount > 0 && user_id) {
        console.log(`[MP Card] Deducting ${walletUsedAmount} from wallet for user ${user_id}`);
        const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || SERVICE_ROLE;
        
        const updateWalletRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/process_wallet_transaction`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_ROLE,
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_patient_id: user_id,
                p_amount: -walletUsedAmount,
                p_type: 'debit_payment',
                p_description: 'Pagamento parcial via carteira (Cartão)',
                p_booking_id: booking_id
            })
        });

        if (!updateWalletRes.ok) {
            const errTx = await updateWalletRes.text();
            console.error('[MP Card] Erro ao deduzir da carteira:', errTx);
            return new Response(
                JSON.stringify({ error: 'Erro ao processar saldo da carteira', details: errTx }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
    }

    // Salvar pagamento no banco com colunas reais de public.payments
    const paymentRecord: any = {
      mp_payment_id: String(mpJson.id),
      status: mpJson.status,
      status_detail: mpJson.status_detail,
      amount: mpJson.transaction_amount || transactionAmount,
      wallet_balance_used: walletUsedAmount,
      currency: mpJson.currency_id || 'BRL',
      payment_method: mpJson.payment_method_id,
      payment_type: mpJson.payment_type_id,
      date_created: mpJson.date_created,
      date_approved: mpJson.date_approved,
      payer_email: mpJson.payer?.email,
      payer_name: mpJson.payer?.first_name + ' ' + (mpJson.payer?.last_name || ''),
      raw_payload: mpJson
    };

    if (package_id) {
      paymentRecord.package_id = package_id;
    } else if (booking_id) {
      paymentRecord.booking_id = booking_id;
    } else if (inscricao_id) {
      paymentRecord.inscricao_id = inscricao_id;
    }

    const savePaymentRes = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE,
        'Authorization': `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(paymentRecord)
    });

    if (!savePaymentRes.ok) {
      const saveErr = await savePaymentRes.text();
      console.error('[MP Card] ⚠️ Erro ao persistir pagamento em public.payments:', saveErr);
    } else {
      console.log('[MP Card] ✅ Pagamento salvo com sucesso em public.payments');
    }

    // ====================================================================
    // Atualizar booking ou inscrição
    // ✅ FIX: Sempre salvar marketplace_payment_id e payment_status para que
    //         o webhook possa vincular e confirmar o pagamento quando chegar,
    //         independente do status inicial (approved, authorized, in_process)
    // ====================================================================

    const isApprovedNow = mpJson.status === 'approved' || mpJson.status === 'authorized';

    if (booking_id) {
      console.log(`[MP Card] 🔄 Atualizando booking ${booking_id} - Status MP: ${mpJson.status} (aprovado agora: ${isApprovedNow})`);

      const bookingUpdate: any = {
        marketplace_payment_id: String(mpJson.id), // ✅ SEMPRE salvar para webhook vincular
        payment_status: mpJson.status,             // ✅ Refletir status atual do MP
        updated_at: new Date().toISOString()
      };

      // ✅ Confirmar imediatamente apenas se já aprovado
      if (isApprovedNow) {
        bookingUpdate.status = 'confirmed';
        console.log(`[MP Card] ✅ Aprovado imediatamente - booking será confirmado agora`);
      } else {
        // Status in_process: booking fica em awaiting_payment para indicar
        // que o pagamento foi enviado e aguarda confirmação assíncrona da operadora
        const useAwaitingStatus = (Deno.env.get('AWAITING_PAYMENT_STATUS') || 'false').toLowerCase() === 'true';
        if (useAwaitingStatus) {
          bookingUpdate.status = 'awaiting_payment';
          console.log(`[MP Card] ⏳ Status '${mpJson.status}' - booking marcado como 'awaiting_payment'`);
        } else {
          console.log(`[MP Card] ⏳ Status '${mpJson.status}' - aguardando webhook para confirmação final`);
        }
      }

      const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE,
          'Authorization': `Bearer ${SERVICE_ROLE}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(bookingUpdate)
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error(`[MP Card] ❌ Erro ao atualizar booking: ${errorText}`);
      } else {
        const updated = await updateResponse.json();
        console.log(`[MP Card] ✅ Booking atualizado com sucesso:`, updated);

        // ── Post-Payment Orchestrator (aprovação síncrona) ─────────────────
        // Quando MP aprova imediatamente (sem aguardar webhook), dispara
        // emails de confirmação agora. Fire-and-forget.
        if (isApprovedNow) {
          const orchestratorEnabled = (Deno.env.get('POST_PAYMENT_ORCHESTRATOR') || 'true').toLowerCase() !== 'false';
          if (orchestratorEnabled) {
            const orchUrl = `${SUPABASE_URL}/functions/v1/post-payment-orchestrator`;
            fetch(orchUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SERVICE_ROLE}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ booking_id })
            }).then(r => {
              console.log(`[MP Card] ✅ Orchestrator invocado (booking ${booking_id}), status: ${r.status}`);
            }).catch(e => {
              console.error(`[MP Card] ⚠️ Orchestrator falhou (non-fatal):`, e);
            });
          }
        }
      }

    } else if (inscricao_id) {
      console.log(`[MP Card] 🔄 Atualizando inscrição ${inscricao_id} - Status MP: ${mpJson.status} (aprovado agora: ${isApprovedNow})`);

      const inscricaoUpdate: any = {
        marketplace_payment_id: String(mpJson.id), // ✅ SEMPRE salvar para webhook vincular
        payment_status: mpJson.status,
        updated_at: new Date().toISOString()
      };

      if (isApprovedNow) {
        inscricaoUpdate.status = 'confirmado';
        console.log(`[MP Card] ✅ Aprovado imediatamente - inscrição será confirmada agora`);
      } else {
        console.log(`[MP Card] ⏳ Status '${mpJson.status}' - aguardando webhook para confirmação final`);
      }

      const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/inscricoes_eventos?id=eq.${inscricao_id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE,
          'Authorization': `Bearer ${SERVICE_ROLE}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(inscricaoUpdate)
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error(`[MP Card] ❌ Erro ao atualizar inscrição: ${errorText}`);
      } else {
        const updated = await updateResponse.json();
        console.log(`[MP Card] ✅ Inscrição atualizada com sucesso:`, updated);
      }
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
