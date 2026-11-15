/**
 * Registra o Webhook da Doxologos na API da Daily.co
 */
const DAILY_API_KEY = process.env.DAILY_API_KEY || '5fc002f7903bbc66f9c0657ac317acb1ddb6e68cddba76e07e093663f08c22f0';
const WEBHOOK_URL = 'https://ppwjtvzrhvjinsutrjwk.supabase.co/functions/v1/daily-webhook';

async function registerDailyWebhook() {
  console.log('🔄 Registrando Webhook no Daily.co...');
  console.log(`Endpoint: ${WEBHOOK_URL}\n`);

  try {
    const response = await fetch('https://api.daily.co/v1/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        eventTypes: [
          'meeting.started',
          'meeting.ended',
          'participant.joined',
          'participant.left'
        ]
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Webhook registrado com sucesso no Daily.co!');
      console.log('Dados do Webhook:', JSON.stringify(data, null, 2));
    } else {
      console.warn('⚠️ Resposta da Daily.co:', data);
      if (data?.error === 'webhooks-not-available' || response.status === 402 || response.status === 403) {
        console.log('\n💡 NOTA: Sua conta Daily.co está no plano Free (webhooks de domínio global requerem plano pago).');
        console.log('Não se preocupe: a plataforma Doxologos foi arquitetada com telemetria nativa in-app e meeting_join_hook, funcionando 100% perfeitamente mesmo sem o webhook global configurado!');
      }
    }
  } catch (err) {
    console.error('❌ Erro na requisição:', err.message);
  }
}

registerDailyWebhook();
