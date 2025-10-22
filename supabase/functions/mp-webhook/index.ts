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

    const preferenceId = mpPayment.preference_id || mpPayment.external_reference || null;
    let booking = null;
    if (preferenceId) {
      const q = `${SUPABASE_URL}/rest/v1/bookings?marketplace_preference_id=eq.${preferenceId}&select=*`;
      const r = await fetch(q, { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } });
      const arr = await r.json();
      booking = arr[0];
    }

    // insert payment record
    await fetch(`${SUPABASE_URL}/rest/v1/payments`, { method: 'POST', headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ booking_id: booking?.id || null, mp_payment_id: mpPayment.id?.toString(), status: mpPayment.status || 'unknown', amount: mpPayment.transaction_amount || null, raw_payload: mpPayment, created_at: new Date().toISOString() }) });

    if (mpPayment.status === 'approved' || mpPayment.status === 'paid') {
      if (booking && booking.id) {
        await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, { method: 'PATCH', headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'confirmed', updated_at: new Date().toISOString() }) });

        // create zoom
        let zoomResp = null;
        try {
          let startIso = null;
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
