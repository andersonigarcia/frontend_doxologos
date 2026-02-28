import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { toCents, fromCents } from '@/lib/money';

// M-01: parseFloat substituído por toCents/fromCents de money.js

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

            let query = supabase
                .from('professional_payments')
                .select('*, professional:professionals(id, name)')
                .order('created_at', { ascending: false });

            if (professionalId) query = query.eq('professional_id', professionalId);
            if (startDate) query = query.gte('period_start', startDate);
            if (endDate) query = query.lte('period_end', endDate);

            const { data: payments, error: paymentsError } = await query;
            if (paymentsError) throw paymentsError;

            const pendingPayments = (payments || []).filter(p => p.status === 'pending');
            const paidPayments = (payments || []).filter(p => p.status === 'paid');

            // M-01: soma via centavos
            const totalPendingCents = pendingPayments.reduce((s, p) => s + toCents(p.total_amount), 0);
            const totalPaidCents = paidPayments.reduce((s, p) => s + toCents(p.total_amount), 0);

            setData({
                pendingPayments,
                paidPayments,
                totalPending: fromCents(totalPendingCents),
                totalPaid: fromCents(totalPaidCents),
            });
        } catch (err) {
            console.error('Error calculating payments:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [professionalId, startDate, endDate]);

    useEffect(() => { calculatePayments(); }, [calculatePayments]);

    return { ...data, loading, error, refresh: calculatePayments };
}

export function usePendingPaymentAmount(professionalId, startDate, endDate, excludePaymentId = null) {
    const [data, setData] = useState({ totalAmount: 0, bookings: [], totalBookings: 0 });
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

            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('id, booking_date, booking_time, patient_name, valor_repasse_profissional, status, service:services(name)')
                .eq('professional_id', professionalId)
                .gte('booking_date', startDate)
                .lte('booking_date', endDate)
                .in('status', ['confirmed', 'paid', 'completed'])
                .order('booking_date', { ascending: true });

            if (bookingsError) throw bookingsError;

            const { data: paidBookings, error: paidError } = await supabase
                .from('payment_bookings')
                .select('booking_id, payment_id');

            if (paidError) throw paidError;

            const paidBookingIds = new Set(
                (paidBookings || [])
                    .filter(pb => pb.payment_id !== excludePaymentId)
                    .map(pb => pb.booking_id)
            );

            const unpaidBookings = (bookings || []).filter(b => !paidBookingIds.has(b.id));

            // M-01: soma via centavos
            const totalCents = unpaidBookings.reduce((s, b) => s + toCents(b.valor_repasse_profissional), 0);

            setData({ totalAmount: fromCents(totalCents), bookings: unpaidBookings, totalBookings: unpaidBookings.length });
        } catch (err) {
            console.error('Error calculating pending amount:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [professionalId, startDate, endDate, excludePaymentId]);

    useEffect(() => { calculate(); }, [calculate]);

    return { ...data, loading, error, refresh: calculate };
}

export default usePaymentCalculation;
