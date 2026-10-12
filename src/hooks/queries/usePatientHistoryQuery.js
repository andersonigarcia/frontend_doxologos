/**
 * Hook Reativo Canônico para Histórico e Tarefas do Paciente (Onda 3)
 * Consome patientService com cache unificado via TanStack Query.
 */
import { useQuery } from '@tanstack/react-query';
import {
  getPatientHomeworkTasks,
  getPatientNotesHistory
} from '@/services/patientService';

export const PATIENT_HISTORY_QUERY_KEY = 'patient-history';

/**
 * Hook para carregar tarefas de casa (homework) atribuídas ao paciente
 * @param {string} patientEmail
 * @param {Object} [options={}]
 */
export function usePatientHomeworkTasksQuery(patientEmail, options = {}) {
  return useQuery({
    queryKey: [PATIENT_HISTORY_QUERY_KEY, 'homework', patientEmail],
    queryFn: () => getPatientHomeworkTasks(patientEmail),
    enabled: Boolean(patientEmail),
    staleTime: 3 * 60 * 1000,   // 3 minutos
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook para carregar histórico clínico/prontuário estruturado do paciente
 * @param {string} patientEmail
 * @param {Object} [options={}]
 */
export function usePatientNotesHistoryQuery(patientEmail, options = {}) {
  return useQuery({
    queryKey: [PATIENT_HISTORY_QUERY_KEY, 'notes', patientEmail],
    queryFn: () => getPatientNotesHistory(patientEmail),
    enabled: Boolean(patientEmail),
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    ...options,
  });
}
