import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

// Helper para garantir conversão numérica segura
const safeParseFloat = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'string') {
        if (value.includes(',') && !value.includes('.')) {
            value = value.replace(',', '.');
        }
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * Hook para calcular receita da plataforma usando payment_ledger_entries
 * 
 * Este hook usa o Livro Caixa (payment_ledger_entries) como fonte única de verdade
 * para dados financeiros, garantindo consistência com o Ledger.
 * 
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 */
export function usePlatformRevenueFromLedger(startDate = null, endDate = null) {
    const [data, setData] = useState({
        totalRevenue: 0,
        totalPayouts: 0,
        platformMargin: 0,
        marginPercentage: 0,
        bookingsCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRevenue = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Query base para o ledger
            // Buscar apenas entradas CREDIT (receitas e obrigações)
            let query = supabase
                .from('payment_ledger_entries')
                .select('*')
                .eq('entry_type', 'CREDIT');

            if (startDate) {
                query = query.gte('created_at', `${startDate}T00:00:00`);
            }
            if (endDate) {
                query = query.lte('created_at', `${endDate}T23:59:59`);
            }

            const { data: entries, error: entriesError } = await query;

            if (entriesError) throw entriesError;

            console.log('📊 Ledger entries fetched:', entries?.length || 0);

            // Separar por tipo de conta
            const revenueEntries = (entries || []).filter(
                e => e.account_code === 'REVENUE_SERVICE'
            );
            const payoutEntries = (entries || []).filter(
                e => e.account_code === 'LIABILITY_PROFESSIONAL'
            );

            console.log('💰 Revenue entries:', revenueEntries.length, 'Payout entries:', payoutEntries.length);

            // Calcular totais
            const totalRevenue = revenueEntries.reduce((sum, entry) =>
                sum + safeParseFloat(entry.amount), 0
            );

            const totalPayouts = payoutEntries.reduce((sum, entry) =>
                sum + safeParseFloat(entry.amount), 0
            );

            const platformMargin = totalRevenue - totalPayouts;
            const marginPercentage = totalRevenue > 0
                ? (platformMargin / totalRevenue) * 100
                : 0;

            // Contar bookings únicos (via transaction_id)
            const uniqueTransactions = new Set(
                revenueEntries
                    .map(e => e.transaction_id)
                    .filter(Boolean)
            );

            console.log('📈 Calculated:', {
                totalRevenue,
                totalPayouts,
                platformMargin,
                marginPercentage: marginPercentage.toFixed(2) + '%',
                bookingsCount: uniqueTransactions.size
            });

            setData({
                totalRevenue,
                totalPayouts,
                platformMargin,
                marginPercentage,
                bookingsCount: uniqueTransactions.size,
            });
        } catch (err) {
            console.error('❌ Error fetching revenue from ledger:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchRevenue();
    }, [fetchRevenue]);

    return { ...data, loading, error, refresh: fetchRevenue };
}

export default usePlatformRevenueFromLedger;
