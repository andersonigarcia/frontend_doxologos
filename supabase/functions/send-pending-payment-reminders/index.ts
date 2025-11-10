// Supabase Edge Function (Deno) - send-pending-payment-reminders
// Env expected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, FRONTEND_URL
// Purpose: Send daily payment reminders for pending bookings (max 1 per day per booking)
declare const Deno: any;

async function sendEmail(sendgridKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: from }, subject, content: [{ type: 'text/html', value: html }] })
  });
  return res.ok;
}

function buildPaymentReminderEmail(booking: any, frontendUrl: string): string {
  const bookingDate = new Date(booking.booking_date);
  const dateFormatted = bookingDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const valor = parseFloat(booking.valor_consulta || 0).toFixed(2).replace('.', ',');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: #f59e0b; color: white; padding: 25px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .info-box { background: #fef3c7; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #f59e0b; }
    .btn { display: inline-block; padding: 14px 32px; background: #2d8659; color: white !important; text-decoration: none; border-radius: 6px; font-weight: 600; text-align: center; }
    .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💳 Sua Consulta Está Aguardando Pagamento</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${booking.patient_name || 'Paciente'}</strong>,</p>
      
      <p style="font-size: 16px; margin: 20px 0;">
        Você tem uma consulta agendada em breve, mas o pagamento ainda está pendente.
        <strong>Clique no botão abaixo para finalizar o pagamento na sua área:</strong>
      </p>

      <div class="info-box">
        <p style="margin: 8px 0;"><strong>📅 Data da Consulta:</strong> ${dateFormatted}</p>
        <p style="margin: 8px 0;"><strong>⏰ Horário:</strong> ${booking.booking_time || 'N/A'}</p>
        <p style="margin: 8px 0;"><strong>🩺 Serviço:</strong> ${booking.service_name || 'Consulta'}</p>
        <p style="margin: 8px 0;"><strong>👨‍⚕️ Profissional:</strong> ${booking.professional_name || 'N/A'}</p>
        <p style="margin: 8px 0; font-weight: bold;"><strong>💰 Valor:</strong> R$ ${valor}</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${frontendUrl}/paciente" class="btn" style="font-size: 16px; padding: 16px 40px; text-decoration: none;">💳 Finalizar Pagamento</a>
      </p>

      <div style="background: #dbeafe; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #1e40af;">✅ O que acontece após o pagamento:</p>
        <ul style="margin: 0; padding-left: 20px; color: #1e3a8a;">
          <li>O link e senha da sala Zoom estarão disponíveis na sua área</li>
          <li>Você receberá um lembrete 24h antes da consulta</li>
          <li>Terá acesso ao histórico e informações da consulta</li>
        </ul>
      </div>

      <p style="color: #666; font-size: 14px; margin: 20px 0;">
        <strong>Dúvidas?</strong> Responda este email ou entre em contato conosco.
      </p>
    </div>
    <div class="footer">
      <p><strong>Doxologos Psicologia</strong></p>
      <p style="margin: 5px 0;">📧 doxologos@doxologos.com.br</p>
      <p style="margin: 10px 0; font-size: 12px;">Não respondemos mais emails de aviso de pagamento depois que o pagamento é confirmado.</p>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req: Request) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
    const sendgridFrom = Deno.env.get('SENDGRID_FROM_EMAIL') || 'doxologos@doxologos.com.br';
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://appsite.doxologos.com.br';

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials missing');
      return new Response(JSON.stringify({ error: 'Supabase credentials missing' }), { status: 500 });
    }

    if (!sendgridKey) {
      console.error('❌ SendGrid API key missing');
      return new Response(JSON.stringify({ error: 'SendGrid API key missing' }), { status: 500 });
    }

    console.log('🔍 Iniciando busca de agendamentos com pagamento pendente...');

    // ========================================
    // BUSCAR AGENDAMENTOS COM PAGAMENTO PENDENTE
    // ========================================
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Busca agendamentos futuros que não têm zoom_link ainda
    // (indica que pagamento ainda não foi confirmado e reunião não foi criada)
    // Ou agendamentos com status = 'pending'
    const bookingsRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?booking_date=gte.${today}&zoom_link=is.null&select=id,patient_name,patient_email,booking_date,booking_time,valor_consulta,service_name,professional_name,last_payment_reminder_sent_at&order=booking_date.asc`,
      {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
      }
    );

    if (!bookingsRes.ok) {
      console.error(`❌ Erro ao buscar bookings: ${bookingsRes.status}`, await bookingsRes.text());
      return new Response(JSON.stringify({ error: `Fetch error: ${bookingsRes.status}` }), { status: 500 });
    }

    const bookings = await bookingsRes.json();
    console.log(`✅ Encontrados ${bookings?.length || 0} agendamentos com pagamento pendente`);

    let remindersSent = 0;
    let remindersSkipped = 0;
    const errors: string[] = [];

    if (bookings && bookings.length > 0) {
      const todayStartOfDay = new Date(today);
      todayStartOfDay.setUTCHours(0, 0, 0, 0);

      for (const booking of bookings) {
        try {
          // Verificar se já foi notificado hoje
          let shouldSend = true;
          if (booking.last_payment_reminder_sent_at) {
            const lastSent = new Date(booking.last_payment_reminder_sent_at);
            lastSent.setUTCHours(0, 0, 0, 0);
            if (lastSent.getTime() === todayStartOfDay.getTime()) {
              console.log(`⏭️ Agendamento ${booking.id} já foi notificado hoje. Pulando...`);
              remindersSkipped++;
              shouldSend = false;
            }
          }

          if (!shouldSend) continue;

          // ========================================
          // MONTAR E ENVIAR EMAIL
          // ========================================
          const emailHtml = buildPaymentReminderEmail(booking, frontendUrl);
          const emailSubject = `💳 Lembrete: Finalize o Pagamento - Consulta em ${new Date(booking.booking_date).toLocaleDateString('pt-BR')}`;

          const emailSent = await sendEmail(sendgridKey, sendgridFrom, booking.patient_email, emailSubject, emailHtml);

          if (!emailSent) {
            console.error(`❌ Erro ao enviar email para ${booking.patient_email} (Booking: ${booking.id})`);
            errors.push(`Email failed for booking ${booking.id}`);
            continue;
          }

          // ========================================
          // ATUALIZAR BOOKING COM DATA DO ÚLTIMO LEMBRETE
          // ========================================
          const updateRes = await fetch(
            `${supabaseUrl}/rest/v1/bookings?id=eq.${booking.id}`,
            {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation'
              },
              body: JSON.stringify({ last_payment_reminder_sent_at: new Date().toISOString() }),
            }
          );

          if (!updateRes.ok) {
            console.warn(`⚠️ Erro ao atualizar timestamp para booking ${booking.id}: ${updateRes.status}`);
            errors.push(`Update failed for booking ${booking.id}`);
          } else {
            console.log(`✅ Lembrete enviado para ${booking.patient_email} (ID: ${booking.id})`);
            remindersSent++;
          }
        } catch (error) {
          console.error(`❌ Erro ao processar agendamento ${booking.id}:`, error);
          errors.push(`${booking.id}: ${(error as Error).message}`);
        }
      }
    }

    // ========================================
    // RETORNAR RESULTADO
    // ========================================
    const result = {
      success: true,
      reminders_sent: remindersSent,
      reminders_skipped: remindersSkipped,
      errors: errors,
      timestamp: new Date().toISOString(),
    };

    console.log('📊 Resumo:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Erro geral na função:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: (error as Error).message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
