import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toCents, fromCents, sumMoney } from '@/lib/money';

// M-01: parseFloat substituído por toCents/fromCents/sumMoney de money.js

export function useFinancialData(professionalId, startDate, endDate) {
    const [data, setData] = useState({
        dailyRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        pendingPayments: [],
        serviceBreakdown: [],
        totalPending: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!professionalId || !startDate || !endDate) {
            setData({ dailyRevenue: 0, weeklyRevenue: 0, monthlyRevenue: 0, pendingPayments: [], serviceBreakdown: [], totalPending: 0 });
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('*, service:services(name, price)')
                .eq('professional_id', professionalId)
                .gte('booking_date', startDate)
                .lte('booking_date', endDate);

            if (bookingsError) throw bookingsError;

            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekAgoStr = weekAgo.toISOString().split('T')[0];

            const confirmed = (bookings || []).filter(b => ['confirmed', 'paid', 'completed', 'no_show_unjustified'].includes(b.status));

            // M-01: somas via centavos
            const dailyRevenue = sumMoney(confirmed.filter(b => b.booking_date === today), b => b.valor_repasse_profissional);
            const weeklyRevenue = sumMoney(confirmed.filter(b => b.booking_date >= weekAgoStr), b => b.valor_repasse_profissional);
            const monthlyRevenue = sumMoney(confirmed, b => b.valor_repasse_profissional);

            const pendingPayments = (bookings || [])
                .filter(b => ['pending', 'pending_payment', 'awaiting_payment'].includes(b.status))
                .sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date));

            const totalPending = sumMoney(pendingPayments, b => b.valor_repasse_profissional);

            // Service breakdown via centavos
            const serviceMap = {};
            confirmed.forEach(b => {
                const name = b.service?.name || 'Sem serviço';
                if (!serviceMap[name]) serviceMap[name] = { name, revenueCents: 0, count: 0 };
                serviceMap[name].revenueCents += toCents(b.valor_repasse_profissional);
                serviceMap[name].count += 1;
            });

            const serviceBreakdown = Object.values(serviceMap)
                .map(s => ({ ...s, revenue: fromCents(s.revenueCents) }))
                .sort((a, b) => b.revenueCents - a.revenueCents);

            setData({ dailyRevenue, weeklyRevenue, monthlyRevenue, pendingPayments, serviceBreakdown, totalPending });
        } catch (err) {
            console.error('Error fetching financial data:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [professionalId, startDate, endDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    return { ...data, loading, error, refresh: fetchData };
}

export default useFinancialData;
