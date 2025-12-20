import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook para cálculo de pagamentos aos profissionais
 * 
 * @param {string} professionalId - ID do profissional (opcional, se não fornecido busca todos)
 * @param {string} startDate - Data inicial do período (YYYY-MM-DD)
 * @param {string} endDate - Data final do período (YYYY-MM-DD)
 * @returns {Object} Dados de pagamentos calculados e estado de loading
 */
export function usePaymentCalculation(professionalId = null, startDate = null, endDate = null) {
    const [data, setData] = useState({
        pendingPayments: [],
        paidPayments: [],
        totalPending: 0,
        totalPaid: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const calculatePayments = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Buscar pagamentos existentes
            let paymentsQuery = supabase
                .from('professional_payments')
                .select(`
                    *,
                    professional:professionals(id, name, email)
                `)
                .order('created_at', { ascending: false });

            if (professionalId) {
                paymentsQuery = paymentsQuery.eq('professional_id', professionalId);
            }

            if (startDate) {
                paymentsQuery = paymentsQuery.gte('period_start', startDate);
            }

            if (endDate) {
                paymentsQuery = paymentsQuery.lte('period_end', endDate);
            }

            const { data: payments, error: paymentsError } = await paymentsQuery;

            if (paymentsError) throw paymentsError;

            // Separar por status
            const pendingPayments = (payments || []).filter(p => p.status === 'pending');
            const paidPayments = (payments || []).filter(p => p.status === 'paid');

            // Calcular totais
            const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);
            const totalPaid = paidPayments.reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0);

            setData({
                pendingPayments,
                paidPayments,
                totalPending,
                totalPaid,
            });
        } catch (err) {
            console.error('Error calculating payments:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [professionalId, startDate, endDate]);

    useEffect(() => {
        calculatePayments();
    }, [calculatePayments]);

    return { ...data, loading, error, refresh: calculatePayments };
}

/**
 * Hook para calcular valor pendente de um profissional em um período
 * 
 * @param {string} professionalId - ID do profissional
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 * @returns {Object} Valor calculado e agendamentos
 */
export function usePendingPaymentAmount(professionalId, startDate, endDate) {
    const [data, setData] = useState({
        totalAmount: 0,
        bookings: [],
        totalBookings: 0,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const calculate = useCallback(async () => {
        if (!professionalId || !startDate || !endDate) {
            setData({ totalAmount: 0, bookings: [], totalBookings: 0 });
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Buscar agendamentos confirmados/pagos/completados no período
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
                    id,
                    booking_date,
                    booking_time,
                    patient_name,
                    valor_repasse_profissional,
                    status,
                    service:services(name)
                `)
                .eq('professional_id', professionalId)
                .gte('booking_date', startDate)
                .lte('booking_date', endDate)
                .in('status', ['confirmed', 'paid', 'completed'])
                .order('booking_date', { ascending: true });

            if (bookingsError) throw bookingsError;

            // Verificar quais já foram pagos
            const { data: paidBookings, error: paidError } = await supabase
                .from('payment_bookings')
                .select('booking_id');

            if (paidError) throw paidError;

            const paidBookingIds = new Set((paidBookings || []).map(pb => pb.booking_id));

            // Filtrar apenas bookings não pagos
            const unpaidBookings = (bookings || []).filter(b => !paidBookingIds.has(b.id));

            // Calcular total
            const totalAmount = unpaidBookings.reduce((sum, b) =>
                sum + parseFloat(b.valor_repasse_profissional || 0), 0
            );

            setData({
                totalAmount,
                bookings: unpaidBookings,
                totalBookings: unpaidBookings.length,
            });
        } catch (err) {
            console.error('Error calculating pending amount:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [professionalId, startDate, endDate]);

    useEffect(() => {
        calculate();
    }, [calculate]);

    return { ...data, loading, error, refresh: calculate };
}

export default usePaymentCalculation;
