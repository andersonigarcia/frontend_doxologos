// Supabase Edge Function (Deno) - mp-webhook
declare const Deno: any;
// Env expected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MP_ACCESS_TOKEN, SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, ZOOM_BEARER_TOKEN

function formatPhoneE164(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return `+${digits}`;
  return `+${digits}`;
}

async function sendEmail(sendgridKey: string, from: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: from }, subject, content: [{ type: 'text/html', value: html }] })
  });
  return res.ok;
}

async function sendWhatsApp(twilioSid: string, twilioToken: string, from: string, to: string, body: string) {
  const formatted = formatPhoneE164(to);
  if (!formatted) return false;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
  const params = new URLSearchParams();
  params.append('From', from);
  params.append('To', `whatsapp:${formatted}`);
  params.append('Body', body);
  const auth = `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`;
  const res = await fetch(url, { method: 'POST', headers: { Authorization: auth }, body: params });
  return res.ok;
}

async function fetchMpPayment(paymentId: string, mpAccessToken: string) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${mpAccessToken}` } });
  if (!res.ok) throw new Error(`MP fetch failed ${res.status}`);
  return res.json();
}

async function createZoomMeeting(token: string | undefined, user: string | undefined, topic: string, startTimeIso: string | undefined, duration = 60, timezone = 'UTC') {
  if (!token) return null;
  const payload = { topic, type: 2, start_time: startTimeIso || new Date().toISOString(), duration, timezone, settings: { join_before_host: false, waiting_room: true } };
  const res = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(user || 'me')}/meetings`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) { console.error('Zoom create failed', await res.text()); return null; }
  return res.json();
}

