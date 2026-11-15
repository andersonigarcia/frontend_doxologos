/**
 * Hook Reativo Canônico para Profissionais (Onda 3)
 * Consome professionalService com cache unificado via TanStack Query.
 */
import { useQuery } from '@tanstack/react-query';
import { listProfessionals, getProfessionalById } from '@/services/professionalService';

export const PROFESSIONALS_QUERY_KEY = 'professionals';

/**
 * Hook para listagem de profissionais com cache TanStack Query
 * @param {Object} [filters={}] Filtros como status, includeAuthEmails, etc.
 * @param {Object} [options={}] Opções adicionais do useQuery
 */
export function useProfessionalsQuery(filters = {}, options = {}) {
  return useQuery({
    queryKey: [PROFESSIONALS_QUERY_KEY, filters],
    queryFn: () => listProfessionals(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos de cache fresco
    gcTime: 15 * 60 * 1000,    // 15 minutos de retenção em memória
    ...options,
  });
}

/**
 * Hook para buscar um profissional específico por ID
 * @param {string} id ID do profissional
 * @param {Object} [options={}]
 */
export function useProfessionalDetailQuery(id, options = {}) {
  return useQuery({
    queryKey: [PROFESSIONALS_QUERY_KEY, 'detail', id],
    queryFn: () => getProfessionalById(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}
