/**
 * Hook Reativo Canônico para Pagamentos e Status de Transação (Onda 3)
 * Consome paymentService com cache unificado via TanStack Query.
 */
import { useQuery } from '@tanstack/react-query';
import {
  getPaymentByMpId,
  getPaymentById,
  getPaymentByBookingId,
  listPayments
} from '@/services/paymentService';

export const PAYMENTS_QUERY_KEY = 'payments';

/**
 * Hook para consultar status de pagamento por mp_payment_id
 * @param {string|number} mpPaymentId ID da transação no Mercado Pago
 * @param {Object} [options={}]
 */
export function usePaymentStatusQuery(mpPaymentId, options = {}) {
  return useQuery({
    queryKey: [PAYMENTS_QUERY_KEY, 'mp', mpPaymentId],
    queryFn: () => getPaymentByMpId(mpPaymentId),
    enabled: Boolean(mpPaymentId),
    staleTime: 30 * 1000,      // 30 segundos
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook para buscar pagamento por ID primário
 * @param {string} id ID do pagamento na tabela payments
 * @param {Object} [options={}]
 */
export function usePaymentByIdQuery(id, options = {}) {
  return useQuery({
    queryKey: [PAYMENTS_QUERY_KEY, 'detail', id],
    queryFn: () => getPaymentById(id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook para buscar pagamento associado a um agendamento
 * @param {string} bookingId ID do agendamento
 * @param {Object} [options={}]
 */
export function usePaymentByBookingIdQuery(bookingId, options = {}) {
  return useQuery({
    queryKey: [PAYMENTS_QUERY_KEY, 'booking', bookingId],
    queryFn: () => getPaymentByBookingId(bookingId),
    enabled: Boolean(bookingId),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook para listar pagamentos com filtros
 * @param {Object} [filters={}]
 * @param {Object} [options={}]
 */
export function usePaymentsListQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: [PAYMENTS_QUERY_KEY, 'list', filters],
    queryFn: () => listPayments(filters),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}