export default async function handler(req: Request) {
  try {
    const body = await req.json();
    const paymentId = body.id || (body.data && body.data.id) || null;
    if (!paymentId) return new Response('no payment id', { status: 400 });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') || '';
    const SENDGRID_KEY = Deno.env.get('SENDGRID_API_KEY') || '';
    const SENDGRID_FROM = Deno.env.get('SENDGRID_FROM_EMAIL') || '';
    const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
    const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const TWILIO_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM') || '';
    const ZOOM_TOKEN = Deno.env.get('ZOOM_BEARER_TOKEN') || '';

    const mpPayment = await fetchMpPayment(paymentId, MP_ACCESS_TOKEN);

    const externalRef = mpPayment.external_reference || null;

    // ========================================
    // DETECTAR PAGAMENTO DE EVENTO (prefixo EVENTO_)
    // ========================================
    if (externalRef && externalRef.startsWith('EVENTO_')) {
      const inscricaoId = externalRef.replace('EVENTO_', '');
      console.log(`🎫 Processando pagamento de evento - Inscrição ID: ${inscricaoId}`);

      if (mpPayment.status === 'approved' || mpPayment.status === 'paid') {
        // Buscar inscrição
        const inscQuery = `${SUPABASE_URL}/rest/v1/inscricoes_eventos?id=eq.${inscricaoId}&select=*,eventos(*)`;
        const inscRes = await fetch(inscQuery, { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } });
        const inscArr = await inscRes.json();
        const inscricao = inscArr[0];

        if (!inscricao) {
          console.error(`❌ Inscrição ${inscricaoId} não encontrada`);
          return new Response('inscricao not found', { status: 404 });
        }

        const evento = inscricao.eventos;

        // Atualizar status da inscrição
        await fetch(`${SUPABASE_URL}/rest/v1/inscricoes_eventos?id=eq.${inscricaoId}`, {
          method: 'PATCH',
          headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'confirmed',
            payment_status: 'approved',
            payment_date: new Date().toISOString()
          })
        });

        console.log(`✅ Inscrição ${inscricaoId} confirmada - Enviando email com Zoom`);

        // Enviar email com link Zoom
        try {
          const patientEmail = inscricao.patient_email;
          const patientName = inscricao.patient_name;

          if (patientEmail && SENDGRID_KEY && SENDGRID_FROM) {
            const dataFormatada = new Date(evento.data_inicio).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            });
            const horaFormatada = new Date(evento.data_inicio).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            });

            const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2d8659 0%, #236b47 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .event-box { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .zoom-box { background: #e8f5ee; border: 2px solid #2d8659; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .btn { display: inline-block; background: #2d8659; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .checklist { background: #f9f9f9; padding: 15px; border-left: 4px solid #2d8659; margin: 15px 0; }
    .checklist li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Pagamento Confirmado!</h1>
      <p>Sua vaga está garantida</p>
    </div>
    
    <div class="content">
      <p>Olá <strong>${patientName}</strong>,</p>
      
      <p>Recebemos a confirmação do seu pagamento! Sua inscrição no evento está <strong style="color: #2d8659;">CONFIRMADA</strong>. 🎉</p>
      
      <div class="event-box">
        <h2 style="color: #2d8659; margin-top: 0;">${evento.titulo}</h2>
        <p><strong>📅 Data:</strong> ${dataFormatada}</p>
        <p><strong>⏰ Horário:</strong> ${horaFormatada}</p>
        <p><strong>💰 Valor pago:</strong> R$ ${parseFloat(evento.valor).toFixed(2).replace('.', ',')}</p>
        <p><strong>✅ Status:</strong> <span style="color: #2d8659;">Confirmado</span></p>
      </div>
      
      <div class="zoom-box">
        <h3 style="color: #2d8659; margin-top: 0;">🎥 Link da Sala Zoom</h3>
        <p style="word-break: break-all;"><a href="${evento.meeting_link}" style="color: #2d8659; font-weight: bold;">${evento.meeting_link}</a></p>
        ${evento.meeting_password ? `<p><strong>🔒 Senha:</strong> <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${evento.meeting_password}</code></p>` : ''}
        <p style="text-align: center; margin: 15px 0;">
          <a href="${evento.meeting_link}" class="btn">🎥 Acessar Sala Zoom</a>
        </p>
      </div>

      <div style="background: #dbeafe; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h3 style="color: #1e40af; margin-top: 0;">📱 Acesso Rápido à Sua Área</h3>
        <p style="margin: 0 0 15px 0;">Salve o link do evento e acompanhe outros na sua área de inscrições:</p>
        <a href="https://appsite.doxologos.com.br/minhas-inscricoes" class="btn" style="background: #3b82f6; display: inline-block;">🔐 Acessar Minhas Inscrições</a>
      </div>
      
      <div class="checklist">
        <h4 style="margin-top: 0;">📋 Checklist para o evento:</h4>
        <ul>
          <li>✅ Pagamento confirmado</li>
          <li>📧 Adicione este evento ao seu calendário</li>
          <li>🎥 Teste o Zoom antes do evento (link acima)</li>
          <li>📱 Entre 5-10 minutos antes do horário</li>
          <li>🎧 Use fone de ouvido para melhor qualidade</li>
          <li>📝 Tenha papel e caneta para anotações</li>
        </ul>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        <strong>💡 Dica:</strong> Acesse o link alguns minutos antes para testar sua conexão e aguardar na sala de espera. 
        O host irá admitir todos os participantes no horário do evento.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      
      <p style="color: #666; font-size: 12px;">
        Alguma dúvida? Responda este email ou entre em contato conosco.<br>
        <strong>Doxologos - Atendimento Psicológico Cristão</strong><br>
        www.doxologos.com.br
      </p>
    </div>
  </div>
