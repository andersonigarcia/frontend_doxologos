import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { sumMoney, toCents, fromCents } from '@/lib/money';
import { usePlatformRevenueFromLedger } from './usePlatformRevenueFromLedger';

// M-01: safeParseFloat substituído por sumMoney/toCents de money.js

export function usePlatformCosts(startDate = null, endDate = null, category = null) {
    const [data, setData] = useState({
        costs: [],
        totalCosts: 0,
        costsByCategory: {},
        recurringCosts: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchCosts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let query = supabase
                .from('platform_costs')
                .select('*')
                .order('cost_date', { ascending: false })
                .limit(10000);

            if (startDate) query = query.gte('cost_date', startDate);
            if (endDate) query = query.lte('cost_date', endDate);
            if (category) query = query.eq('category', category);

            const { data: costs, error: costsError } = await query;
            if (costsError) throw costsError;

            // M-01: soma via centavos para evitar erros IEEE 754
            const totalCosts = sumMoney(costs || [], c => c.amount);

            const costsByCategory = (costs || []).reduce((acc, cost) => {
                const cat = cost.category || 'other';
                if (!acc[cat]) acc[cat] = { total: 0, count: 0, items: [] };
                acc[cat].total = fromCents(toCents(acc[cat].total) + toCents(cost.amount));
                acc[cat].count += 1;
                acc[cat].items.push(cost);
                return acc;
            }, {});

            const recurringCosts = sumMoney(
                (costs || []).filter(c => c.is_recurring),
                c => c.amount
            );

            setData({ costs: costs || [], totalCosts, costsByCategory, recurringCosts });
        } catch (err) {
            console.error('Error fetching costs:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, category]);

    useEffect(() => { fetchCosts(); }, [fetchCosts]);

    return { ...data, loading, error, refresh: fetchCosts };
}

export function usePlatformRevenue(startDate = null, endDate = null) {
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
                .from('bookings')
                .select('valor_consulta, valor_repasse_profissional, status')
                .in('status', ['confirmed', 'paid', 'completed']);

            if (startDate) query = query.gte('booking_date', startDate);
            if (endDate) query = query.lte('booking_date', endDate);

            const { data: bookings, error: bookingsError } = await query;
            if (bookingsError) throw bookingsError;

            // M-01: soma via centavos
            const totalRevenueCents = (bookings || []).reduce((s, b) => s + toCents(b.valor_consulta), 0);
            const totalPayoutsCents = (bookings || []).reduce((s, b) => s + toCents(b.valor_repasse_profissional), 0);
            const platformMarginCents = totalRevenueCents - totalPayoutsCents;

            const totalRevenue = fromCents(totalRevenueCents);
            const totalPayouts = fromCents(totalPayoutsCents);
            const platformMargin = fromCents(platformMarginCents);
            const marginPercentage = totalRevenueCents > 0
                ? (platformMarginCents / totalRevenueCents) * 100
                : 0;

            setData({ totalRevenue, totalPayouts, platformMargin, marginPercentage, bookingsCount: (bookings || []).length });
        } catch (err) {
            console.error('Error fetching revenue:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

    return { ...data, loading, error, refresh: fetchRevenue };
}

export function useProfitLoss(startDate = null, endDate = null) {
    const revenue = usePlatformRevenueFromLedger(startDate, endDate);
    const costs = usePlatformCosts(startDate, endDate);

    // M-01: usa centavos para o cálculo final
    const profitLossCents = toCents(revenue.platformMargin) - toCents(costs.totalCosts);
    const profitLoss = fromCents(profitLossCents);
    const profitMargin = toCents(revenue.totalRevenue) > 0
        ? (profitLossCents / toCents(revenue.totalRevenue)) * 100
        : 0;
    const isProfitable = profitLoss > 0;

    return {
        totalRevenue: revenue.totalRevenue,
        totalPayouts: revenue.totalPayouts,
        platformMargin: revenue.platformMargin,
        marginPercentage: revenue.marginPercentage,
        totalCosts: costs.totalCosts,
        costsByCategory: costs.costsByCategory,
        profitLoss,
        profitMargin,
        isProfitable,
        loading: revenue.loading || costs.loading,
        error: revenue.error || costs.error,
        refresh: () => { revenue.refresh(); costs.refresh(); }
    };
}

export { usePlatformRevenueFromLedger } from './usePlatformRevenueFromLedger';

export default useProfitLoss;
