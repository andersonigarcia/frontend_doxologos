import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export function useBookingData({ toast } = {}) {
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [availability, setAvailability] = useState({});
  const [blockedDates, setBlockedDates] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
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

  const fetchBookingData = useCallback(async () => {
    try {
      const { data: profsData, error: profsError } = await supabase.from('professionals').select('*');
      if (profsError) {
        notify({
          variant: 'destructive',
          title: 'Não conseguimos carregar os profissionais',
          description: 'Atualize a página ou tente novamente em alguns minutos. Se continuar, fale conosco pelo WhatsApp.',
        });
      } else if (isMountedRef.current) {
        setProfessionals(profsData || []);
      }

      const { data: servicesData, error: servicesError } = await supabase.from('services').select('*');
      if (servicesError) {
        notify({
          variant: 'destructive',
          title: 'Não conseguimos carregar os serviços',
          description: 'Tente novamente em instantes. Caso o erro persista, entre em contato com nossa equipe.',
        });
      } else if (isMountedRef.current) {
        setServices(servicesData || []);
      }

      const { data: availData, error: availError } = await supabase.from('availability').select('*');
      if (availError) {
        notify({
          variant: 'destructive',
          title: 'Agenda indisponível no momento',
          description: 'Estamos ajustando os horários. Volte em alguns minutos ou escolha outro profissional.',
        });
      } else if (isMountedRef.current) {
        const availabilityMap = {};
        (availData || []).forEach((slot) => {
          if (!availabilityMap[slot.professional_id]) {
            availabilityMap[slot.professional_id] = {};
          }
          availabilityMap[slot.professional_id][slot.day_of_week] = slot.available_times;
        });
        setAvailability(availabilityMap);
      }

      const { data: blockedData, error: blockedError } = await supabase.from('blocked_dates').select('*');
      if (blockedError) {
        notify({
          variant: 'destructive',
          title: 'Não foi possível validar as datas',
          description: 'Recarregue a página para atualizar a agenda. Persistindo, fale conosco.',
        });
      } else if (isMountedRef.current) {
        setBlockedDates(blockedData || []);
      }

      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
        *,
        professionals(name),
        bookings(patient_name, patient_email)
      `)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!reviewsError && isMountedRef.current) {
        setTestimonials(reviewsData || []);
      }
    } catch (error) {
      notify({
        variant: 'destructive',
        title: 'Erro ao carregar dados do agendamento',
        description: 'Recarregue a página ou tente novamente mais tarde.',
      });
    }
  }, [notify]);

  useEffect(() => {
    fetchBookingData();
  }, [fetchBookingData]);

  return {
    professionals,
    services,
    availability,
    blockedDates,
    testimonials,
    refreshBookingData: fetchBookingData,
  };
}
