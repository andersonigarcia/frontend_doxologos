import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Keeps the list of booked slots for the selected professional/date combo in sync with Supabase.
 * Also supports querying the entire month so the calendar can accurately identify days with availability.
 */
export function useBookedSlots({ professionalId, date, currentMonth, toast } = {}) {
  const [bookedSlotsByDate, setBookedSlotsByDate] = useState({});
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Chave de mês/ano para invalidar query apenas quando o mês visível mudar
  const monthYearKey = currentMonth
    ? `${currentMonth.getFullYear()}-${currentMonth.getMonth() + 1}`
    : (date ? date.slice(0, 7) : '');

  const resetSlots = useCallback(() => {
    setBookedSlotsByDate({});
    setIsLoadingSlots(false);
  }, []);

  const fetchBookedSlots = useCallback(async () => {
    if (!professionalId) {
      resetSlots();
      return;
    }

    setIsLoadingSlots(true);

    try {
      const targetDate = currentMonth || (date ? new Date(date + 'T00:00:00') : new Date());
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1; // 1-12
      const lastDay = new Date(year, month, 0).getDate();

      const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
      const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('bookings')
        .select('booking_time, status, created_at, booking_date')
        .eq('professional_id', professionalId)
        .gte('booking_date', startOfMonth)
        .lte('booking_date', endOfMonth)
        .in('status', ['confirmed', 'paid', 'pending', 'pending_payment']);

      if (error) {
        throw error;
      }

      const activeList = (Array.isArray(data) ? data : []).filter((slot) => {
        if (slot.status !== 'pending' && slot.status !== 'pending_payment') {
          return true; // Slots confirmados ou pagos permanecem ocupados
        }
        // Checagem de expiração em tempo real (On-The-Fly):
        if (!slot.created_at) return true;
        const createdAtMs = new Date(slot.created_at).getTime();
        let bTime = slot.booking_time || '00:00';
        if (bTime.length === 5) bTime += ':00';
        const bookingTimeMs = new Date(`${slot.booking_date}T${bTime}`).getTime();
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
      });

      // Agrupar por data (ex: { '2026-10-20': ['15:00'], ... })
      const byDate = {};
      activeList.forEach((slot) => {
        const bDate = slot.booking_date;
        if (!byDate[bDate]) byDate[bDate] = [];
        if (slot.booking_time && !byDate[bDate].includes(slot.booking_time)) {
          byDate[bDate].push(slot.booking_time);
        }
      });

      setBookedSlotsByDate(byDate);
    } catch (error) {
      console.error('Erro ao buscar horários ocupados:', error);
      toast?.({
        variant: 'destructive',
        title: 'Não foi possível atualizar os horários',
        description: 'Verifique sua conexão ou tente outro horário. Nosso time pode ajudar pelo WhatsApp.'
      });
      setBookedSlotsByDate({});
    } finally {
      setIsLoadingSlots(false);
    }
  }, [professionalId, monthYearKey, toast, resetSlots]);

  useEffect(() => {
    fetchBookedSlots();
  }, [fetchBookedSlots]);

  // Slots ocupados para a data selecionada (retrocompatibilidade)
  const bookedSlots = date ? (bookedSlotsByDate[date] || []) : [];

  return {
    bookedSlots,
    bookedSlotsByDate,
    isLoadingSlots,
    refreshBookedSlots: fetchBookedSlots,
  };
}
