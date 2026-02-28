import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toCents, fromCents } from '@/lib/money';

// M-01: safeParseFloat substituído por toCents/fromCents de money.js

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

            let query = supabase
                .from('payment_ledger_entries')
                .select('*')
                .eq('entry_type', 'CREDIT');

            if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`);
            if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);

            const { data: entries, error: entriesError } = await query;
            if (entriesError) throw entriesError;

            const revenueEntries = (entries || []).filter(e => e.account_code === 'REVENUE_SERVICE');
            const payoutEntries = (entries || []).filter(e => e.account_code === 'LIABILITY_PROFESSIONAL');

            // REVENUE_SERVICE  = comissão da plataforma (ex: 40% = R$60)
            // LIABILITY_PROFESSIONAL = repasse ao profissional (ex: 60% = R$90)
            // grossRevenue = valor total pago pelo cliente = R$60 + R$90 = R$150
            const platformRevenueCents = revenueEntries.reduce((s, e) => s + toCents(e.amount), 0);
            const totalPayoutsCents = payoutEntries.reduce((s, e) => s + toCents(e.amount), 0);
            const grossRevenueCents = platformRevenueCents + totalPayoutsCents;

            // platformMargin = comissão da plataforma (não subtrair LIABILITY — é dinheiro do profissional)
            const totalRevenue = fromCents(grossRevenueCents);
            const totalPayouts = fromCents(totalPayoutsCents);
            const platformMargin = fromCents(platformRevenueCents);
            const marginPercentage = grossRevenueCents > 0
                ? (platformRevenueCents / grossRevenueCents) * 100
                : 0;


            const uniqueTransactions = new Set(
                revenueEntries.map(e => e.transaction_id).filter(Boolean)
            );

            setData({ totalRevenue, totalPayouts, platformMargin, marginPercentage, bookingsCount: uniqueTransactions.size });
        } catch (err) {
            console.error('❌ Error fetching revenue from ledger:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

    return { ...data, loading, error, refresh: fetchRevenue };
}

export default usePlatformRevenueFromLedger;
