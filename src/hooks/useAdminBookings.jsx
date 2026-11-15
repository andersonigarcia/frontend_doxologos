import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { secureLog } from '@/lib/secureLogger';

export function useAdminBookings({ user, userRole }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 50;

    const fetchBookings = useCallback(async (pageNum = 1, append = false) => {
        setLoading(true);
        setError(null);
        try {
            const isAdmin = userRole === 'admin';
            const professionalId = user?.id;

            let professionalsRecordId = null;
            if (!isAdmin && professionalId) {
                const { data: profData } = await supabase
                    .from('professionals')
                    .select('id')
                    .eq('user_id', professionalId)
                    .maybeSingle();
                professionalsRecordId = profData?.id;
            }
            if (!isAdmin && !professionalsRecordId && professionalId) {
                professionalsRecordId = professionalId;
            }

            const professionalFilterId = isAdmin ? null : professionalsRecordId;

            const bookingsSelect = '*, meeting_link, meeting_password, meeting_id, meeting_start_url, professional:professionals(name), service:services(id, name, price, duration_minutes, professional_payout)';
            
            let query = supabase
                .from('bookings')
                .select(bookingsSelect)
                .order('booking_date', { ascending: false })
                .order('booking_time', { ascending: false });

            if (!isAdmin && professionalFilterId) {
                query = query.eq('professional_id', professionalFilterId);
            }

            const from = (pageNum - 1) * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            
            const { data, error: fetchError } = await query.range(from, to);

            if (fetchError) throw fetchError;

            if (data) {
                setBookings(prev => append ? [...prev, ...data] : data);
                setHasMore(data.length === PAGE_SIZE);
            }
        } catch (err) {
            secureLog.error('Erro ao buscar agendamentos (useAdminBookings):', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [user, userRole]);

    useEffect(() => {
        fetchBookings(1, false);
    }, [fetchBookings]);

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchBookings(nextPage, true);
        }
    };

    return { bookings, loading, error, loadMore, hasMore, refresh: () => fetchBookings(1, false) };
}
