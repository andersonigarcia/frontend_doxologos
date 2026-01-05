import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const sortProfessionals = (list = []) => {
  return [...list].sort((a, b) => (a?.name || '').localeCompare(b?.name || '', 'pt-BR', { sensitivity: 'base' }));
};

export function useHomeContent({ toast, trackAsyncError } = {}) {
  const [activeEvents, setActiveEvents] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const notify = useCallback(
    (payload) => {
      if (!toast || !payload) {
        return;
      }
      toast(payload);
    },
    [toast]
  );

  const fetchHomeData = useCallback(async () => {
    if (isMountedRef.current) {
      setTestimonialsLoading(true);
    }

    const nowIso = new Date().toISOString();

    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('eventos')
        .select('*')
        .eq('status', 'aberto')
        .eq('ativo', true)
        .gt('data_limite_inscricao', nowIso)
        .lte('data_inicio_exibicao', nowIso)
        .gte('data_fim_exibicao', nowIso)
        .order('data_inicio', { ascending: true });

      if (eventsError) {
        trackAsyncError?.(eventsError, 'fetch_events');
      } else if (isMountedRef.current) {
        if (Array.isArray(eventsData) && eventsData.length > 0) {
          const professionalIds = [...new Set(eventsData.map((event) => event.professional_id).filter(Boolean))];

          if (professionalIds.length > 0) {
            const { data: eventProfessionals, error: eventProfError } = await supabase
              .from('professionals')
              .select('id, name')
              .in('id', professionalIds);

            if (eventProfError) {
              trackAsyncError?.(eventProfError, 'fetch_event_professionals');
              setActiveEvents(eventsData);
            } else {
              const eventsWithProfessionals = eventsData.map((event) => ({
                ...event,
                professional: eventProfessionals?.find((professional) => professional.id === event.professional_id),
              }));
              setActiveEvents(eventsWithProfessionals);
            }
          } else {
            setActiveEvents(eventsData);
          }
        } else {
          setActiveEvents(eventsData || []);
        }
      }

      const { data: profsData, error: profsError } = await supabase.from('professionals').select('*');

      if (profsError) {
        trackAsyncError?.(profsError, 'fetch_professionals');
        notify({
          variant: 'destructive',
          title: 'Erro ao carregar profissionais',
          description: profsError.message,
        });
      } else if (isMountedRef.current) {
        setProfessionals(sortProfessionals(profsData || []));
      }

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
            *,
            professionals(name),
            bookings(patient_name, patient_email, booking_date, booking_time, professional:professionals(name))
          `)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(7);

      if (reviewsError) {
        trackAsyncError?.(reviewsError, 'fetch_reviews');
      } else if (isMountedRef.current) {
        setTestimonials(reviewsData || []);
      }
    } catch (error) {
      trackAsyncError?.(error, 'fetch_home_data');
      notify({
        variant: 'destructive',
        title: 'Erro ao carregar conteúdo',
        description: 'Não foi possível carregar algumas seções. Tente novamente.',
      });
    } finally {
      if (isMountedRef.current) {
        setTestimonialsLoading(false);
      }
    }
  }, [notify, trackAsyncError]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  return {
    activeEvents,
    professionals,
    testimonials,
    testimonialsLoading,
    refreshHomeContent: fetchHomeData,
  };
}
