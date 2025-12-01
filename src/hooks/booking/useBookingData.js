import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchAvailabilityMap,
  fetchBlockedDates,
  fetchProfessionals,
  fetchServices,
  fetchApprovedReviews,
} from '@/lib/api/supabaseFetchers';

export function useBookingData({ toast } = {}) {
  const notify = useCallback(
    (payload) => {
      if (!toast || !payload) {
        return;
      }
      toast(payload);
    },
    [toast]
  );

  const professionalsQuery = useQuery({
    queryKey: ['professionals'],
    queryFn: fetchProfessionals,
    onError: () =>
      notify({
        variant: 'destructive',
        title: 'Não conseguimos carregar os profissionais',
        description: 'Atualize a página ou tente novamente em alguns minutos. Se continuar, fale conosco pelo WhatsApp.',
      }),
  });

  const servicesQuery = useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
    onError: () =>
      notify({
        variant: 'destructive',
        title: 'Não conseguimos carregar os serviços',
        description: 'Tente novamente em instantes. Caso o erro persista, entre em contato com nossa equipe.',
      }),
  });

  const availabilityQuery = useQuery({
    queryKey: ['availability'],
    queryFn: fetchAvailabilityMap,
    onError: () =>
      notify({
        variant: 'destructive',
        title: 'Agenda indisponível no momento',
        description: 'Estamos ajustando os horários. Volte em alguns minutos ou escolha outro profissional.',
      }),
  });

  const blockedDatesQuery = useQuery({
    queryKey: ['blocked_dates'],
    queryFn: fetchBlockedDates,
    onError: () =>
      notify({
        variant: 'destructive',
        title: 'Não foi possível validar as datas',
        description: 'Recarregue a página para atualizar a agenda. Persistindo, fale conosco.',
      }),
  });

  const testimonialsQuery = useQuery({
    queryKey: ['reviews', { scope: 'booking' }],
    queryFn: () =>
      fetchApprovedReviews({
        limit: 5,
        columns: `*, professionals(name), bookings(patient_name, patient_email)`,
      }),
    onError: () =>
      notify({
        variant: 'destructive',
        title: 'Erro ao carregar depoimentos',
        description: 'Recarregue a página ou tente novamente em instantes.',
      }),
  });

  const refreshBookingData = useCallback(() => {
    return Promise.all([
      professionalsQuery.refetch(),
      servicesQuery.refetch(),
      availabilityQuery.refetch(),
      blockedDatesQuery.refetch(),
      testimonialsQuery.refetch(),
    ]);
  }, [availabilityQuery, blockedDatesQuery, professionalsQuery, servicesQuery, testimonialsQuery]);

  const isLoading =
    professionalsQuery.isLoading ||
    servicesQuery.isLoading ||
    availabilityQuery.isLoading ||
    blockedDatesQuery.isLoading ||
    testimonialsQuery.isLoading;

  return {
    professionals: professionalsQuery.data ?? [],
    services: servicesQuery.data ?? [],
    availability: availabilityQuery.data ?? {},
    blockedDates: blockedDatesQuery.data ?? [],
    testimonials: testimonialsQuery.data ?? [],
    isLoading,
    refreshBookingData,
  };
}
