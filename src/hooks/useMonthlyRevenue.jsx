/**
 * useMonthlyRevenue — Receita mensal por profissional
 *
 * R-01: Migrado de useState+useEffect para TanStack Query.
 * Benefícios: retry automático (2x), cache de 5min, deduplicação de requests.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/customSupabaseClient';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

async function fetchMonthlyRevenue(professionalId, months) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('booking_date, valor_repasse_profissional, status')
        .eq('professional_id', professionalId)
        .gte('booking_date', startDateStr)
        .in('status', ['confirmed', 'paid', 'completed']);

    if (error) throw error;

    // Inicializar todos os meses com 0
    const monthlyData = {};
    for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - (months - 1 - i));
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = {
            month: `${MONTH_NAMES[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`,
            revenue: 0,
            count: 0,
        };
    }

    // Somar por mês
    (bookings || []).forEach((booking) => {
        const d = new Date(booking.booking_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyData[key]) {
            monthlyData[key].revenue += parseFloat(booking.valor_repasse_profissional) || 0;
            monthlyData[key].count += 1;
        }
    });

    return Object.keys(monthlyData)
        .sort()
        .map((k) => monthlyData[k]);
}

/**
 * @param {string|null} professionalId
 * @param {number} months - Quantidade de meses (padrão: 6)
 */
export function useMonthlyRevenue(professionalId = null, months = 6) {
    const query = useQuery({
        queryKey: ['monthlyRevenue', professionalId, months],
        queryFn: () => fetchMonthlyRevenue(professionalId, months),
        staleTime: 5 * 60 * 1000,
        retry: 2,
        enabled: !!professionalId,
    });

    return {
        data: query.data ?? [],
        loading: query.isLoading,
        error: query.error,
        refresh: query.refetch,
    };
}

export default useMonthlyRevenue;
