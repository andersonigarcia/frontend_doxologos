/**
 * Hooks de Mutação Canônicos com Invalidação Automática de Cache (Onda 3)
 * Garante que alterações em agendamentos invalidem instantaneamente os dados em cache do TanStack Query.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createBooking,
  updateBookingStatus,
  rescheduleBooking
} from '@/services/bookingService';
import { BOOKINGS_QUERY_KEY, PATIENT_BOOKINGS_QUERY_KEY } from './useBookingsQuery';

/**
 * Mutação para criação de agendamento com invalidação de cache
 */
export function useCreateBookingMutation(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...mutationOptions } = options;

  return useMutation({
    ...mutationOptions,
    mutationFn: (payload) => createBooking(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PATIENT_BOOKINGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      if (onSuccess) {
        onSuccess(data, variables, context);
      }
    },
  });
}

/**
 * Mutação para atualização de status de agendamento (confirmação, cancelamento, etc.)
 */
export function useUpdateBookingStatusMutation(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...mutationOptions } = options;

  return useMutation({
    ...mutationOptions,
    mutationFn: ({ id, newStatus, options: statusOpts }) =>
      updateBookingStatus(id, newStatus, statusOpts),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PATIENT_BOOKINGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      if (onSuccess) {
        onSuccess(data, variables, context);
      }
    },
  });
}

/**
 * Mutação para reagendamento de consultas com invalidação da agenda e dos agendamentos
 */
export function useRescheduleBookingMutation(options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, ...mutationOptions } = options;

  return useMutation({
    ...mutationOptions,
    mutationFn: ({ id, newDate, newTime, attemptsUsed, rescheduledFromId, userId }) =>
      rescheduleBooking(id, { newDate, newTime, attemptsUsed, rescheduledFromId, userId }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [BOOKINGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PATIENT_BOOKINGS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      if (onSuccess) {
        onSuccess(data, variables, context);
      }
    },
  });
}
