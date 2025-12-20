import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook para estatísticas do profissional
 * 
 * Retorna métricas agregadas para o dashboard profissional:
 * - Consultas de hoje
 * - Consultas pendentes
 * - Receita do mês
 * - Avaliação média
 * 
 * @param {string} professionalId - ID do profissional (opcional, usa usuário logado se não fornecido)
 * @returns {Object} Estatísticas e estado de loading
 */
export function useProfessionalStats(professionalId = null) {
    const [stats, setStats] = useState({
        todayAppointments: [],
        pendingAppointments: [],
        monthlyRevenue: 0,
        averageRating: 0,
        totalAppointments: 0,
        confirmedToday: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Buscar profissional se não fornecido
            let profId = professionalId;
            if (!profId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profData } = await supabase
                        .from('professionals')
                        .select('id')
                        .eq('user_id', user.id)
                        .single();
                    profId = profData?.id;
                }
            }

            if (!profId) {
                setStats({
                    todayAppointments: [],
                    pendingAppointments: [],
                    monthlyRevenue: 0,
                    averageRating: 0,
                    totalAppointments: 0,
                    confirmedToday: 0,
                });
                setLoading(false);
                return;
            }

            // Data de hoje
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Primeiro dia do mês
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];

            // Buscar agendamentos do dia
            const { data: todayBookings, error: todayError } = await supabase
                .from('bookings')
                .select('*, service:services(name), professional:professionals(name)')
                .eq('professional_id', profId)
                .eq('booking_date', todayStr)
                .order('booking_time', { ascending: true });

            if (todayError) throw todayError;

            // Buscar agendamentos pendentes
            const { data: pendingBookings, error: pendingError } = await supabase
                .from('bookings')
                .select('*, service:services(name), professional:professionals(name)')
                .eq('professional_id', profId)
                .in('status', ['pending', 'awaiting_payment'])
                .gte('booking_date', todayStr)
                .order('booking_date', { ascending: true })
                .order('booking_time', { ascending: true });

            if (pendingError) throw pendingError;

            // Buscar agendamentos do mês para calcular receita
            const { data: monthlyBookings, error: monthlyError } = await supabase
                .from('bookings')
                .select('valor_repasse_profissional, status')
                .eq('professional_id', profId)
                .gte('booking_date', firstDayStr)
                .in('status', ['confirmed', 'paid', 'completed']);

            if (monthlyError) throw monthlyError;

            // Calcular receita do mês
            const revenue = monthlyBookings.reduce((sum, booking) => {
                const value = parseFloat(booking.valor_repasse_profissional) || 0;
                return sum + value;
            }, 0);

            // Buscar avaliações
            const { data: reviews, error: reviewsError } = await supabase
                .from('reviews')
                .select('rating')
                .eq('professional_id', profId)
                .eq('is_approved', true);

            if (reviewsError) throw reviewsError;

            // Calcular média de avaliações
            const avgRating = reviews.length > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                : 0;

            // Contar confirmados hoje
            const confirmedToday = todayBookings.filter(b =>
                ['confirmed', 'paid', 'completed'].includes(b.status)
            ).length;

            setStats({
                todayAppointments: todayBookings || [],
                pendingAppointments: pendingBookings || [],
                monthlyRevenue: revenue,
                averageRating: avgRating,
                totalAppointments: todayBookings?.length || 0,
                confirmedToday,
            });

        } catch (err) {
            console.error('Erro ao buscar estatísticas:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [professionalId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return {
        ...stats,
        loading,
        error,
        refresh: fetchStats,
    };
}
