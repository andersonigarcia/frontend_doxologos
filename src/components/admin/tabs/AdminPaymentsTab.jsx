import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { ProfessionalPaymentsList } from '@/components/admin/ProfessionalPaymentsList';
import { PaymentFormModal } from '@/components/admin/PaymentFormModal';
import { PaymentDetailsModal } from '@/components/admin/PaymentDetailsModal';

export function AdminPaymentsTab({ professionals = [] }) {
    const { toast } = useToast();
    const [paymentRefreshKey, setPaymentRefreshKey] = useState(0);
    const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
    const [isPaymentDetailsOpen, setIsPaymentDetailsOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [paymentBookings, setPaymentBookings] = useState([]);

    const handleCreatePayment = (payment = null) => {
        setSelectedPayment(payment);
        setIsPaymentFormOpen(true);
    };

    const handleViewDetails = async (payment) => {
        setSelectedPayment(payment);
        try {
            const { data: bookings, error } = await supabase
                .from('payment_bookings')
                .select(`
                    booking_id,
                    amount,
                    bookings (
                        id,
                        booking_date,
                        booking_time,
                        patient_name,
                        valor_repasse_profissional
                    )
                `)
                .eq('payment_id', payment.id);

            if (error) throw error;
            const bookingsList = (bookings || []).map(pb => pb.bookings).filter(Boolean);
            setPaymentBookings(bookingsList);
        } catch (error) {
            console.error('Error fetching payment bookings:', error);
            setPaymentBookings([]);
        }
        setIsPaymentDetailsOpen(true);
    };

    const handleDeletePayment = async (payment) => {
        if (!window.confirm(`Tem certeza que deseja excluir o pagamento de ${payment.professional?.name}?`)) {
            return;
        }

        try {
            await supabase
                .from('payment_bookings')
                .delete()
                .eq('payment_id', payment.id);

            const { error } = await supabase
                .from('professional_payments')
                .delete()
                .eq('id', payment.id);

            if (error) throw error;

            toast({
                title: 'Pagamento excluído',
                description: `Pagamento de ${payment.professional?.name} excluído com sucesso.`
            });
            setPaymentRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('Error deleting payment:', error);
            toast({
                title: 'Erro ao excluir',
                description: error.message || 'Não foi possível excluir o pagamento',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="space-y-6">
            <ProfessionalPaymentsList
                key={paymentRefreshKey}
                onCreatePayment={handleCreatePayment}
                onViewDetails={handleViewDetails}
                onMarkAsPaid={handleCreatePayment}
                onDelete={handleDeletePayment}
            />

            <PaymentFormModal
                open={isPaymentFormOpen}
                onClose={() => {
                    setIsPaymentFormOpen(false);
                    setSelectedPayment(null);
                }}
                payment={selectedPayment}
                professionals={professionals}
                onSuccess={() => {
                    setPaymentRefreshKey(prev => prev + 1);
                    toast({
                        title: 'Sucesso',
                        description: selectedPayment ? 'Pagamento atualizado' : 'Pagamento criado'
                    });
                }}
            />

            <PaymentDetailsModal
                open={isPaymentDetailsOpen}
                onClose={() => {
                    setIsPaymentDetailsOpen(false);
                    setSelectedPayment(null);
                    setPaymentBookings([]);
                }}
                payment={selectedPayment}
                bookings={paymentBookings}
            />
        </div>
    );
}

export default AdminPaymentsTab;
