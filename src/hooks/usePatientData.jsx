import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook para dados de pacientes do profissional
 * 
 * Agrupa bookings por paciente e calcula estatísticas
 * 
 * @param {string} professionalId - ID do profissional
 * @returns {Object} Lista de pacientes com estatísticas
 */
export function usePatientData(professionalId = null) {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPatientData = useCallback(async () => {
        if (!professionalId) {
            setPatients([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Buscar todos os agendamentos do profissional
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
                    *,
                    service:services(name, price),
                    professional:professionals(name)
                `)
                .eq('professional_id', professionalId)
                .order('booking_date', { ascending: false });

            if (bookingsError) throw bookingsError;

            // Agrupar por paciente
            const patientMap = {};

            (bookings || []).forEach(booking => {
                const patientKey = booking.patient_email || booking.patient_name || 'unknown';

                if (!patientMap[patientKey]) {
                    patientMap[patientKey] = {
                        id: patientKey,
                        name: booking.patient_name || 'Nome não informado',
                        email: booking.patient_email || '',
                        phone: booking.patient_phone || '',
                        bookings: [],
                        totalBookings: 0,
                        totalSpent: 0,
                        lastBookingDate: null,
                        firstBookingDate: null,
                        completedBookings: 0,
                        cancelledBookings: 0,
                        pendingBookings: 0,
                    };
                }

                const patient = patientMap[patientKey];
                patient.bookings.push(booking);
                patient.totalBookings++;

                // Calcular total gasto (apenas confirmados/pagos/completados)
                if (['confirmed', 'paid', 'completed'].includes(booking.status)) {
                    const amount = parseFloat(booking.valor_repasse_profissional) || 0;
                    patient.totalSpent += amount;
                }

                // Contar por status
                if (booking.status === 'completed') {
                    patient.completedBookings++;
                } else if (booking.status.includes('cancelled')) {
                    patient.cancelledBookings++;
                } else if (['pending', 'awaiting_payment'].includes(booking.status)) {
                    patient.pendingBookings++;
                }

                // Atualizar datas
                const bookingDate = new Date(booking.booking_date);
                if (!patient.lastBookingDate || bookingDate > patient.lastBookingDate) {
                    patient.lastBookingDate = bookingDate;
                }
                if (!patient.firstBookingDate || bookingDate < patient.firstBookingDate) {
                    patient.firstBookingDate = bookingDate;
                }
            });

            // Converter para array e ordenar por última consulta
            const patientsArray = Object.values(patientMap).map(patient => ({
                ...patient,
                lastBookingDate: patient.lastBookingDate?.toISOString().split('T')[0],
                firstBookingDate: patient.firstBookingDate?.toISOString().split('T')[0],
            }));

            setPatients(patientsArray);

        } catch (err) {
            console.error('Erro ao buscar dados de pacientes:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [professionalId]);

    useEffect(() => {
        fetchPatientData();
    }, [fetchPatientData]);

    return {
        patients,
        loading,
        error,
        refresh: fetchPatientData,
    };
}

export default usePatientData;
