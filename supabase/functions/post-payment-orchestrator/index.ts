// Supabase Edge Function (Deno) - post-payment-orchestrator
// Orquestra todas as ações pós-pagamento: email de confirmação (paciente + profissional)
// e WhatsApp (quando serviço contratado).
//
// IDEMPOTENTE: se notification_sent_at já preenchido, retorna early sem re-disparar.
// PLUGÁVEL: WhatsApp atrás de flag WHATSAPP_BOOKING_CONFIRMATION (desativado por padrão).
//
// Invocado por:
//   - mp-webhook/index.ts (aprovação assíncrona via operadora)
//   - mp-process-card-payment/index.ts (aprovação síncrona imediata)
//   - reconcile-pending-bookings/index.ts (safety net — cron a cada 10min)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Templates de Email ──────────────────────────────────────────────────────

function buildPatientConfirmationEmail(booking: any, professional: any): string {
  const meetLink = booking.meeting_link;
  const bookingDate = new Date(booking.booking_date).toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const bookingTime = booking.booking_time?.slice(0, 5) || '';
  const profName = professional?.name || booking.professional_name || 'seu profissional';
  const patientName = booking.patient_name?.split(' ')[0] || 'Paciente';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Consulta Confirmada — Doxologos</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2d6a4f,#52b788);padding:32px 40px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">✅ Consulta Confirmada!</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">Seu pagamento foi aprovado com sucesso</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">
      <p style="color:#374151;font-size:16px;margin:0 0 24px;">Olá, <strong>${patientName}</strong>! 👋</p>
      <p style="color:#374151;font-size:15px;margin:0 0 24px;">
        Sua consulta com <strong>${profName}</strong> está confirmada. Aqui estão os detalhes:
      </p>

      <!-- Detalhes -->
      <div style="background:#f0fdf4;border-left:4px solid #2d6a4f;border-radius:8px;padding:20px 24px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:6px 0;width:40%;">📅 Data</td>
            <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">${bookingDate}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:6px 0;">⏰ Horário</td>
            <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">${bookingTime}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:6px 0;">👩‍⚕️ Profissional</td>
            <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">${profName}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:6px 0;">📱 Modalidade</td>
            <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0;">Teleconsulta (Google Meet)</td>
          </tr>
        </table>
      </div>

      ${meetLink ? `
      <!-- Link Meet -->
      <div style="text-align:center;margin:0 0 28px;">
        <p style="color:#374151;font-size:14px;margin:0 0 12px;">Acesse sua consulta pelo link abaixo:</p>
        <a href="${meetLink}" style="display:inline-block;background:#2d6a4f;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
          🔗 Entrar na Consulta Google Meet
        </a>
        <p style="color:#9ca3af;font-size:12px;margin:10px 0 0;">Salve este link! Ele também estará disponível na sua Área do Paciente.</p>
      </div>
      ` : `
      <!-- Fallback sem link Meet -->
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:8px;padding:16px 20px;margin:0 0 28px;">
        <p style="color:#92400e;font-size:14px;margin:0;">
          📱 O link para a sala de consulta será compartilhado diretamente pelo profissional em breve.
        </p>
      </div>
      `}

      <!-- Dicas -->
      <div style="background:#f8fafc;border-radius:8px;padding:20px 24px;margin:0 0 24px;">
        <p style="color:#374151;font-size:14px;font-weight:600;margin:0 0 12px;">💡 Dicas para sua consulta:</p>
        <ul style="color:#6b7280;font-size:13px;margin:0;padding-left:18px;line-height:1.8;">
          <li>Esteja em um ambiente tranquilo e bem iluminado</li>
          <li>Teste sua câmera e microfone antes do horário</li>
          <li>Acesse pelo link acima alguns minutos antes</li>
          <li>Em caso de dúvidas, acesse sua Área do Paciente</li>
        </ul>
      </div>

      <p style="color:#9ca3af;font-size:13px;text-align:center;margin:0;">
        Você receberá lembretes por email 24h e 2h antes da consulta.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">
        Doxologos Psicologia · 
        <a href="https://novo.doxologos.com.br/area-do-paciente" style="color:#2d6a4f;text-decoration:none;">Área do Paciente</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildProfessionalConfirmationEmail(booking: any, professional: any): string {
  const bookingDate = new Date(booking.booking_date).toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const bookingTime = booking.booking_time?.slice(0, 5) || '';
  const patientName = booking.patient_name || 'Paciente';
  const patientEmail = booking.patient_email || '';
  const patientPhone = booking.patient_phone || 'Não informado';
  const profFirstName = professional?.name?.split(' ')[0] || 'Profissional';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nova Consulta Confirmada — Doxologos</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px 40px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">📅 Nova Consulta Confirmada</h1>
      <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Pagamento aprovado — paciente aguarda atendimento</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 40px;">
      <p style="color:#374151;font-size:16px;margin:0 0 20px;">Olá, <strong>${profFirstName}</strong>!</p>
      <p style="color:#374151;font-size:15px;margin:0 0 24px;">
        Um novo agendamento foi confirmado via pagamento. Veja os detalhes abaixo:
      </p>

      <!-- Detalhes da Consulta -->
      <div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:8px;padding:20px 24px;margin:0 0 20px;">
        <p style="color:#1e3a5f;font-size:13px;font-weight:700;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Dados da Consulta</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:5px 0;width:40%;">📅 Data</td>
            <td style="color:#111827;font-size:14px;font-weight:600;padding:5px 0;">${bookingDate}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:5px 0;">⏰ Horário</td>
            <td style="color:#111827;font-size:14px;font-weight:600;padding:5px 0;">${bookingTime}</td>
          </tr>
        </table>
      </div>

      <!-- Dados do Paciente -->
      <div style="background:#f0fdf4;border-left:4px solid #2d6a4f;border-radius:8px;padding:20px 24px;margin:0 0 24px;">
        <p style="color:#14532d;font-size:13px;font-weight:700;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.5px;">Dados do Paciente</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:5px 0;width:40%;">👤 Nome</td>
            <td style="color:#111827;font-size:14px;font-weight:600;padding:5px 0;">${patientName}</td>
          </tr>
          ${patientEmail ? `<tr>
            <td style="color:#6b7280;font-size:13px;padding:5px 0;">✉️ Email</td>
            <td style="color:#111827;font-size:14px;padding:5px 0;">${patientEmail}</td>
          </tr>` : ''}
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:5px 0;">📱 Telefone</td>
            <td style="color:#111827;font-size:14px;padding:5px 0;">${patientPhone}</td>
          </tr>
        </table>
      </div>

      <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">
        O link da sala Google Meet cadastrado no seu perfil foi compartilhado com o paciente.<br>
        Acesse o <a href="https://novo.doxologos.com.br" style="color:#2563eb;text-decoration:none;">painel Doxologos</a> para mais detalhes.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Doxologos Psicologia</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Handler Principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { booking_id } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Orchestrator] Iniciando para booking ${booking_id}`);

    // ── 1. Buscar booking com dados do profissional ─────────────────────────
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select(`
        id, status, patient_name, patient_email, patient_phone,
        booking_date, booking_time, meeting_link,
        notification_sent_at, notification_status,
        professional_id,
        professional:professionals (id, name, email, phone, whatsapp, personal_meet_link)
      `)
      .eq('id', booking_id)
      .single();

    if (bookingErr || !booking) {
      console.error(`[Orchestrator] Booking ${booking_id} não encontrado:`, bookingErr);
      return new Response(
        JSON.stringify({ error: 'Booking não encontrado', details: bookingErr?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Idempotência: já notificado? ────────────────────────────────────
    if (booking.notification_sent_at) {
      console.log(`[Orchestrator] Booking ${booking_id} já notificado em ${booking.notification_sent_at}. Retornando early.`);
      return new Response(
        JSON.stringify({ already_processed: true, notification_sent_at: booking.notification_sent_at }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── 3. Verificar status ────────────────────────────────────────────────
    if (booking.status !== 'confirmed') {
      console.warn(`[Orchestrator] Booking ${booking_id} não está confirmado (status: ${booking.status}). Abortando.`);
      return new Response(
        JSON.stringify({ skipped: true, reason: `status=${booking.status}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const professional = Array.isArray(booking.professional)
      ? booking.professional[0]
      : booking.professional;

    // meeting_link: prioridade para o salvo no booking, fallback para o perfil do profissional
    const meetLink = booking.meeting_link || professional?.personal_meet_link || null;

    if (!meetLink) {
      console.warn(`[Orchestrator] Profissional ${professional?.id} sem personal_meet_link cadastrado.`);
      // Criar alerta admin
      await supabase.from('notifications').insert([{
        user_id: null,
        type: 'system:booking_alert',
        title: '⚠️ Consulta confirmada sem link Google Meet',
        message: `Booking #${booking_id} confirmado, mas o profissional ${professional?.name || booking.professional_id} não tem link Meet cadastrado no perfil.`,
        link: `/admin?tab=bookings&booking_id=${booking_id}`,
        metadata: { booking_id, professional_id: booking.professional_id }
      }]).catch((e: any) => console.error('[Orchestrator] Falha ao criar alerta admin:', e));
    }

    const results: Record<string, any> = {};

    // ── 4. Email para o PACIENTE ───────────────────────────────────────────
    if (booking.patient_email) {
      try {
        const patientHtml = buildPatientConfirmationEmail({ ...booking, meeting_link: meetLink }, professional);
        const { error: emailErr } = await supabase.functions.invoke('send-email', {
          body: {
            to: booking.patient_email,
            subject: '✅ Sua consulta está confirmada — Doxologos',
            html: patientHtml,
          }
        });

        if (emailErr) {
          console.error('[Orchestrator] Erro ao enviar email ao paciente:', emailErr);
          results.patient_email = 'failed';
        } else {
          console.log(`[Orchestrator] Email enviado ao paciente ${booking.patient_email}`);
          results.patient_email = 'sent';
        }
      } catch (e: any) {
        console.error('[Orchestrator] Exceção no email ao paciente:', e);
        results.patient_email = 'error';
      }
    } else {
      console.warn('[Orchestrator] Paciente sem email — notificação por email pulada.');
      results.patient_email = 'skipped_no_email';
    }

    // ── 5. Email para o PROFISSIONAL ──────────────────────────────────────
    const profEmail = professional?.email;
    if (profEmail) {
      try {
        const profHtml = buildProfessionalConfirmationEmail(booking, professional);
        const { error: profEmailErr } = await supabase.functions.invoke('send-email', {
          body: {
            to: profEmail,
            subject: `📅 Nova consulta confirmada — ${booking.patient_name} — Doxologos`,
            html: profHtml,
          }
        });

        if (profEmailErr) {
          console.error('[Orchestrator] Erro ao enviar email ao profissional:', profEmailErr);
          results.professional_email = 'failed';
        } else {
          console.log(`[Orchestrator] Email enviado ao profissional ${profEmail}`);
          results.professional_email = 'sent';
        }
      } catch (e: any) {
        console.error('[Orchestrator] Exceção no email ao profissional:', e);
        results.professional_email = 'error';
      }
    } else {
      console.warn('[Orchestrator] Profissional sem email cadastrado.');
      results.professional_email = 'skipped_no_email';
    }

    // ── 6. WhatsApp (plugável — ativar quando serviço contratado) ──────────
    const waEnabled = (Deno.env.get('WHATSAPP_BOOKING_CONFIRMATION') || 'false').toLowerCase() === 'true';
    if (waEnabled) {
      const waPhone = booking.patient_phone;
      if (waPhone) {
        try {
          const { error: waErr } = await supabase.functions.invoke('send-whatsapp-reminder', {
            body: {
              booking_id,
              recipient_phone: waPhone,
              recipient_name: booking.patient_name,
              reminder_type: 'confirmation',
              meeting_link: meetLink,   // Google Meet link do profissional
            }
          });
          results.patient_whatsapp = waErr ? 'failed' : 'sent';
        } catch (e: any) {
          results.patient_whatsapp = 'error';
        }
      }
    } else {
      console.log('[Orchestrator] WhatsApp desativado (WHATSAPP_BOOKING_CONFIRMATION=false). Apenas email enviado.');
      results.patient_whatsapp = 'disabled';
    }

    // ── 7. Determinar status final da notificação ──────────────────────────
    const allChannels = [results.patient_email, results.professional_email];
    const hasSent = allChannels.some(s => s === 'sent');
    const hasFailed = allChannels.some(s => s === 'failed' || s === 'error');

    let notificationStatus: string;
    if (hasSent && !hasFailed) {
      notificationStatus = 'sent';
    } else if (hasSent && hasFailed) {
      notificationStatus = 'partial_failure';
    } else {
      notificationStatus = 'failed';
    }

    // ── 8. Atualizar booking com timestamp de notificação ─────────────────
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({
        notification_sent_at: new Date().toISOString(),
        notification_status: notificationStatus,
      })
      .eq('id', booking_id);

    if (updateErr) {
      console.error('[Orchestrator] Erro ao atualizar notification_sent_at:', updateErr);
    }

    // ── 9. Alerta admin se falha total ─────────────────────────────────────
    if (notificationStatus === 'failed') {
      await supabase.from('notifications').insert([{
        user_id: null,
        type: 'system:booking_alert',
        title: '🔴 Falha no envio de notificações pós-pagamento',
        message: `Booking #${booking_id} (${booking.patient_name}) confirmado, mas notificações falharam. Verificar manualmente.`,
        link: `/admin?tab=bookings&booking_id=${booking_id}`,
        metadata: { booking_id, results }
      }]).catch((e: any) => console.error('[Orchestrator] Falha ao criar alerta de falha:', e));
    }

    console.log(`[Orchestrator] Concluído para booking ${booking_id}:`, { notificationStatus, results });

    return new Response(
      JSON.stringify({
        success: true,
        booking_id,
        notification_status: notificationStatus,
        channels: results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[Orchestrator] Erro interno:', err);
    return new Response(
      JSON.stringify({ error: 'Erro interno', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
