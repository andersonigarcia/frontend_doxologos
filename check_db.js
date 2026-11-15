import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data, error } = await supabase
        .from('patient_notes')
        .select('*')
        .limit(1);
    
    console.log('patient_notes columns:', data ? Object.keys(data[0] || {}) : 'No data');
    const { data: constraintData, error: constraintError } = await supabase.rpc('get_constraints', {});
    
    const { data: profs } = await supabase.from('professionals').select('id').limit(1);
    if (!profs || !profs.length) return console.log('No profs');
    const profId = profs[0].id;
    
    const upsertPayload = {
        professional_id: profId,
        patient_email: 'test@test.com',
        notes: 'test'
    };

    const { error: upsertErr } = await supabase
        .from('patient_notes')
    const { data: policies, error: polErr } = await supabase
        .from('patient_notes')
        .select('*'); // This won't show RLS policies directly easily, we need RPC or postgres access.

