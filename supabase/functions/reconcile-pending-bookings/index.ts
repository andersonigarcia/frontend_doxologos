// Supabase Edge Function (Deno) - reconcile-pending-bookings
// Safety Net: cron job a cada 10 minutos que detecta bookings com pagamento
// aprovado no MP mas ainda pendentes no sistema (webhook não chegou ou falhou).
//
// Invocado via pg_cron — ver setup_crons.sql.
// Controlado por env var RECONCILIATION_CRON=true.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Thresholds
const PENDING_THRESHOLD_MINUTES = 15; // bookings pendentes há mais de X min
const BATCH_LIMIT = 20;               // processar no máx N bookings por execução

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Guard: só executa se reconciliação está habilitada
  const enabled = (Deno.env.get('RECONCILIATION_CRON') || 'false').toLowerCase() === 'true';
  if (!enabled) {
    console.log('[Reconcile] RECONCILIATION_CRON=false. Skipping.');
    return new Response(
      JSON.stringify({ skipped: true, reason: 'RECONCILIATION_CRON disabled' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN');
  if (!MP_ACCESS_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'MP_ACCESS_TOKEN não configurado' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const thresholdDate = new Date(Date.now() - PENDING_THRESHOLD_MINUTES * 60 * 1000).toISOString();
  const results: any[] = [];

  try {
    console.log(`[Reconcile] Iniciando varredura. Threshold: ${PENDING_THRESHOLD_MINUTES}min (antes de ${thresholdDate})`);

    // ── 1. Buscar bookings pendentes há mais de PENDING_THRESHOLD_MINUTES ──
    const { data: pendingBookings, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, status, marketplace_payment_id, notification_sent_at, created_at, patient_name')
      .in('status', ['pending_payment', 'awaiting_payment'])
      .is('notification_sent_at', null)
      .lt('created_at', thresholdDate)
      .order('created_at', { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchErr) {
      console.error('[Reconcile] Erro ao buscar bookings pendentes:', fetchErr);
      throw fetchErr;
    }

    console.log(`[Reconcile] ${pendingBookings?.length || 0} booking(s) pendente(s) encontrado(s).`);

    if (!pendingBookings || pendingBookings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'Nenhum booking pendente encontrado.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Para cada booking pendente, verificar status no MP ──────────────
    for (const booking of pendingBookings) {
      const result: any = { booking_id: booking.id, patient: booking.patient_name, action: 'none' };

      try {
        // Se não tem mp_payment_id ainda, procurar na tabela payments
        let mpPaymentId = booking.marketplace_payment_id;

        if (!mpPaymentId) {
          const { data: payment } = await supabase
            .from('payments')
            .select('mp_payment_id, status')
            .eq('booking_id', booking.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (payment?.mp_payment_id) {
            mpPaymentId = payment.mp_payment_id;
            console.log(`[Reconcile] Booking ${booking.id}: mp_payment_id encontrado na tabela payments: ${mpPaymentId}`);
          }
        }

        if (!mpPaymentId) {
          // Sem pagamento vinculado — pode ser booking órfão
          const minutesPending = Math.round((Date.now() - new Date(booking.created_at).getTime()) / 60000);
          result.action = 'no_payment_id';
          result.minutes_pending = minutesPending;

          if (minutesPending > 60) {
            // Mais de 1h sem pagamento — criar alerta admin
            await supabase.from('notifications').insert([{
              user_id: null,
              type: 'system:booking_alert',
              title: '⚠️ Booking órfão sem pagamento',
              message: `Booking #${booking.id} (${booking.patient_name}) está em '${booking.status}' há ${minutesPending} minutos sem mp_payment_id vinculado.`,
              link: `/admin?tab=bookings&booking_id=${booking.id}`,
              metadata: { booking_id: booking.id, minutes_pending: minutesPending }
            }]).catch((e: any) => console.error('[Reconcile] Falha ao criar alerta:', e));

            result.action = 'admin_alerted';
          }
          results.push(result);
          continue;
        }

        // ── 3. Double-check na API do MP ─────────────────────────────────
        console.log(`[Reconcile] Verificando MP para booking ${booking.id}, payment ${mpPaymentId}...`);
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
          headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` }
        });

        if (!mpRes.ok) {
          console.warn(`[Reconcile] MP API retornou ${mpRes.status} para payment ${mpPaymentId}`);
          result.action = 'mp_api_error';
          result.mp_status_code = mpRes.status;
          results.push(result);
          continue;
        }

        const mpPayment = await mpRes.json();
        result.mp_status = mpPayment.status;

        // ── 4. Se aprovado no MP mas pendente aqui → confirmar + notificar ─
        if (['approved', 'authorized'].includes(mpPayment.status)) {
          console.log(`[Reconcile] ✅ Booking ${booking.id} aprovado no MP (${mpPayment.status}) mas ainda pendente. Reconciliando...`);

          // Confirmar booking
          const { error: updateErr } = await supabase
            .from('bookings')
            .update({
              status: 'confirmed',
              payment_status: mpPayment.status,
              marketplace_payment_id: mpPaymentId.toString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', booking.id)
            .in('status', ['pending_payment', 'awaiting_payment']); // guard contra race condition

          if (updateErr) {
            console.error(`[Reconcile] Erro ao confirmar booking ${booking.id}:`, updateErr);
            result.action = 'confirm_failed';
          } else {
            // Invocar Orchestrator para notificação
            const orchestratorEnabled = (Deno.env.get('POST_PAYMENT_ORCHESTRATOR') || 'false').toLowerCase() === 'true';
            if (orchestratorEnabled) {
              const { error: orchErr } = await supabase.functions.invoke('post-payment-orchestrator', {
                body: { booking_id: booking.id }
              });
              result.action = orchErr ? 'confirmed_notification_failed' : 'confirmed_and_notified';
              if (orchErr) console.error(`[Reconcile] Orchestrator falhou para booking ${booking.id}:`, orchErr);
            } else {
              result.action = 'confirmed_orchestrator_disabled';
            }

            // Criar alerta admin sobre reconciliação
            await supabase.from('notifications').insert([{
              user_id: null,
              type: 'system:booking_alert',
              title: '🔄 Booking reconciliado automaticamente',
              message: `Booking #${booking.id} (${booking.patient_name}) foi confirmado pelo cron de reconciliação — webhook havia falhado.`,
              link: `/admin?tab=bookings&booking_id=${booking.id}`,
              metadata: { booking_id: booking.id, mp_payment_id: mpPaymentId, mp_status: mpPayment.status }
            }]).catch((e: any) => console.error('[Reconcile] Falha ao criar alerta de reconciliação:', e));
          }
        } else if (['rejected', 'cancelled'].includes(mpPayment.status)) {
          // Pagamento recusado — cancelar booking
          await supabase.from('bookings').update({
            status: 'cancelled',
            payment_status: mpPayment.status,
            updated_at: new Date().toISOString()
          }).eq('id', booking.id);
          result.action = 'cancelled_rejected_payment';
        } else {
          // in_process ou pending — ainda aguardando, não fazer nada
          result.action = 'still_pending_at_mp';
        }

      } catch (e: any) {
        console.error(`[Reconcile] Exceção ao processar booking ${booking.id}:`, e);
        result.action = 'exception';
        result.error = e.message;
      }

      results.push(result);
    }

    console.log(`[Reconcile] Concluído. ${results.length} booking(s) processado(s).`);

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[Reconcile] Erro interno:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
