// Supabase Edge Function - create Mercado Pago preference (esboço)
// Location: functions/mp-create-preference/index.js
// Env required: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;

import { loadLocalEnv } from '../load-config.js';
loadLocalEnv();

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });

export default async function handler(req, res) {
  try {
    const body = await req.json();
    const { booking_id, payer } = body;
    if (!booking_id) return res.status(400).json({ error: 'booking_id required' });

    // Load booking and service price
    const { data: booking, error: bookErr } = await supabaseAdmin
      .from('bookings')
      .select('*, services:service_id(*)')
      .eq('id', booking_id)
      .maybeSingle();

    if (bookErr) return res.status(500).json({ error: 'error fetching booking' });
    if (!booking) return res.status(404).json({ error: 'booking not found' });

    const amount = booking.services?.price || 0;

    // Create preference payload
    const preference = {
      items: [
        {
          title: `Consulta - ${booking_id}`,
          quantity: 1,
          unit_price: Number(amount),
          currency_id: 'BRL',
        }
      ],
      external_reference: booking_id, // helpful to map back
      payer: payer || {},
      back_urls: {
        success: process.env.MP_BACK_SUCCESS || '',
        failure: process.env.MP_BACK_FAILURE || '',
        pending: process.env.MP_BACK_PENDING || ''
      },
      auto_return: 'approved'
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    if (!mpRes.ok) {
      const txt = await mpRes.text();
      console.error('MP preference failed', txt);
      return res.status(502).json({ error: 'mercadopago error', details: txt });
    }

    const mpJson = await mpRes.json();

    // Update booking with marketplace_preference_id
    const { error: updErr } = await supabaseAdmin.from('bookings').update({ marketplace_preference_id: mpJson.id }).eq('id', booking_id);
    if (updErr) console.error('Error updating booking with preference', updErr);

    return res.status(200).json({ init_point: mpJson.init_point, preference_id: mpJson.id, mp: mpJson });
  } catch (err) {
    console.error('create preference error', err);
    return res.status(500).json({ error: 'internal error' });
  }
}
