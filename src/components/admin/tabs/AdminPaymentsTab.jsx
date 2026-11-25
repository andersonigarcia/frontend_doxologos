import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { auditLogger, AuditAction, LogLevel } from '@/lib/auditLogger';
import ConfirmDialog from '@/components/ConfirmDialog';
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
    const [paymentToDelete, setPaymentToDelete] = useState(null);

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

    const handleDeletePayment = (payment) => {
        setPaymentToDelete(payment);
    };

    const confirmDeletePayment = async () => {
        if (!paymentToDelete) return;
        const payment = paymentToDelete;

        if (payment.status === 'paid') {
            toast({
                title: 'Ação bloqueada por auditoria',
                description: 'Repasses já liquidados (pagos) não podem ser excluídos ou cancelados para preservar a trilha contábil.',
                variant: 'destructive'
            });
            setPaymentToDelete(null);
            return;
        }

        try {
            const { error } = await supabase
                .from('professional_payments')
                .update({ status: 'cancelled' })
                .eq('id', payment.id);

            if (error) throw error;

            await auditLogger.log(AuditAction.ADMIN_SETTINGS_CHANGE, {
                level: LogLevel.WARNING,
                resourceType: 'professional_payment',
                resourceId: payment.id,
                details: { action: 'cancel_professional_payment', previous_status: payment.status, amount: payment.total_amount }
            });

            toast({
                title: 'Repasse cancelado',
                description: `Lote de repasse de ${payment.professional?.name || 'profissional'} marcado como cancelado (histórico preservado).`
            });
            setPaymentRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('Error cancelling payment:', error);
            toast({
                title: 'Erro ao cancelar',
                description: error.message || 'Não foi possível cancelar o repasse',
                variant: 'destructive'
            });
        } finally {
            setPaymentToDelete(null);
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

            <ConfirmDialog
                isOpen={Boolean(paymentToDelete)}
                onClose={() => setPaymentToDelete(null)}
                onConfirm={confirmDeletePayment}
                title="Cancelar Lote de Repasse"
                message={`Tem certeza que deseja cancelar o lote de repasse de ${paymentToDelete?.professional?.name || 'profissional'}?`}
                warningMessage="O registro será mantido como 'Cancelado' para trilha de auditoria contábil. Repasses já pagos são protegidos contra cancelamento."
                confirmText="Cancelar Repasse"
                type="danger"
            />
        </div>
    );
}

export default AdminPaymentsTab;
