import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function check() {
    let output = '=== DIAGNOSTIC REPORT ===\n\n';

    const { count } = await supabase.from('payment_ledger_entries').select('*', { count: 'exact', head: true });
    output += `Total ledger entries: ${count}\n`;

    const { data: raw } = await supabase.from('payment_ledger_entries').select('created_at, amount, account_code');
    output += `Raw count returned without limit: ${raw?.length}\n`;
    if (raw && raw.length > 0) {
        output += `Newest in raw limit test: ${raw[0].created_at}\n`;
        output += `Oldest in raw limit test: ${raw[raw.length - 1].created_at}\n\n`;
    }

    const { data: paidBookings } = await supabase.from('bookings')
        .select('id, status, booking_date')
        .in('status', ['paid', 'completed', 'confirmed'])
        .gte('booking_date', '2026-03-01')
        .order('booking_date', { ascending: false });

    output += `Total paid/completed/confirmed bookings since March 1st: ${paidBookings?.length || 0}\n`;

    if (paidBookings?.length > 0) {
        const { data: ledgerBindings } = await supabase.from('payment_ledger_entries')
            .select('metadata')
            .gte('created_at', '2026-03-01');

        const ledgerBookingIds = new Set(ledgerBindings?.map(e => e.metadata?.booking_id).filter(Boolean) || []);
        const missing = paidBookings.filter(b => !ledgerBookingIds.has(b.id));

        output += `Bookings missing from ledger: ${missing.length}\n`;
        if (missing.length > 0) {
            output += `Samples missing from ledger: ${JSON.stringify(missing.slice(0, 5), null, 2)}\n`;
        }
    }

    // Also check platform costs directly
    const { data: costs } = await supabase.from('platform_costs').select('*').gte('cost_date', '2026-03-01');
    output += `\nTotal platform costs registered since March 1st: ${costs?.length || 0}\n`;

    fs.writeFileSync('diagnostic_output.txt', output);
    console.log('Done reporting to diagnostic_output.txt');
}

check().catch(console.error);
