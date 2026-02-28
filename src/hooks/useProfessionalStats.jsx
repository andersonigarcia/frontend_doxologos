/**
 * useProfessionalStats — Estatísticas do dashboard profissional
 *
 * R-01: Migrado de useState+useEffect para TanStack Query.
 * Benefícios: retry automático (2x), cache de 5min, deduplicação de requests.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/customSupabaseClient';

async function fetchProfessionalStats(professionalId) {
    // Resolve o professionalId se não fornecido
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
        return {
            todayAppointments: [],
            pendingAppointments: [],
            monthlyRevenue: 0,
            averageRating: 0,
            totalAppointments: 0,
            confirmedToday: 0,
        };
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];

    const [todayRes, pendingRes, monthlyRes, reviewsRes] = await Promise.all([
        supabase
            .from('bookings')
            .select('*, service:services(name), professional:professionals(name)')
            .eq('professional_id', profId)
            .eq('booking_date', todayStr)
            .order('booking_time', { ascending: true }),

        supabase
            .from('bookings')
            .select('*, service:services(name), professional:professionals(name)')
            .eq('professional_id', profId)
            .in('status', ['pending', 'awaiting_payment'])
            .gte('booking_date', todayStr)
            .order('booking_date', { ascending: true })
            .order('booking_time', { ascending: true }),

        supabase
            .from('bookings')
            .select('valor_repasse_profissional, status')
            .eq('professional_id', profId)
            .gte('booking_date', firstDayStr)
            .in('status', ['confirmed', 'paid', 'completed']),

        supabase
            .from('reviews')
            .select('rating')
            .eq('professional_id', profId)
            .eq('is_approved', true),
    ]);

    if (todayRes.error) throw todayRes.error;
    if (pendingRes.error) throw pendingRes.error;
    if (monthlyRes.error) throw monthlyRes.error;
    if (reviewsRes.error) throw reviewsRes.error;

    const revenue = (monthlyRes.data || []).reduce(
        (sum, b) => sum + (parseFloat(b.valor_repasse_profissional) || 0),
        0
    );

    const avgRating =
        reviewsRes.data?.length > 0
            ? reviewsRes.data.reduce((sum, r) => sum + r.rating, 0) / reviewsRes.data.length
            : 0;

    const todayBookings = todayRes.data || [];
    const confirmedToday = todayBookings.filter((b) =>
        ['confirmed', 'paid', 'completed'].includes(b.status)
    ).length;

    return {
        todayAppointments: todayBookings,
        pendingAppointments: pendingRes.data || [],
        monthlyRevenue: revenue,
        averageRating: avgRating,
        totalAppointments: todayBookings.length,
        confirmedToday,
    };
}

/**
 * @param {string|null} professionalId
 */
export function useProfessionalStats(professionalId = null) {
    const query = useQuery({
        // null professionalId ainda resolve internamente, mas mantemos no key
        // para invalidação pontual se necessário
        queryKey: ['professionalStats', professionalId],
        queryFn: () => fetchProfessionalStats(professionalId),
        // Dados de stats são sensíveis ao tempo — staleTime menor
        staleTime: 2 * 60 * 1000,  // 2 minutos
        retry: 2,
        // Não executa se não há sessão estabelecida (professionalId === undefined)
        enabled: professionalId !== undefined,
    });

    return {
        // Spread dos dados com defaults para manter compatibilidade com consumidores
        todayAppointments: query.data?.todayAppointments ?? [],
        pendingAppointments: query.data?.pendingAppointments ?? [],
        monthlyRevenue: query.data?.monthlyRevenue ?? 0,
        averageRating: query.data?.averageRating ?? 0,
        totalAppointments: query.data?.totalAppointments ?? 0,
        confirmedToday: query.data?.confirmedToday ?? 0,
        loading: query.isLoading,
        error: query.error,
        refresh: query.refetch,
    };
}

export default useProfessionalStats;
