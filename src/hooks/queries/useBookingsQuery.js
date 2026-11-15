/**
 * Hook Reativo Canônico para Agendamentos (Onda 3)
 * Consome bookingService com cache unificado via TanStack Query.
 */
import { useQuery } from '@tanstack/react-query';
import {
  listBookings,
  listPatientBookings,
  getBookingById
} from '@/services/bookingService';
import { supabase } from '@/lib/customSupabaseClient';

export const BOOKINGS_QUERY_KEY = 'bookings';
export const PATIENT_BOOKINGS_QUERY_KEY = 'patient-bookings';
export const PATIENT_REVIEWS_QUERY_KEY = 'patient-reviews';

/**
 * Hook para listagem geral de agendamentos com cache reativo
 * @param {Object} [filters={}] Filtros como status, professionalId, userId, datas
 * @param {Object} [options={}] Opções do TanStack Query
 */
export function useBookingsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: [BOOKINGS_QUERY_KEY, filters],
    queryFn: () => listBookings(filters),
    staleTime: 60 * 1000,        // 1 minuto de cache fresco
    gcTime: 10 * 60 * 1000,     // 10 minutos de retenção
    ...options,
  });
}

/**
 * Hook para buscar um agendamento específico por ID
 * @param {string} id ID do agendamento
 * @param {Object} [options={}]
 */
export function useBookingDetailQuery(id, options = {}) {
  return useQuery({
    queryKey: [BOOKINGS_QUERY_KEY, 'detail', id],
    queryFn: () => getBookingById(id, { includeRelations: true }),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook para listagem de agendamentos de um paciente específico com relações completas
 * @param {string} userId ID do paciente autenticado
 * @param {Object} [options={}]
 */
export function usePatientBookingsQuery(userId, options = {}) {
  return useQuery({
    queryKey: [PATIENT_BOOKINGS_QUERY_KEY, userId],
    queryFn: () => listPatientBookings(userId, options?.filters),
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,   // 2 minutos
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook para carregar avaliações já realizadas pelo paciente
 * @param {string} userId
 * @param {Object} [options={}]
 */
export function usePatientReviewsQuery(userId, options = {}) {
  return useQuery({
    queryKey: [PATIENT_REVIEWS_QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('reviews')
        .select('booking_id')
        .eq('patient_id', userId);
      if (error) throw error;
      return (data || []).map((r) => r.booking_id);
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}
