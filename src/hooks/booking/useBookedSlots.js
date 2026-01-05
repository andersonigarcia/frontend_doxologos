import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Keeps the list of booked slots for the selected professional/date combo in sync with Supabase.
 * Components can stay declarative by only consuming the returned state.
 */
export function useBookedSlots({ professionalId, date, toast } = {}) {
  const [bookedSlots, setBookedSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const resetSlots = useCallback(() => {
    setBookedSlots([]);
    setIsLoadingSlots(false);
  }, []);

  const fetchBookedSlots = useCallback(async () => {
    if (!professionalId || !date) {
      resetSlots();
      return;
    }

    setIsLoadingSlots(true);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_time')
        .eq('professional_id', professionalId)
        .eq('booking_date', date)
        .in('status', ['confirmed', 'pending_payment']);

      if (error) {
        throw error;
      }

      setBookedSlots(Array.isArray(data) ? data.map((slot) => slot.booking_time) : []);
    } catch (error) {
      console.error('Erro ao buscar horários ocupados:', error);
      toast?.({
        variant: 'destructive',
        title: 'Não foi possível atualizar os horários',
        description: 'Verifique sua conexão ou tente outro horário. Nosso time pode ajudar pelo WhatsApp.'
      });
      setBookedSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [professionalId, date, toast, resetSlots]);

  useEffect(() => {
    fetchBookedSlots();
  }, [fetchBookedSlots]);

  return {
    bookedSlots,
    isLoadingSlots,
    refreshBookedSlots: fetchBookedSlots,
  };
}
