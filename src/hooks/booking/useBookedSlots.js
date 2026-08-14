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
        .select('booking_time, status, created_at, booking_date')
        .eq('professional_id', professionalId)
        .eq('booking_date', date)
        .in('status', ['confirmed', 'paid', 'pending', 'pending_payment']);

      if (error) {
        throw error;
      }

      const activeSlots = (Array.isArray(data) ? data : [])
        .filter((slot) => {
          if (slot.status !== 'pending' && slot.status !== 'pending_payment') {
            return true; // Slots confirmados ou pagos permanecem ocupados
          }
          // Checagem de expiração em tempo real (On-The-Fly):
          if (!slot.created_at) return true;
          const createdAtMs = new Date(slot.created_at).getTime();
          let bTime = slot.booking_time || '00:00';
          if (bTime.length === 5) bTime += ':00';
          const bookingTimeMs = new Date(`${slot.booking_date || date}T${bTime}`).getTime();
          const leadTimeMs = bookingTimeMs - createdAtMs;

          let allowedWindowMs;
          if (leadTimeMs < 3 * 60 * 60 * 1000) {
            allowedWindowMs = 15 * 60 * 1000; // <3h: 15 min
          } else if (leadTimeMs < 24 * 60 * 60 * 1000) {
            allowedWindowMs = 30 * 60 * 1000; // 3h-24h: 30 min
          } else {
            allowedWindowMs = 60 * 60 * 1000; // >24h: 60 min
          }

          const isExpired = Date.now() > (createdAtMs + allowedWindowMs);
          return !isExpired; // Se expirou, libera a vaga instantaneamente!
        })
        .map((slot) => slot.booking_time);

      setBookedSlots(activeSlots);
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
