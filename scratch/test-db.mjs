import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppwjtvzrhvjinsutrjwk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwd2p0dnpyaHZqaW5zdXRyandrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDkzOTc0NiwiZXhwIjoyMDc2NTE1NzQ2fQ.ZEXoqtDtCI8X6688HaMdLBdDBwnqE5Vez4sehKvnDss';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Fixing patient_notes...');
    const { data, error } = await supabase
        .from('patient_notes')
        .update({
            chief_complaint: null,
            session_development: null,
            homework: null,
            homework_visible_to_patient: false,
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // clear all rows just in case

    if (error) console.error('Error fixing:', error);
    else console.log('Fixed successfully');
}

test();
