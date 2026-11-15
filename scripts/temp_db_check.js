import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    console.log('--- LEDGER ENTRIES LIMIT TEST ---');
    const { count } = await supabase.from('payment_ledger_entries').select('*', { count: 'exact', head: true });
    console.log('Total entries:', count);

    const { data: raw } = await supabase.from('payment_ledger_entries').select('created_at, amount, account_code');
    console.log('Raw count returned without limit:', raw?.length);
    if (raw && raw.length > 0) {
        console.log('Newest in raw limit test:', raw[0].created_at);
        console.log('Oldest in raw limit test:', raw[raw.length - 1].created_at);
    }

    console.log('\n--- BOOKINGS MISSING FROM LEDGER (paid/completed) ---');
    const { data: paidBookings } = await supabase.from('bookings')
        .select('id, status, booking_date, valor_consulta')
        .in('status', ['paid', 'completed', 'confirmed'])
        .gte('booking_date', '2026-03-01')
        .order('booking_date', { ascending: false });

    // Try to find if ledger has these
    const bookingIds = paidBookings?.map(b => b.id) || [];
    let foundInLedger = [];
    if (bookingIds.length > 0) {
        const { data: ledgerBindings } = await supabase.from('payment_ledger_entries')
            .select('metadata')
            .not('metadata', 'is', null);

        const ledgerBookingIds = new Set(ledgerBindings?.map(e => e.metadata?.booking_id).filter(Boolean) || []);
        const missing = paidBookings.filter(b => !ledgerBookingIds.has(b.id));

        console.log(`Out of ${paidBookings.length} paid/confirmed bookings in March, ${missing.length} are missing from ledger.`);
        console.table(missing.slice(0, 10));
    } else {
        console.log('No paid/confirmed bookings found in March.');
    }

}

check().catch(console.error);
