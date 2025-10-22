// Supabase Edge Function - Mercado Pago Webhook handler (esboço)
// Localização: functions/mp-webhook/index.js
// Observações:
// - Esta função deve rodar em ambiente protegido com as variáveis de ambiente:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MP_ACCESS_TOKEN
// - Não inclua service_role no frontend.

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { loadLocalEnv } from '../load-config.js';

// Load config/local.env into process.env when running locally (do NOT commit secrets)
loadLocalEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase env vars');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

const sendgridKey = process.env.SENDGRID_API_KEY;
const sendgridFrom = process.env.SENDGRID_FROM_EMAIL;

const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+55XXXXXXXXX

function formatPhoneE164(phone) {
  if (!phone) return null;
  // Basic sanitize: remove non-digits
  const digits = phone.replace(/\D/g, '');
  // If starts with country code (e.g., 55) and length >= 10, prefix with +
  if (digits.length >= 10) return `+${digits}`;
  return `+${digits}`;
}

async function sendEmail(to, subject, html) {
  if (!sendgridKey || !sendgridFrom) {
    console.warn('SendGrid not configured');
    return { ok: false, error: 'sendgrid not configured' };
  }
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sendgridKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: sendgridFrom },
      subject,
      content: [{ type: 'text/html', value: html }]
    })
  });
  if (!res.ok) return { ok: false, status: res.status, text: await res.text() };
  return { ok: true };
}

async function sendWhatsApp(to, body) {
  if (!twilioSid || !twilioToken || !twilioWhatsAppFrom) {
    console.warn('Twilio not configured');
    return { ok: false, error: 'twilio not configured' };
  }
  const formatted = formatPhoneE164(to);
  if (!formatted) return { ok: false, error: 'invalid phone' };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
  const params = new URLSearchParams();
  params.append('From', twilioWhatsAppFrom);
  params.append('To', `whatsapp:${formatted}`);
  params.append('Body', body);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}` },
    body: params
  });
  if (!res.ok) return { ok: false, status: res.status, text: await res.text() };
  return { ok: true };
}

// Helper: fetch MP payment detail
async function fetchMpPayment(paymentId) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` },
  });
  if (!res.ok) throw new Error(`MP fetch failed: ${res.status}`);
  return res.json();
}

async function createZoomMeeting(topic, startTimeIso, durationMinutes = 60, timezone = 'UTC') {
  const zoomToken = process.env.ZOOM_BEARER_TOKEN || process.env.ZOOM_JWT_TOKEN;
  const zoomUser = process.env.ZOOM_USER_ID || 'me';
  if (!zoomToken) {
    console.warn('Zoom token not configured; skipping meeting creation');
    return null;
  }

  const payload = {
    topic: topic,
    type: 2,
    start_time: startTimeIso,
    duration: Number(durationMinutes) || 60,
    timezone,
    settings: {
      join_before_host: false,
      waiting_room: true,
    }
  };

  const res = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(zoomUser)}/meetings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${zoomToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Zoom create failed', res.status, text);
    return null;
  }

  return res.json();
}

