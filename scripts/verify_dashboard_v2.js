import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('❌ Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.');
    process.exit(1);
}

const supabase = createClient(url, key);

async function verify() {
    console.log('🔍 Testando chamada para get_dashboard_summary_v2...');
    const { data: summary, error: summaryError } = await supabase.rpc('get_dashboard_summary_v2', { days_limit: 30 });
    
    if (summaryError) {
        console.error('❌ Erro ao chamar get_dashboard_summary_v2:', summaryError);
    } else {
        console.log('✅ get_dashboard_summary_v2 retornou com sucesso:');
        console.log(JSON.stringify(summary, null, 2));
    }

    console.log('\n🔍 Testando chamada para get_conversion_funnel...');
    const { data: funnel, error: funnelError } = await supabase.rpc('get_conversion_funnel', { days_limit: 30 });
    if (funnelError) {
        console.error('❌ Erro ao chamar get_conversion_funnel:', funnelError);
    } else {
        console.log('✅ get_conversion_funnel retornou com sucesso:');
        console.log(JSON.stringify(funnel, null, 2));
    }

    console.log('\n🔍 Testando chamada para get_pending_alerts...');
    const { data: alerts, error: alertsError } = await supabase.rpc('get_pending_alerts');
    if (alertsError) {
        console.error('❌ Erro ao chamar get_pending_alerts:', alertsError);
    } else {
        console.log('✅ get_pending_alerts retornou com sucesso:');
        console.log(JSON.stringify(alerts, null, 2));
    }
}

verify().catch(console.error);
