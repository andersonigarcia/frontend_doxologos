import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toCents, fromCents, sumMoney } from '@/lib/money';

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
            setData({
                dailyRevenue: 0,
                weeklyRevenue: 0,
                monthlyRevenue: 0,
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

            // 2. Buscar uso de IA e deduções do período
            let aiUsageEntries = [];
            try {
                const { data: aiData, error: aiError } = await supabase
                    .from('ai_usage_ledger')
                    .select('id, booking_id, is_trial, add_on_amount, technical_cost, billing_status, created_at')
                    .eq('professional_id', professionalId)
                    .gte('created_at', `${startDate}T00:00:00`)
                    .lte('created_at', `${endDate}T23:59:59`);

                if (!aiError && aiData) {
                    aiUsageEntries = aiData;
                }
            } catch (aiErr) {
                console.warn('[useFinancialData] Tabela ai_usage_ledger inacessível:', aiErr);
            }

            // 3. Buscar limites e degustação do profissional
            let profInfo = null;
            try {
                const { data: pData } = await supabase
                    .from('professionals')
                    .select('ai_copilot_enabled, ai_trial_sessions_used, ai_trial_limit')
                    .eq('id', professionalId)
                    .maybeSingle();
                profInfo = pData;
            } catch (pErr) {
                console.warn('[useFinancialData] Erro ao buscar dados de trial:', pErr);
            }

            const paidAiSessions = aiUsageEntries.filter(e => !e.is_trial);
            const trialAiSessions = aiUsageEntries.filter(e => e.is_trial);
            const aiDeductionsTotal = sumMoney(paidAiSessions, e => e.add_on_amount || 2.90);
            const netRevenue = Math.max(0, monthlyRevenue - aiDeductionsTotal);

            const aiUsageSummary = {
                totalAiSessions: aiUsageEntries.length,
                paidAiSessionsCount: paidAiSessions.length,
                trialSessionsCount: trialAiSessions.length,
                aiDeductionsTotal,
                trialsUsed: profInfo?.ai_trial_sessions_used || 0,
                trialLimit: profInfo?.ai_trial_limit ?? 3,
                trialsRemaining: Math.max(0, (profInfo?.ai_trial_limit ?? 3) - (profInfo?.ai_trial_sessions_used || 0)),
                copilotEnabled: profInfo?.ai_copilot_enabled ?? true,
                entries: aiUsageEntries
            };

            // Cálculos da clínica foram removidos deste hook para blindagem de dados estratégicos.
            // O componente FinancialControlModule de admin tem seu próprio gerenciamento.

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
                grossRevenue: monthlyRevenue,
                netRevenue,
                aiDeductionsTotal,
                aiUsageSummary,
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
