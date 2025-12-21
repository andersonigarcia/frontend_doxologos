import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook para gerenciar custos da plataforma
 * 
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 * @param {string} category - Categoria específica (opcional)
 */
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
                .order('cost_date', { ascending: false });

            if (startDate) {
                query = query.gte('cost_date', startDate);
            }

            if (endDate) {
                query = query.lte('cost_date', endDate);
            }

            if (category) {
                query = query.eq('category', category);
            }

            const { data: costs, error: costsError } = await query;

            if (costsError) throw costsError;

            // Calcular totais
            const totalCosts = (costs || []).reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

            // Agrupar por categoria
            const costsByCategory = (costs || []).reduce((acc, cost) => {
                const cat = cost.category || 'other';
                if (!acc[cat]) {
                    acc[cat] = { total: 0, count: 0, items: [] };
                }
                acc[cat].total += parseFloat(cost.amount || 0);
                acc[cat].count += 1;
                acc[cat].items.push(cost);
                return acc;
            }, {});

            // Calcular custos recorrentes
            const recurringCosts = (costs || [])
                .filter(c => c.is_recurring)
                .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

            setData({
                costs: costs || [],
                totalCosts,
                costsByCategory,
                recurringCosts,
            });
        } catch (err) {
            console.error('Error fetching costs:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, category]);

    useEffect(() => {
        fetchCosts();
    }, [fetchCosts]);

    return { ...data, loading, error, refresh: fetchCosts };
}

/**
 * Hook para calcular receita da plataforma
 * 
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 */
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

            if (startDate) {
                query = query.gte('booking_date', startDate);
            }

            if (endDate) {
                query = query.lte('booking_date', endDate);
            }

            const { data: bookings, error: bookingsError } = await query;

            if (bookingsError) throw bookingsError;

            // Calcular receita total
            const totalRevenue = (bookings || []).reduce((sum, b) =>
                sum + parseFloat(b.valor_consulta || 0), 0
            );

            // Calcular total de repasses
            const totalPayouts = (bookings || []).reduce((sum, b) =>
                sum + parseFloat(b.valor_repasse_profissional || 0), 0
            );

            // Margem da plataforma
            const platformMargin = totalRevenue - totalPayouts;

            // Percentual de margem
            const marginPercentage = totalRevenue > 0
                ? (platformMargin / totalRevenue) * 100
                : 0;

            setData({
                totalRevenue,
                totalPayouts,
                platformMargin,
                marginPercentage,
                bookingsCount: (bookings || []).length,
            });
        } catch (err) {
            console.error('Error fetching revenue:', err);
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

/**
 * Hook para calcular Lucro/Prejuízo
 * 
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 */
export function useProfitLoss(startDate = null, endDate = null) {
    const revenue = usePlatformRevenue(startDate, endDate);
    const costs = usePlatformCosts(startDate, endDate);

    const profitLoss = revenue.platformMargin - costs.totalCosts;
    const profitMargin = revenue.totalRevenue > 0
        ? (profitLoss / revenue.totalRevenue) * 100
        : 0;

    const isProfitable = profitLoss > 0;

    return {
        // Receita
        totalRevenue: revenue.totalRevenue,
        totalPayouts: revenue.totalPayouts,
        platformMargin: revenue.platformMargin,
        marginPercentage: revenue.marginPercentage,

        // Custos
        totalCosts: costs.totalCosts,
        costsByCategory: costs.costsByCategory,

        // P&L
        profitLoss,
        profitMargin,
        isProfitable,

        // Estado
        loading: revenue.loading || costs.loading,
        error: revenue.error || costs.error,
        refresh: () => {
            revenue.refresh();
            costs.refresh();
        }
    };
}

export default useProfitLoss;
