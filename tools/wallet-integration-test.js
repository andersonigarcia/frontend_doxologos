import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'config/local.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

async function run() {
    console.log('--- STARTING WALLET INTEGRATION TEST ---');
    
    // 1. Create a dummy auth user (Patient)
    console.log('1. Creating test patient in auth...');
    const email = `test.patient.${Date.now()}@example.com`;
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true
    });
    
    if (authErr) {
        console.error('Error creating user:', authErr);
        process.exit(1);
    }
    const patientId = authData.user.id;
    console.log(`✅ User created: ${patientId} (${email})`);

    // 1b. Make sure patient wallet exists and add balance
    console.log('2. Adding funds to wallet via RPC...');
    const { data: walletData, error: walletErr } = await supabase.rpc('process_wallet_transaction', {
        p_patient_id: patientId,
        p_amount: 150.00,
        p_type: 'admin_adjustment',
        p_description: 'Test funds'
    });
    if (walletErr) {
        console.error('Error adding funds to wallet:', walletErr);
        // cleanup
        await supabase.auth.admin.deleteUser(patientId);
        process.exit(1);
    }
    console.log(`✅ Funds added. New balance: R$ ${walletData.new_balance}`);

    // 3. Create Professional and Service
    console.log('3. Creating test professional and service...');
    const { data: prof, error: profErr } = await supabase.from('professionals').insert([{
        name: 'Test Prof', specialty: 'Test', description: 'Test', user_id: patientId
    }]).select().single();
    
    if (profErr) { console.error('Error Prof:', profErr); process.exit(1); }
    
    const { data: svc, error: svcErr } = await supabase.from('services').insert([{
        name: 'Test Service', price: 100.00, duration_minutes: 50
    }]).select().single();
    
    if (svcErr) { console.error('Error Svc:', svcErr); process.exit(1); }
    console.log(`✅ Professional (${prof.id}) and Service (${svc.id}) created.`);

    // 4. Create Booking
    console.log('4. Creating test booking...');
    const { data: booking, error: bErr } = await supabase.from('bookings').insert([{
        professional_id: prof.id,
        service_id: svc.id,
        user_id: patientId,
        booking_date: new Date().toISOString().split('T')[0],
        booking_time: '10:00',
        status: 'pending_payment',
        patient_name: 'Teste Paciente',
        patient_email: email,
        patient_phone: '+5511999999999'
    }]).select().single();
    
    if (bErr) { console.error('Error booking:', bErr); process.exit(1); }
    console.log(`✅ Booking created: ${booking.id}`);

    // 5. Test deducting partial funds from wallet for booking
    console.log('5. Testing Wallet Deduction for booking...');
    const { data: dedData, error: dedErr } = await supabase.rpc('process_wallet_transaction', {
        p_patient_id: patientId,
        p_amount: -50.00,
        p_type: 'debit_payment',
        p_description: 'Pagamento Parcial',
        p_booking_id: booking.id
    });
    
    if (dedErr) {
        console.error('Error deducting funds:', dedErr);
    } else {
        console.log(`✅ Funds deducted successfully. Remaining balance: R$ ${dedData.new_balance}`);
    }

    // 6. Cleanup
    console.log('6. Cleaning up...');
    await supabase.from('bookings').delete().eq('id', booking.id);
    await supabase.from('services').delete().eq('id', svc.id);
    await supabase.from('professionals').delete().eq('id', prof.id);
    await supabase.auth.admin.deleteUser(patientId); // Will cascade delete wallet and transactions
    
    console.log('✅ Cleanup successful.');
    console.log('--- TEST FINISHED SUCCESSFULLY ---');
}

run().catch(console.error);
