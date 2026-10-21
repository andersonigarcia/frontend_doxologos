import React from 'react';
import { X, Download, Calendar, DollarSign, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * PaymentDetailsModal - Modal para visualizar detalhes do pagamento
 */
export function PaymentDetailsModal({ open, onClose, payment, bookings = [] }) {
    if (!payment) return null;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { label: 'Pendente', className: 'bg-orange-100 text-orange-800' },
            paid: { label: 'Pago', className: 'bg-green-100 text-green-800' },
            cancelled: { label: 'Cancelado', className: 'bg-gray-100 text-gray-800' }
        };
        const badge = badges[status] || badges.pending;
        return <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', badge.className)}>{badge.label}</span>;
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-800" />
                        Detalhes do Pagamento
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Informações Principais */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Profissional</p>
                            <p className="font-semibold">{payment.professional?.name}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Status</p>
                            {getStatusBadge(payment.status)}
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Período</p>
                            <p className="font-semibold">
                                {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Valor Total</p>
                            <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">{formatCurrency(payment.total_amount)}</p>
                        </div>
                    </div>

                    {/* Informações de Pagamento */}
                    {payment.payment_date && (
                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-3">Informações de Pagamento</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600">Data do Pagamento</p>
                                    <p className="font-semibold">{formatDate(payment.payment_date)}</p>
                                </div>
                                {payment.payment_method && (
                                    <div>
                                        <p className="text-sm text-gray-600">Método</p>
                                        <p className="font-semibold capitalize">{payment.payment_method}</p>
                                    </div>
                                )}
                            </div>
                            {payment.payment_proof_url && (
                                <div className="mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(payment.payment_proof_url, '_blank')}
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Ver Comprovante
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Agendamentos */}
                    {bookings.length > 0 && (
                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-3">Consultas Incluídas ({bookings.length})</h3>
                            <div className="max-h-64 overflow-y-auto space-y-2">
                                {bookings.map(booking => (
                                    <div key={booking.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                                        <div>
                                            <p className="font-medium">{booking.patient_name}</p>
                                            <p className="text-sm text-gray-600">
                                                {formatDate(booking.booking_date)} - {booking.booking_time}
                                            </p>
                                        </div>
                                        <p className="font-bold text-emerald-700 tabular-nums">
                                            {formatCurrency(booking.valor_repasse_profissional)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notas e Discriminativo de Repasse */}
                    {payment.notes && (
                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-2 text-sm text-slate-800">Observações & Extrato</h3>
                            {payment.notes.includes('[Extrato de Repasse:') ? (
                                <div className="space-y-2">
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
                                        {payment.notes.split('[Extrato de Repasse:')[0].trim() && (
                                            <p className="mb-2 text-slate-600">{payment.notes.split('[Extrato de Repasse:')[0].trim()}</p>
                                        )}
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
                                            Extrato Consolidado: [Extrato de Repasse:{payment.notes.split('[Extrato de Repasse:')[1]}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-700 text-xs whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-200">{payment.notes}</p>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default PaymentDetailsModal;
