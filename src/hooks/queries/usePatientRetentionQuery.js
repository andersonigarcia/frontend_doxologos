/**
 * usePatientRetentionQuery — Hook Reativo Canônico para Acompanhamento e Retenção de Pacientes (TanStack Query)
 * 
 * Centraliza o monitoramento de pacientes em risco de abandono clínico e ausência de retorno,
 * integrando a camada de serviços canônica (bookingService), cache com invalidação atômica e
 * persistência local de status de acompanhamento pelo time administrativo.
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listBookings } from '@/services/bookingService';
import { computePatientFollowUpAndRetention } from '@/lib/adminMetrics';

export const PATIENT_RETENTION_QUERY_KEY = 'patient-retention-radar';
const ADMIN_STATUS_STORAGE_KEY = 'doxologos_patient_retention_status_v1';

function getStoredAdminStatusMap() {
    try {
        const raw = localStorage.getItem(ADMIN_STATUS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('[usePatientRetentionQuery] Erro ao carregar status local de retenção:', e);
    }
    return {};
}

function saveAdminStatusMap(map) {
    try {
        localStorage.setItem(ADMIN_STATUS_STORAGE_KEY, JSON.stringify(map));
    } catch (e) {
        console.warn('[usePatientRetentionQuery] Erro ao salvar status local de retenção:', e);
    }
}

/**
 * Hook para radar de acompanhamento e retenção de pacientes
 * @param {Object} [options={}]
 * @param {Array} [options.initialBookings=null] - Bookings pré-carregados (opcional para evitar refetch)
 * @param {Date} [options.referenceDate=new Date()]
 * @param {Object} [options.queryOptions={}]
 */
export function usePatientRetentionQuery(options = {}) {
    const queryClient = useQueryClient();
    const [adminStatusMap, setAdminStatusMap] = useState(getStoredAdminStatusMap);

    const {
        data: rawBookings = [],
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: [PATIENT_RETENTION_QUERY_KEY, 'bookings'],
        queryFn: () => listBookings({}),
        staleTime: 2 * 60 * 1000, // 2 minutos de cache fresco
        gcTime: 10 * 60 * 1000,
        enabled: !options.initialBookings,
        ...options.queryOptions
    });

    const activeBookings = options.initialBookings || rawBookings;

    const retentionData = useMemo(() => {
        return computePatientFollowUpAndRetention(activeBookings, {
            referenceDate: options.referenceDate || new Date(),
            adminStatusMap
        });
    }, [activeBookings, adminStatusMap, options.referenceDate]);

    const updatePatientStatus = useCallback((patientId, status, notes = '') => {
        if (!patientId) return;

        setAdminStatusMap((prev) => {
            const next = {
                ...prev,
                [patientId]: {
                    status,
                    notes: notes !== undefined ? notes : (prev[patientId]?.notes || ''),
                    updated_at: new Date().toISOString()
                }
            };
            saveAdminStatusMap(next);
            return next;
        });
    }, []);

    const resetPatientStatus = useCallback((patientId) => {
        if (!patientId) return;

        setAdminStatusMap((prev) => {
            const next = { ...prev };
            delete next[patientId];
            saveAdminStatusMap(next);
            return next;
        });
    }, []);

    return {
        summary: retentionData.summary,
        patients: retentionData.patients,
        adminStatusMap,
        updatePatientStatus,
        resetPatientStatus,
        isLoading,
        error,
        refetch
    };
}

export default usePatientRetentionQuery;
