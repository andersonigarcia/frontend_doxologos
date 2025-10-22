// Supabase Edge Function (Deno) - mp-create-preference
declare const Deno: any;
// Expects env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MP_ACCESS_TOKEN, MP_BACK_* optionally

export async function handler(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const booking_id = body.booking_id;
    const payer = body.payer || {};
    if (!booking_id) return new Response(JSON.stringify({ error: 'booking_id required' }), { status: 400 });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') || '';

    // fetch booking and service price
    const bookingRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?select=*,services:service_id(*)&id=eq.${booking_id}`, {
      headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}` }
    });
    if (!bookingRes.ok) return new Response('booking lookup failed', { status: 500 });
    const bookings = await bookingRes.json();
    const booking = bookings[0];
    if (!booking) return new Response(JSON.stringify({ error: 'booking not found' }), { status: 404 });

    const amount = booking.services?.price || 0;
    const preference = {
      items: [{ title: `Consulta - ${booking_id}`, quantity: 1, unit_price: Number(amount), currency_id: 'BRL' }],
      external_reference: booking_id,
      payer,
      back_urls: {
        success: Deno.env.get('MP_BACK_SUCCESS') || '',
        failure: Deno.env.get('MP_BACK_FAILURE') || '',
        pending: Deno.env.get('MP_BACK_PENDING') || ''
      },
      auto_return: 'approved'
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(preference)
    });
    if (!mpRes.ok) {
      const txt = await mpRes.text();
      return new Response(JSON.stringify({ error: 'mercadopago error', details: txt }), { status: 502 });
    }
    const mpJson = await mpRes.json();

    // update booking marketplace_preference_id
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking_id}`, {
      method: 'PATCH',
      headers: { 'apikey': SERVICE_ROLE, 'Authorization': `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify({ marketplace_preference_id: mpJson.id })
    });

    return new Response(JSON.stringify({ init_point: mpJson.init_point, preference_id: mpJson.id, mp: mpJson }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'internal error' }), { status: 500 });
  }
}

export default handler;
