/**
 * usePatientData — Dados de pacientes agrupados por profissional ou visão global admin
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/customSupabaseClient';

async function fetchPatientData(professionalId) {
    let query = supabase
        .from('bookings')
        .select(`
      *,
      service:services(name, price),
      professional:professionals(name)
    `)
        .order('booking_date', { ascending: false });

    if (professionalId) {
        query = query.eq('professional_id', professionalId);
    }

    const { data: bookings, error } = await query;

    if (error) throw error;

    // Agrupar por paciente
    const patientMap = {};

    (bookings || []).forEach((booking) => {
        // Prioriza email; se ausente, combina telefone com nome para evitar colisão entre homônimos
        const cleanEmail = booking.patient_email?.trim()?.toLowerCase();
        const cleanPhone = booking.patient_phone?.replace(/\D/g, '');
        const cleanName = booking.patient_name?.trim()?.toLowerCase();
        const patientKey = cleanEmail || (cleanPhone ? `${cleanPhone}_${cleanName}` : cleanName) || 'unknown';

        if (!patientMap[patientKey]) {
            patientMap[patientKey] = {
                id: patientKey,
                name: booking.patient_name || 'Nome não informado',
                email: booking.patient_email || '',
                phone: booking.patient_phone || '',
                bookings: [],
                totalBookings: 0,
                validBookings: 0,
                totalSpent: 0,
                totalRepasse: 0,
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

        const isCancelled = booking.status && booking.status.includes('cancelled');
        if (!isCancelled && booking.status !== 'expired') {
            patient.validBookings++;
        }

        if (['confirmed', 'paid', 'completed'].includes(booking.status)) {
            const consultationPrice = parseFloat(booking.valor_consulta || booking.service?.price) || 0;
            const fallbackPayout = booking.service?.professional_payout 
                ? parseFloat(booking.service.professional_payout) 
                : (consultationPrice * 0.60); // 60% taxa padrão de repasse em vez de 100%

            patient.totalSpent += consultationPrice;
            patient.totalRepasse += parseFloat(booking.valor_repasse_profissional) || fallbackPayout;
        }

        if (booking.status === 'completed') {
            patient.completedBookings++;
        } else if (booking.status && booking.status.includes('cancelled')) {
            patient.cancelledBookings++;
        } else if (['pending', 'awaiting_payment'].includes(booking.status)) {
            patient.pendingBookings++;
        }

        const bookingDate = new Date(booking.booking_date);
        if (!patient.lastBookingDate || bookingDate > patient.lastBookingDate) {
            patient.lastBookingDate = bookingDate;
        }
        if (!patient.firstBookingDate || bookingDate < patient.firstBookingDate) {
            patient.firstBookingDate = bookingDate;
        }
    });

    return Object.values(patientMap).map((patient) => ({
        ...patient,
        lastBookingDate: patient.lastBookingDate?.toISOString().split('T')[0],
        firstBookingDate: patient.firstBookingDate?.toISOString().split('T')[0],
    }));
}

/**
 * @param {string|null} professionalId - ID do profissional (opcional). Se null, busca todos (visão admin).
 */
export function usePatientData(professionalId = null) {
    const query = useQuery({
        queryKey: ['patientData', professionalId || 'all'],
        queryFn: () => fetchPatientData(professionalId),
        staleTime: 5 * 60 * 1000,
        retry: 2,
        enabled: true,
    });

    return {
        patients: query.data ?? [],
        loading: query.isLoading,
        error: query.error,
        refresh: query.refetch,
    };
}

export default usePatientData;
