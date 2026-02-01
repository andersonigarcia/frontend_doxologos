// Supabase Edge Function (Deno) - event-send-reminders
// Env expected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, FRONTEND_URL
// Purpose: Send reminder emails for confirmed event registrations (24h and 1h before event)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(sendgridKey: string, from: string, to: string, subject: string, html: string) {
    if (!sendgridKey || !from || !to) {
        console.error('❌ Missing email parameters');
        return false;
    }

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${sendgridKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: from },
            subject,
            content: [{ type: 'text/html', value: html }]
        })
    });

    return res.ok;
}

function build24hReminderEmail(inscricao: any, evento: any, meetingLink: string | null, frontendUrl: string): string {
    const eventDate = new Date(evento.data_inicio);
    const dateFormatted = eventDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const timeFormatted = eventDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #2d8659 0%, #1e5a3d 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; }
    .content { padding: 30px; }
    .event-box { background: #f0fdf4; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #2d8659; }
    .countdown { background: #fef3c7; padding: 15px; margin: 20px 0; border-radius: 6px; text-align: center; border: 2px dashed #f59e0b; }
    .countdown-text { font-size: 24px; font-weight: bold; color: #92400e; margin: 0; }
    .btn { display: inline-block; padding: 14px 32px; background: #2d8659; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center; margin: 10px 0; }
    .checklist { background: #dbeafe; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #3b82f6; }
    .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Lembrete: Seu Evento é Amanhã!</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${inscricao.patient_name || 'Participante'}</strong>,</p>
      
      <div class="countdown">
        <p class="countdown-text">🎯 Faltam 24 horas!</p>
      </div>

      <p style="font-size: 16px;">
        Este é um lembrete amigável de que você está inscrito no evento:
      </p>

      <div class="event-box">
        <h2 style="margin-top: 0; color: #2d8659;">${evento.titulo}</h2>
        <p style="margin: 8px 0;"><strong>📅 Data:</strong> ${dateFormatted}</p>
        <p style="margin: 8px 0;"><strong>⏰ Horário:</strong> ${timeFormatted}</p>
        ${evento.duracao_minutos ? `<p style="margin: 8px 0;"><strong>⏱️ Duração:</strong> ${evento.duracao_minutos} minutos</p>` : ''}
      </div>

      ${meetingLink ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${meetingLink}" class="btn" style="font-size: 16px; padding: 16px 40px;">
          🎥 Acessar Sala Virtual
        </a>
        <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
          Você também pode acessar o link pela sua Área do Paciente
        </p>
      </div>
      ` : `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/paciente" class="btn">
          📋 Ver Detalhes na Área do Paciente
        </a>
      </div>
      `}

      <div class="checklist">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af;">✅ Checklist de Preparação:</p>
        <ul style="margin: 0; padding-left: 20px; color: #1e3a8a;">
          <li>Teste sua conexão de internet</li>
          <li>Verifique se seu microfone e câmera funcionam</li>
          <li>Prepare um ambiente tranquilo e iluminado</li>
          <li>Tenha papel e caneta para anotações</li>
          <li>Entre 5 minutos antes do horário</li>
        </ul>
      </div>

      <p style="color: #666; font-size: 14px; margin: 20px 0;">
        <strong>Dúvidas?</strong> Responda este email ou entre em contato conosco.
      </p>
    </div>
    <div class="footer">
      <p><strong>Doxologos Psicologia</strong></p>
      <p style="margin: 5px 0;">📧 doxologos@doxologos.com.br</p>
      <p style="margin: 10px 0; font-size: 12px;">Nos vemos em breve! 🎉</p>
    </div>
  </div>
</body>
</html>`;
}

function build1hReminderEmail(inscricao: any, evento: any, meetingLink: string | null, frontendUrl: string): string {
    const eventDate = new Date(evento.data_inicio);
    const timeFormatted = eventDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; }
    .content { padding: 30px; }
    .urgent-box { background: #fef3c7; padding: 20px; margin: 20px 0; border-radius: 6px; border: 3px solid #f59e0b; }
    .countdown { background: #fee2e2; padding: 20px; margin: 20px 0; border-radius: 6px; text-align: center; border: 2px solid #dc2626; }
    .countdown-text { font-size: 28px; font-weight: bold; color: #991b1b; margin: 0; }
    .btn { display: inline-block; padding: 16px 40px; background: #2d8659; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center; font-size: 18px; }
    .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Último Lembrete: Evento em 1 Hora!</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${inscricao.patient_name || 'Participante'}</strong>,</p>
      
      <div class="countdown">
        <p class="countdown-text">⏰ COMEÇA EM 1 HORA!</p>
        <p style="font-size: 18px; color: #991b1b; margin: 10px 0 0 0;">Horário: ${timeFormatted}</p>
      </div>

      <div class="urgent-box">
        <h2 style="margin-top: 0; color: #92400e;">📌 ${evento.titulo}</h2>
        <p style="font-size: 16px; margin: 10px 0;">
          <strong>É AGORA!</strong> Prepare-se para entrar na sala nos próximos minutos.
        </p>
      </div>

      ${meetingLink ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${meetingLink}" class="btn">
          🎥 ENTRAR NA SALA AGORA
        </a>
        <p style="font-size: 14px; color: #dc2626; margin-top: 15px; font-weight: bold;">
          ⚡ Recomendamos entrar 5 minutos antes!
        </p>
      </div>
      ` : `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/paciente" class="btn">
          📋 ACESSAR LINK DO EVENTO
        </a>
      </div>
      `}

      <div style="background: #dbeafe; padding: 15px; margin: 20px 0; border-radius: 6px;">
        <p style="margin: 0; font-weight: bold; color: #1e40af;">⚡ Últimas Verificações:</p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #1e3a8a;">
          <li>Conexão de internet estável</li>
          <li>Microfone e câmera testados</li>
          <li>Ambiente tranquilo preparado</li>
        </ul>
      </div>

      <p style="text-align: center; font-size: 18px; font-weight: bold; color: #2d8659; margin: 30px 0;">
        Nos vemos em instantes! 🎉
      </p>
    </div>
    <div class="footer">
      <p><strong>Doxologos Psicologia</strong></p>
      <p style="margin: 5px 0;">📧 doxologos@doxologos.com.br</p>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req: Request) {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
        const sendgridFrom = Deno.env.get('SENDGRID_FROM_EMAIL') || 'doxologos@doxologos.com.br';
        const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://doxologos.com.br';

        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Supabase credentials missing');
            return new Response(
                JSON.stringify({ error: 'Supabase credentials missing' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!sendgridKey) {
            console.error('❌ SendGrid API key missing');
            return new Response(
                JSON.stringify({ error: 'SendGrid API key missing' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('🔍 Iniciando envio de lembretes de eventos...');

        const now = new Date();
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);

        // Janela de tolerância: ±15 minutos
        const window24hStart = new Date(in24Hours.getTime() - 15 * 60 * 1000).toISOString();
        const window24hEnd = new Date(in24Hours.getTime() + 15 * 60 * 1000).toISOString();
        const window1hStart = new Date(in1Hour.getTime() - 15 * 60 * 1000).toISOString();
        const window1hEnd = new Date(in1Hour.getTime() + 15 * 60 * 1000).toISOString();

        console.log(`⏰ Buscando eventos entre ${window24hStart} e ${window24hEnd} (24h)`);
        console.log(`⏰ Buscando eventos entre ${window1hStart} e ${window1hEnd} (1h)`);

        // Buscar inscrições confirmadas que precisam de lembrete de 24h
        const { data: inscricoes24h, error: error24h } = await supabase
            .from('inscricoes_eventos')
            .select(`
        id,
        patient_name,
        patient_email,
        reminder_24h_sent_at,
        evento:eventos(
          id,
          titulo,
          descricao,
          data_inicio,
          duracao_minutos
        )
      `)
            .eq('status', 'confirmed')
            .is('reminder_24h_sent_at', null)
            .gte('evento.data_inicio', window24hStart)
            .lte('evento.data_inicio', window24hEnd);

        if (error24h) {
            console.error('❌ Erro ao buscar inscrições 24h:', error24h);
            throw error24h;
        }

        // Buscar inscrições confirmadas que precisam de lembrete de 1h
        const { data: inscricoes1h, error: error1h } = await supabase
            .from('inscricoes_eventos')
            .select(`
        id,
        patient_name,
        patient_email,
        reminder_1h_sent_at,
        evento:eventos(
          id,
          titulo,
          descricao,
          data_inicio,
          duracao_minutos
        )
      `)
            .eq('status', 'confirmed')
            .is('reminder_1h_sent_at', null)
            .gte('evento.data_inicio', window1hStart)
            .lte('evento.data_inicio', window1hEnd);

        if (error1h) {
            console.error('❌ Erro ao buscar inscrições 1h:', error1h);
            throw error1h;
        }

        console.log(`📋 Encontradas ${inscricoes24h?.length || 0} inscrições para lembrete de 24h`);
        console.log(`📋 Encontradas ${inscricoes1h?.length || 0} inscrições para lembrete de 1h`);

        const results = {
            reminders_24h_sent: 0,
            reminders_1h_sent: 0,
            errors: [] as string[]
        };

        // Processar lembretes de 24h
        if (inscricoes24h && inscricoes24h.length > 0) {
            for (const inscricao of inscricoes24h) {
                try {
                    // Buscar link da sala (se disponível)
                    const { data: meetingData } = await supabase
                        .from('event_meetings')
                        .select('meeting_link')
                        .eq('evento_id', inscricao.evento.id)
                        .single();

                    const emailHtml = build24hReminderEmail(
                        inscricao,
                        inscricao.evento,
                        meetingData?.meeting_link || null,
                        frontendUrl
                    );

                    const emailSubject = `⏰ Lembrete: ${inscricao.evento.titulo} é amanhã!`;

                    const emailSent = await sendEmail(
                        sendgridKey,
                        sendgridFrom,
                        inscricao.patient_email,
                        emailSubject,
                        emailHtml
                    );

                    if (!emailSent) {
                        console.error(`❌ Erro ao enviar email 24h para ${inscricao.patient_email}`);
                        results.errors.push(`24h email failed for ${inscricao.id}`);
                        continue;
                    }

                    // Atualizar registro
                    const { error: updateError } = await supabase
                        .from('inscricoes_eventos')
                        .update({ reminder_24h_sent_at: new Date().toISOString() })
                        .eq('id', inscricao.id);

                    if (updateError) {
                        console.warn(`⚠️ Erro ao atualizar timestamp 24h para ${inscricao.id}`);
                        results.errors.push(`24h update failed for ${inscricao.id}`);
                    } else {
                        console.log(`✅ Lembrete 24h enviado para ${inscricao.patient_email}`);
                        results.reminders_24h_sent++;
                    }
                } catch (error) {
                    console.error(`❌ Erro ao processar inscrição 24h ${inscricao.id}:`, error);
                    results.errors.push(`${inscricao.id}: ${(error as Error).message}`);
                }
            }
        }

        // Processar lembretes de 1h
        if (inscricoes1h && inscricoes1h.length > 0) {
            for (const inscricao of inscricoes1h) {
                try {
                    // Buscar link da sala (se disponível)
                    const { data: meetingData } = await supabase
                        .from('event_meetings')
                        .select('meeting_link')
                        .eq('evento_id', inscricao.evento.id)
                        .single();

                    const emailHtml = build1hReminderEmail(
                        inscricao,
                        inscricao.evento,
                        meetingData?.meeting_link || null,
                        frontendUrl
                    );

                    const emailSubject = `🚨 URGENTE: ${inscricao.evento.titulo} começa em 1 hora!`;

                    const emailSent = await sendEmail(
                        sendgridKey,
                        sendgridFrom,
                        inscricao.patient_email,
                        emailSubject,
                        emailHtml
                    );

                    if (!emailSent) {
                        console.error(`❌ Erro ao enviar email 1h para ${inscricao.patient_email}`);
                        results.errors.push(`1h email failed for ${inscricao.id}`);
                        continue;
                    }

                    // Atualizar registro
                    const { error: updateError } = await supabase
                        .from('inscricoes_eventos')
                        .update({ reminder_1h_sent_at: new Date().toISOString() })
                        .eq('id', inscricao.id);

                    if (updateError) {
                        console.warn(`⚠️ Erro ao atualizar timestamp 1h para ${inscricao.id}`);
                        results.errors.push(`1h update failed for ${inscricao.id}`);
                    } else {
                        console.log(`✅ Lembrete 1h enviado para ${inscricao.patient_email}`);
                        results.reminders_1h_sent++;
                    }
                } catch (error) {
                    console.error(`❌ Erro ao processar inscrição 1h ${inscricao.id}:`, error);
                    results.errors.push(`${inscricao.id}: ${(error as Error).message}`);
                }
            }
        }

        console.log('📊 Resumo:', results);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Event reminders processed',
                ...results,
                timestamp: new Date().toISOString()
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('❌ Erro geral na função:', error);
        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                details: (error as Error).message,
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
}
