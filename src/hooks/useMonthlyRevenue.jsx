import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook para buscar dados de receita mensal
 * 
 * @param {string} professionalId - ID do profissional
 * @param {number} months - Número de meses para buscar (default: 6)
 * @returns {Object} Dados de receita e estado de loading
 */
export function useMonthlyRevenue(professionalId = null, months = 6) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchMonthlyRevenue = useCallback(async () => {
        if (!professionalId) {
            setData([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Calcular data inicial (X meses atrás)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months + 1);
            startDate.setDate(1); // Primeiro dia do mês

            const startDateStr = startDate.toISOString().split('T')[0];

            // Buscar agendamentos confirmados/pagos/completados
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('booking_date, valor_repasse_profissional, status')
                .eq('professional_id', professionalId)
                .gte('booking_date', startDateStr)
                .in('status', ['confirmed', 'paid', 'completed']);

            if (bookingsError) throw bookingsError;

            // Agrupar por mês
            const monthlyData = {};
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

            // Inicializar todos os meses com 0
            for (let i = 0; i < months; i++) {
                const date = new Date();
                date.setMonth(date.getMonth() - (months - 1 - i));
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const monthLabel = `${monthNames[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`;

                monthlyData[monthKey] = {
                    month: monthLabel,
                    revenue: 0,
                    count: 0
                };
            }

            // Somar receitas por mês
            (bookings || []).forEach(booking => {
                const bookingDate = new Date(booking.booking_date);
                const monthKey = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;

                if (monthlyData[monthKey]) {
                    const revenue = parseFloat(booking.valor_repasse_profissional) || 0;
                    monthlyData[monthKey].revenue += revenue;
                    monthlyData[monthKey].count += 1;
                }
            });

            // Converter para array ordenado
            const chartData = Object.keys(monthlyData)
                .sort()
                .map(key => monthlyData[key]);

            setData(chartData);

        } catch (err) {
            console.error('Erro ao buscar receita mensal:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [professionalId, months]);

    useEffect(() => {
        fetchMonthlyRevenue();
    }, [fetchMonthlyRevenue]);

    return {
        data,
        loading,
        error,
        refresh: fetchMonthlyRevenue,
    };
}

export default useMonthlyRevenue;
