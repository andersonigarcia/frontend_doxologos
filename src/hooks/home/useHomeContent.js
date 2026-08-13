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

import { useCallback, useEffect } from 'react';
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
  // 1. Busca todos os profissionais
  const { data: profsData, error: profsError } = await supabase.from('professionals').select('*');
  if (profsError) throw profsError;

  // 2. Busca todas as agendas
  const { data: availData, error: availError } = await supabase.from('availability').select('professional_id, available_times');
  if (availError) throw availError;

  // 3. Verifica quais profissionais possuem pelo menos um horário disponível
  const availableProfIds = new Set();
  if (availData) {
    availData.forEach(avail => {
      if (avail.available_times && avail.available_times.length > 0) {
        availableProfIds.add(avail.professional_id);
      }
    });
  }

  // 4. Filtra apenas quem tem agenda
  let activeProfs = (profsData || []).filter(p => availableProfIds.has(p.id));

  // 5. Embaralha de forma randômica (Fisher-Yates shuffle)
  for (let i = activeProfs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activeProfs[i], activeProfs[j]] = [activeProfs[j], activeProfs[i]];
  }

  return activeProfs;
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
  });

  const professionalsQuery = useQuery({
    queryKey: ['professionals'],
    queryFn: fetchAllProfessionals,
  });

  const testimonialsQuery = useQuery({
    queryKey: ['reviews', { scope: 'home' }],
    queryFn: fetchHomeTestimonials,
  });

  useEffect(() => {
    if (eventsQuery.error) {
      trackAsyncError?.(eventsQuery.error, 'fetch_events');
    }
  }, [eventsQuery.error, trackAsyncError]);

  useEffect(() => {
    if (professionalsQuery.error) {
      trackAsyncError?.(professionalsQuery.error, 'fetch_professionals');
      notify({
        variant: 'destructive',
        title: 'Erro ao carregar profissionais',
        description: professionalsQuery.error.message,
      });
    }
  }, [professionalsQuery.error, trackAsyncError, notify]);

  useEffect(() => {
    if (testimonialsQuery.error) {
      trackAsyncError?.(testimonialsQuery.error, 'fetch_reviews');
    }
  }, [testimonialsQuery.error, trackAsyncError]);


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
