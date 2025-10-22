import { loadLocalEnv } from '../functions/load-config.js';
import fetch from 'node-fetch';

loadLocalEnv();

// Usage:
// set FUNCTION_CREATE_URL and FUNCTION_WEBHOOK_URL in config/local.env or pass as env
// then run: node tools/e2e-flow.js

const CREATE_URL = process.env.FUNCTION_CREATE_URL; // e.g. https://<project>.functions.supabase.co/mp-create-preference
const WEBHOOK_URL = process.env.FUNCTION_WEBHOOK_URL; // e.g. https://<project>.functions.supabase.co/mp-webhook

if (!CREATE_URL || !WEBHOOK_URL) {
  console.error('Set FUNCTION_CREATE_URL and FUNCTION_WEBHOOK_URL in config/local.env');
  process.exit(1);
}

async function run() {
  console.log('Starting E2E flow...');

  // 1) create a temporary booking in Supabase via REST using service role (or reuse existing booking id)
  // For simplicity, we'll assume booking already exists and we know its id. Alternatively this script could use the SUPABASE_SERVICE_ROLE to create it.

  const testBookingId = process.env.TEST_BOOKING_ID;
  if (!testBookingId) {
    console.error('Set TEST_BOOKING_ID in env to point to a booking to use for the E2E test');
    process.exit(1);
  }

  // 2) Call create_preference
  const createResp = await fetch(CREATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_id: testBookingId, payer: { email: 'e2e+test@example.com', name: 'E2E Test' } })
  });

  if (!createResp.ok) { console.error('create_preference failed', await createResp.text()); process.exit(1); }
  const createJson = await createResp.json();
  console.log('create_preference response:', createJson);

  // 3) Simulate Mercado Pago webhook by POSTing to webhook URL with a fake payment id
  const fakePaymentId = `E2E_MP_${Date.now()}`;
  const webhookResp = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: fakePaymentId })
  });
  console.log('webhook status', webhookResp.status);
  console.log('E2E flow finished. Check Supabase for booking/payment updates.');
}

run().catch(err => { console.error(err); process.exit(1); });
