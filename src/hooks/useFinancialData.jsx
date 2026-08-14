import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toCents, fromCents, sumMoney } from '@/lib/money';

export function useFinancialData(professionalId, startDate, endDate) {
    const [data, setData] = useState({
        dailyRevenue: 0,
        weeklyRevenue: 0,
        monthlyRevenue: 0,
        gmv: 0,
        payoutTotal: 0,
        mpFees: 0,
        nfseTaxes: 0,
        platformGrossMargin: 0,
        netMargin: 0,
        takeRatePct: 20,
        pendingPayments: [],
        serviceBreakdown: [],
        totalPending: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!professionalId || !startDate || !endDate) {
            setData({
                dailyRevenue: 0,
                weeklyRevenue: 0,
                monthlyRevenue: 0,
                gmv: 0,
                payoutTotal: 0,
                mpFees: 0,
                nfseTaxes: 0,
                platformGrossMargin: 0,
                netMargin: 0,
                takeRatePct: 20,
                pendingPayments: [],
                serviceBreakdown: [],
                totalPending: 0
            });
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('*, service:services(name, price, professional_payout)')
                .eq('professional_id', professionalId)
                .gte('booking_date', startDate)
                .lte('booking_date', endDate);

            if (bookingsError) throw bookingsError;

            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekAgoStr = weekAgo.toISOString().split('T')[0];

            const confirmed = (bookings || []).filter(b => ['confirmed', 'paid', 'completed', 'no_show_unjustified'].includes(b.status));

            // Somas via centavos
            const dailyRevenue = sumMoney(confirmed.filter(b => b.booking_date === today), b => b.valor_repasse_profissional ?? b.service?.professional_payout);
            const weeklyRevenue = sumMoney(confirmed.filter(b => b.booking_date >= weekAgoStr), b => b.valor_repasse_profissional ?? b.service?.professional_payout);
            const monthlyRevenue = sumMoney(confirmed, b => b.valor_repasse_profissional ?? b.service?.professional_payout);

            // DRE Consolidada
            const gmv = sumMoney(confirmed, b => b.valor_consulta ?? b.service?.price ?? 0);
            const payoutTotal = monthlyRevenue;
            const platformGrossMargin = Math.max(0, gmv - payoutTotal);
            const mpFees = gmv * 0.0299; // Taxa estimada MP (2.99%)
            const nfseTaxes = gmv * 0.06; // Impostos estimados (6%)
            const netMargin = Math.max(0, platformGrossMargin - mpFees - nfseTaxes);
            const takeRatePct = gmv > 0 ? (platformGrossMargin / gmv) * 100 : 20;

            const pendingPayments = (bookings || [])
                .filter(b => ['pending', 'pending_payment', 'awaiting_payment'].includes(b.status))
                .sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date));

            const totalPending = sumMoney(pendingPayments, b => b.valor_repasse_profissional ?? b.service?.professional_payout);

            // Service breakdown via centavos
            const serviceMap = {};
            confirmed.forEach(b => {
                const name = b.service?.name || 'Sem serviço';
                if (!serviceMap[name]) serviceMap[name] = { name, revenueCents: 0, count: 0 };
                serviceMap[name].revenueCents += toCents(b.valor_repasse_profissional ?? b.service?.professional_payout ?? 0);
                serviceMap[name].count += 1;
            });

            const serviceBreakdown = Object.values(serviceMap)
                .map(s => ({ ...s, revenue: fromCents(s.revenueCents) }))
                .sort((a, b) => b.revenueCents - a.revenueCents);

            setData({
                dailyRevenue,
                weeklyRevenue,
                monthlyRevenue,
                gmv,
                payoutTotal,
                mpFees,
                nfseTaxes,
                platformGrossMargin,
                netMargin,
                takeRatePct,
                pendingPayments,
                serviceBreakdown,
                totalPending
            });
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
