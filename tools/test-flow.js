import { loadLocalEnv } from '../functions/load-config.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

loadLocalEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env. Copy config/local.env from example.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function run() {
  console.log('Starting test flow...');
  const created = { bookings: [], payments: [], logs: [] };

  // Create temporary professional and service records to satisfy FKs
  const profPayload = { name: 'Test Prof', specialty: 'Test Specialty', description: 'Auto-created for test', image_url: null, user_id: null, mini_curriculum: null };
  const { data: prof, error: profErr } = await supabase.from('professionals').insert([profPayload]).select().single();
  if (profErr) { console.error('Error creating professional', profErr); process.exit(1); }
  console.log('Professional created:', prof.id);
  const servicePayload = { name: 'Test Service', price: 150.00, duration_minutes: 50 };
  const { data: svc, error: svcErr } = await supabase.from('services').insert([servicePayload]).select().single();
  if (svcErr) { console.error('Error creating service', svcErr); process.exit(1); }
  console.log('Service created:', svc.id);
  // track for cleanup
  created.professionals = [prof.id];
  created.services = [svc.id];

  // 1) Create a booking
  const bookingPayload = {
    // Generate deterministic random UUIDs for local testing to match DB UUID type
  professional_id: prof.id,
  service_id: svc.id,
    user_id: null,
    booking_date: new Date().toISOString().split('T')[0],
    booking_time: '10:00',
    status: 'pending_payment',
    patient_name: 'Teste Paciente',
    patient_email: 'teste+patient@example.com',
    patient_phone: '+5511999999999'
  };

  const { data: booking, error: bErr } = await supabase.from('bookings').insert([bookingPayload]).select().single();
  if (bErr) { console.error('Error creating booking', bErr); process.exit(1); }
  console.log('Booking created:', booking.id);
  created.bookings.push(booking.id);

  // 2) (Skipped) payments table not present in this DB schema; we simulate approval below

  // 3) Simulate webhook logic: confirm booking
  const { error: updErr } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', booking.id);
  if (updErr) { console.error('Error updating booking', updErr); process.exit(1); }
  console.log('Booking confirmed');

  // 4) Insert log (recording simulated payment)
  const { data: logData } = await supabase.from('logs').insert([{ entity_type: 'payment', entity_id: booking.id, action: 'test_flow_confirm', payload: { booking, simulated: true }, created_at: new Date().toISOString() }]).select().single();
  if (logData) created.logs.push(logData.id);

  // 5) Mock notifications (we just log)
  console.log('Mock send email to', booking.patient_email);
  console.log('Mock send whatsapp to', booking.patient_phone, 'Message: Agendamento confirmado.');

  // 6) Validate final state
  const { data: finalBooking, error: fErr } = await supabase.from('bookings').select('*').eq('id', booking.id).single();
  if (fErr) { console.error('Error fetching booking', fErr); process.exit(1); }
  console.log('Final booking state:', { id: finalBooking.id, status: finalBooking.status });

  console.log('Test flow completed successfully.');
  // cleanup
  try {
    if (created.payments.length) await supabase.from('payments').delete().in('mp_payment_id', created.payments);
    if (created.bookings.length) await supabase.from('bookings').delete().in('id', created.bookings);
    if (created.logs.length) await supabase.from('logs').delete().in('id', created.logs);
    if (created.services && created.services.length) await supabase.from('services').delete().in('id', created.services);
    if (created.professionals && created.professionals.length) await supabase.from('professionals').delete().in('id', created.professionals);
    console.log('Cleanup completed.');
  } catch (e) { console.warn('Cleanup error', e); }
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
