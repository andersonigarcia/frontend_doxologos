/**
 * useHomeContent — Dados para a página inicial
 *
 * PERF (P-02): Migrado de useState + useEffect manual para TanStack Query.
 * Benefícios:
 *  - Cache automático: dados permanecem válidos por staleTime (5min) sem novo fetch
 *  - Deduplicação: múltiplos componentes usando o mesmo queryKey compartilham 1 requisição
 *  - Background refetch: dados são atualizados em background sem mostrar loading novamente
 *
 * A assinatura pública do hook é idêntica à anterior para evitar breaking changes.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/customSupabaseClient';

// ---------- fetchers puros (testáveis isoladamente) ----------

const fetchActiveEvents = async () => {
  const nowIso = new Date().toISOString();

  const { data: eventsData, error: eventsError } = await supabase
    .from('eventos')
    .select('*')
    .eq('status', 'aberto')
    .eq('ativo', true)
    .gt('data_limite_inscricao', nowIso)
    .lte('data_inicio_exibicao', nowIso)
    .gte('data_fim_exibicao', nowIso)
    .order('data_inicio', { ascending: true });

  if (eventsError) throw eventsError;

  const events = eventsData || [];
  if (events.length === 0) return [];

  // Enriquecer com dados do profissional responsável
  const professionalIds = [...new Set(events.map((e) => e.professional_id).filter(Boolean))];
  if (professionalIds.length === 0) return events;

  const { data: eventProfessionals, error: profError } = await supabase
    .from('professionals')
    .select('id, name')
    .in('id', professionalIds);

  if (profError) return events; // fallback sem enriquecimento

  return events.map((event) => ({
    ...event,
    professional: eventProfessionals?.find((p) => p.id === event.professional_id),
  }));
};

const fetchAllProfessionals = async () => {
  const { data, error } = await supabase.from('professionals').select('*');
  if (error) throw error;
  return [...(data || [])].sort((a, b) =>
    (a?.name || '').localeCompare(b?.name || '', 'pt-BR', { sensitivity: 'base' })
  );
};

const fetchHomeTestimonials = async () => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      professionals(name),
      bookings(patient_name, patient_email, booking_date, booking_time, professional:professionals(name))
    `)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(7);

  if (error) throw error;
  return data || [];
};

// ---------- hook público ----------

export function useHomeContent({ toast, trackAsyncError } = {}) {
  const queryClient = useQueryClient();

  const notify = useCallback(
    (payload) => {
      if (!toast || !payload) return;
      toast(payload);
    },
    [toast]
  );

  const eventsQuery = useQuery({
    queryKey: ['events', 'active'],
    queryFn: fetchActiveEvents,
    onError: (err) => {
      trackAsyncError?.(err, 'fetch_events');
    },
  });

  const professionalsQuery = useQuery({
    queryKey: ['professionals'],
    queryFn: fetchAllProfessionals,
    onError: (err) => {
      trackAsyncError?.(err, 'fetch_professionals');
      notify({
        variant: 'destructive',
        title: 'Erro ao carregar profissionais',
        description: err.message,
      });
    },
  });

  const testimonialsQuery = useQuery({
    queryKey: ['reviews', { scope: 'home' }],
    queryFn: fetchHomeTestimonials,
    onError: (err) => {
      trackAsyncError?.(err, 'fetch_reviews');
    },
  });

  // refreshHomeContent invalida e re-fetcha todos os dados da home
  const refreshHomeContent = useCallback(() => {
    return queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return key === 'events' || key === 'professionals' || key === 'reviews';
      },
    });
  }, [queryClient]);

  return {
    activeEvents: eventsQuery.data ?? [],
    professionals: professionalsQuery.data ?? [],
    testimonials: testimonialsQuery.data ?? [],
    // isLoading é true apenas no primeiro carregamento (sem dados em cache)
    testimonialsLoading: testimonialsQuery.isLoading,
    refreshHomeContent,
  };
}
