import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { computeLedgerRevenueSummary } from '@/services/ledgerService';

const PAGE_SIZE = 1000;

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

            const entries = [];
            for (let from = 0; ; from += PAGE_SIZE) {
                let query = supabase
                    .from('payment_ledger_entries')
                    .select('transaction_id, entry_type, account_code, amount, created_at')
                    .in('account_code', ['REVENUE_SERVICE', 'REVENUE_CANCELLATION_FEE', 'LIABILITY_PROFESSIONAL'])
                    .order('created_at', { ascending: true })
                    .range(from, from + PAGE_SIZE - 1);

                if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`);
                if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);

                const { data: pageRows, error: entriesError } = await query;
                if (entriesError) throw entriesError;

                entries.push(...(pageRows || []));
                if (!pageRows || pageRows.length < PAGE_SIZE) break;
            }

            setData(computeLedgerRevenueSummary(entries));
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
