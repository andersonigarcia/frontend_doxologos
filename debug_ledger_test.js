// DEBUG: Teste direto do hook usePlatformRevenueFromLedger
// Cole este código no console do navegador para testar

import { supabase } from '@/lib/customSupabaseClient';

async function testLedgerQuery() {
    console.log('🔍 Testando query do ledger...');

    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log('📅 Período:', startDateStr, 'até', endDateStr);

    // Query exata do hook
    const { data: entries, error } = await supabase
        .from('payment_ledger_entries')
        .select('*')
        .eq('entry_type', 'CREDIT')
        .gte('created_at', `${startDateStr}T00:00:00`)
        .lte('created_at', `${endDateStr}T23:59:59`);

    if (error) {
        console.error('❌ Erro:', error);
        return;
    }

    console.log('📊 Total de entradas:', entries?.length || 0);

    const revenueEntries = entries.filter(e => e.account_code === 'REVENUE_SERVICE');
    const payoutEntries = entries.filter(e => e.account_code === 'LIABILITY_PROFESSIONAL');

    console.log('💰 Revenue entries:', revenueEntries.length);
    console.log('💸 Payout entries:', payoutEntries.length);

    const totalRevenue = revenueEntries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalPayouts = payoutEntries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    console.log('📈 Resultados:');
    console.log('  - Receita Total:', totalRevenue);
    console.log('  - Repasses Total:', totalPayouts);
    console.log('  - Margem:', totalRevenue - totalPayouts);

    return { totalRevenue, totalPayouts, margin: totalRevenue - totalPayouts };
}

// Executar teste
testLedgerQuery();
