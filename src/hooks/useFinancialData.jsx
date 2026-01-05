import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook para dados financeiros com filtros de período
 * 
 * @param {string} professionalId - ID do profissional
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 * @returns {Object} Dados financeiros e estado de loading
 */
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
                totalPending: 0,
            });
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Fetch bookings in date range
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('*, service:services(name, price)')
                .eq('professional_id', professionalId)
                .gte('booking_date', startDate)
                .lte('booking_date', endDate);

            if (bookingsError) throw bookingsError;

            // Calculate date ranges
            const today = new Date().toISOString().split('T')[0];
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekAgoStr = weekAgo.toISOString().split('T')[0];

            // Calculate daily revenue
            const dailyRevenue = (bookings || [])
                .filter(b => b.booking_date === today && ['confirmed', 'paid', 'completed'].includes(b.status))
                .reduce((sum, b) => sum + (parseFloat(b.valor_repasse_profissional) || 0), 0);

            // Calculate weekly revenue
            const weeklyRevenue = (bookings || [])
                .filter(b => b.booking_date >= weekAgoStr && ['confirmed', 'paid', 'completed'].includes(b.status))
                .reduce((sum, b) => sum + (parseFloat(b.valor_repasse_profissional) || 0), 0);

            // Calculate monthly/period revenue
            const monthlyRevenue = (bookings || [])
                .filter(b => ['confirmed', 'paid', 'completed'].includes(b.status))
                .reduce((sum, b) => sum + (parseFloat(b.valor_repasse_profissional) || 0), 0);

            // Get pending payments
            const pendingPayments = (bookings || [])
                .filter(b => b.status === 'pending_payment' || b.status === 'awaiting_payment')
                .sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date));

            const totalPending = pendingPayments.reduce((sum, b) => sum + (parseFloat(b.valor_repasse_profissional) || 0), 0);

            // Service breakdown
            const serviceMap = {};
            (bookings || [])
                .filter(b => ['confirmed', 'paid', 'completed'].includes(b.status))
                .forEach(b => {
                    const serviceName = b.service?.name || 'Sem serviço';
                    if (!serviceMap[serviceName]) {
                        serviceMap[serviceName] = { name: serviceName, revenue: 0, count: 0 };
                    }
                    serviceMap[serviceName].revenue += parseFloat(b.valor_repasse_profissional) || 0;
                    serviceMap[serviceName].count += 1;
                });

            const serviceBreakdown = Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue);

            setData({
                dailyRevenue,
                weeklyRevenue,
                monthlyRevenue,
                pendingPayments,
                serviceBreakdown,
                totalPending,
            });
        } catch (err) {
            console.error('Error fetching financial data:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [professionalId, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { ...data, loading, error, refresh: fetchData };
}

export default useFinancialData;