export async function handler(req, res) {
  try {
    // Mercado Pago can send different topics; sample payload may contain { id, topic }
    const body = await (async () => {
      try { return await req.json(); } catch (e) { return req.body || {}; }
    })();

    // Logging incoming payload for debugging (consider privacy)
    console.log('MP webhook received:', body);

    // Example handling: if body.id is payment id
    const paymentId = body.id || (body.data && body.data.id) || null;

    if (!paymentId) {
      console.warn('No payment id in webhook');
      res.status(400).send('No payment id');
      return;
    }

    const mpPayment = await fetchMpPayment(paymentId);

    // You need a way to map MP payment -> booking. Use `external_reference` or "preference_id" stored in bookings.marketplace_preference_id
    const preferenceId = mpPayment.preference_id || mpPayment.order?.id || mpPayment.external_reference || null;

    // Try to find booking by preference id
    let booking = null;
    if (preferenceId) {
      const { data: bookingsFound, error: bookErr } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('marketplace_preference_id', preferenceId)
        .limit(1)
        .maybeSingle();

      if (bookErr) console.error('Error querying bookings by preference', bookErr);
      booking = bookingsFound;
    }

    // Fallback: use payer email + date/amount matching if needed (implement business rules)

    // Upsert into payments table
    const paymentRecord = {
      booking_id: booking?.id || null,
      mp_payment_id: mpPayment.id?.toString() || paymentId?.toString(),
      status: mpPayment.status || mpPayment.status_detail || 'unknown',
      amount: mpPayment.transaction_amount || mpPayment.total_paid_amount || null,
      raw_payload: mpPayment,
      created_at: new Date().toISOString(),
    };

    const { error: insErr } = await supabaseAdmin.from('payments').insert([paymentRecord]);
    if (insErr) console.error('Error inserting payment record', insErr);

    // Business logic: if approved, mark booking confirmed, create Zoom and notify
    if (mpPayment.status === 'approved' || mpPayment.status === 'paid') {
      if (booking && booking.id) {
        const { error: updErr } = await supabaseAdmin.from('bookings').update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', booking.id);
        if (updErr) console.error('Error updating booking status', updErr);

        // Attempt to create Zoom meeting and save its link
        try {
          // fetch professional info to build meeting topic and duration
          const { data: prof, error: profErr } = await supabaseAdmin.from('professionals').select('*').eq('id', booking.professional_id).maybeSingle();
          if (profErr) console.error('Error fetching professional', profErr);

          // Build start time ISO (best effort; adjust timezone as needed)
          let startTimeIso = null;
          try {
            if (booking.booking_date && booking.booking_time) {
              // booking.booking_time expected like 'HH:MM' ; append seconds
              startTimeIso = new Date(`${booking.booking_date}T${booking.booking_time}:00`).toISOString();
            }
          } catch (e) { /* ignore */ }

          const topic = `Sessão - ${prof?.name || 'Profissional'}`;
          const duration = prof?.default_session_minutes || 60;

          const zoomResp = await createZoomMeeting(topic, startTimeIso || new Date().toISOString(), duration, process.env.ZOOM_TIMEZONE || 'UTC');
          if (zoomResp && zoomResp.join_url) {
            const { error: zoomUpdErr } = await supabaseAdmin.from('bookings').update({ zoom_link: zoomResp.join_url }).eq('id', booking.id);
            if (zoomUpdErr) console.error('Error saving zoom link', zoomUpdErr);
          } else {
            console.warn('Zoom meeting not created');
          }

          // TODO: send notifications (email/whatsapp) to patient and professional with zoomResp.join_url
          console.log('Payment approved and booking confirmed for', booking.id);
          // Prepare notification content
          try {
            const patientEmail = booking.user_email || booking.payer_email || booking.email || null;
            const patientPhone = booking.user_phone || booking.payer_phone || booking.phone || null;
            const profEmail = prof?.email || null;
            const profPhone = prof?.phone || null;
            const zoomLink = zoomResp?.join_url || booking.zoom_link || null;

            const subject = `Seu agendamento foi confirmado - Doxologos`;
            const html = `<p>Olá ${booking.user_name || 'Paciente'},</p>
              <p>Seu agendamento com <strong>${prof?.name || 'profissional'}</strong> em ${booking.booking_date} às ${booking.booking_time} foi confirmado.</p>
              <p><strong>Link da sessão (Zoom):</strong> <a href="${zoomLink}">${zoomLink}</a></p>
              <p>Atenciosamente,<br/>Doxologos</p>`;

            if (patientEmail) {
              const emailRes = await sendEmail(patientEmail, subject, html);
              if (!emailRes.ok) console.error('Error sending patient email', emailRes);
            }
            if (profEmail) {
              const emailRes2 = await sendEmail(profEmail, `Novo agendamento confirmado`, `<p>Olá ${prof?.name}</p><p>Você tem um novo agendamento em ${booking.booking_date} às ${booking.booking_time}. Link: <a href="${zoomLink}">${zoomLink}</a></p>`);
              if (!emailRes2.ok) console.error('Error sending professional email', emailRes2);
            }

            const waText = `Agendamento confirmado: ${prof?.name || 'Profissional'} - ${booking.booking_date} ${booking.booking_time}. Link: ${zoomLink}`;
            if (patientPhone) {
              const waRes = await sendWhatsApp(patientPhone, waText);
              if (!waRes.ok) console.error('Error sending whatsapp to patient', waRes);
            }
            if (profPhone) {
              const waRes2 = await sendWhatsApp(profPhone, waText);
              if (!waRes2.ok) console.error('Error sending whatsapp to professional', waRes2);
            }

            // Log notifications
            await supabaseAdmin.from('logs').insert([{ entity_type: 'notification', entity_id: booking.id, action: 'send_notifications', payload: { patientEmail, profEmail, patientPhone, profPhone, zoomLink }, created_at: new Date().toISOString() }]);
          } catch (notifErr) {
            console.error('Notification error', notifErr);
          }
        } catch (err) {
          console.error('Error creating zoom or notifying', err);
        }
      }
    }

    // Insert audit log
    const { error: logErr } = await supabaseAdmin.from('logs').insert([{
      entity_type: 'payment',
      entity_id: booking?.id || null,
      action: 'mp_webhook',
      performed_by: null,
      payload: body,
      created_at: new Date().toISOString(),
    }]);
    if (logErr) console.error('Error inserting log', logErr);

    res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook handler error', err);
    res.status(500).send('internal error');
  }
}

// If running in supabase edge functions (Deno), export default
export default handler;