</body>
</html>`;

            const emailSent = await sendEmail(SENDGRID_KEY, SENDGRID_FROM, patientEmail, `✅ Pagamento Confirmado - ${evento.titulo}`, emailHtml);

            if (emailSent) {
              // Marcar email como enviado
              await fetch(`${SUPABASE_URL}/rest/v1/inscricoes_eventos?id=eq.${inscricaoId}`, {
                method: 'PATCH',
                headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  zoom_link_sent: true,
                  zoom_link_sent_at: new Date().toISOString()
                })
              });

              console.log(`✅ Email com Zoom enviado para ${patientEmail}`);
            }
          }
        } catch (emailError) {
          console.error('❌ Erro ao enviar email:', emailError);
        }
      }

      return new Response('evento payment processed', { status: 200 });
    }

    // ========================================
    // FLUXO ORIGINAL: BOOKINGS (CONSULTAS)
    // ========================================
    const preferenceId = mpPayment.preference_id || null;
    const externalReference = mpPayment.external_reference || null;
    let booking = null;
    if (preferenceId) {
      const q = `${SUPABASE_URL}/rest/v1/bookings?marketplace_preference_id=eq.${preferenceId}&select=*`;
      const r = await fetch(q, { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } });
      const arr = await r.json();
      booking = arr[0];
    }

    if (!booking && externalReference) {
      const sanitizedReference = externalReference.replace(/^BOOKING[_-]?/i, '').trim();
      const referenceForQuery = sanitizedReference.length > 0 ? sanitizedReference : externalReference;
      const encodedRef = encodeURIComponent(referenceForQuery);
      const byIdQuery = `${SUPABASE_URL}/rest/v1/bookings?id=eq.${encodedRef}&select=*`;
      const fallbackRes = await fetch(byIdQuery, { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } });
      const fallbackArr = await fallbackRes.json();
      booking = fallbackArr[0];
    }

    // insert payment record
  await fetch(`${SUPABASE_URL}/rest/v1/payments`, { method: 'POST', headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_id: booking?.id || null, mp_payment_id: mpPayment.id?.toString(), status: mpPayment.status || 'unknown', amount: mpPayment.transaction_amount || null, raw_payload: mpPayment, created_at: new Date().toISOString() }) });

    if (mpPayment.status === 'approved' || mpPayment.status === 'paid') {
      if (booking && booking.id) {
        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, { method: 'PATCH', headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'confirmed', updated_at: new Date().toISOString() }) });

        // create zoom
        let zoomResp = null;
        try {
          let startIso: string | undefined = undefined;
          try { if (booking.booking_date && booking.booking_time) startIso = new Date(`${booking.booking_date}T${booking.booking_time}:00`).toISOString(); } catch (e) { }
          zoomResp = await createZoomMeeting(ZOOM_TOKEN, Deno.env.get('ZOOM_USER_ID') || 'me', `Sessão - ${booking.professional_id}`, startIso, booking.duration_minutes || 60, Deno.env.get('ZOOM_TIMEZONE') || 'UTC');
          if (zoomResp && zoomResp.join_url) {
            await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, { method: 'PATCH', headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ zoom_link: zoomResp.join_url }) });
          }
        } catch (e) { console.error('zoom creation failed', e); }

        // notifications
        try {
          const patientEmail = booking.user_email || booking.payer_email || booking.email || null;
          const patientPhone = booking.user_phone || booking.payer_phone || booking.phone || null;
          const profEmail = booking.professional_email || null;
          const profPhone = booking.professional_phone || null;
          const zoomLink = zoomResp?.join_url || booking.zoom_link || null;

          const subject = `Seu agendamento foi confirmado - Doxologos`;
          const html = `<p>Olá,</p><p>Seu agendamento com o profissional foi confirmado.</p><p>Link Zoom: <a href="${zoomLink}">${zoomLink}</a></p>`;

          if (patientEmail && SENDGRID_KEY && SENDGRID_FROM) await sendEmail(SENDGRID_KEY, SENDGRID_FROM, patientEmail, subject, html);
          if (profEmail && SENDGRID_KEY && SENDGRID_FROM) await sendEmail(SENDGRID_KEY, SENDGRID_FROM, profEmail, 'Novo agendamento confirmado', `<p>Você tem um novo agendamento. Link: <a href="${zoomLink}">${zoomLink}</a></p>`);

          const waText = `Agendamento confirmado - ${booking.booking_date} ${booking.booking_time}. Link: ${zoomLink}`;
          if (patientPhone && TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) await sendWhatsApp(TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, patientPhone, waText);
          if (profPhone && TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) await sendWhatsApp(TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, profPhone, waText);

          // log
          await fetch(`${SUPABASE_URL}/rest/v1/logs`, { method: 'POST', headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' }, body: JSON.stringify([{ entity_type: 'notification', entity_id: booking.id, action: 'send_notifications', payload: { patientEmail, profEmail, patientPhone, profPhone, zoomLink }, created_at: new Date().toISOString() }]) });
        } catch (e) { console.error('notification error', e); }
      }
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('webhook error', err);
    return new Response('internal error', { status: 500 });
  }
}
