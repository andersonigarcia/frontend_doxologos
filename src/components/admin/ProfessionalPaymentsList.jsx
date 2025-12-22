import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, Check, Clock, Download, Eye, X, Plus, Filter, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SkeletonTable, EmptyState } from '@/components/common';
import { usePaymentCalculation } from '@/hooks/usePaymentCalculation';
import { cn } from '@/lib/utils';

/**
 * ProfessionalPaymentsList - Lista de pagamentos aos profissionais
 * 
 * @param {Object} props
 * @param {Function} props.onCreatePayment - Callback para criar novo pagamento
 * @param {Function} props.onViewDetails - Callback para ver detalhes
 * @param {Function} props.onMarkAsPaid - Callback para marcar como pago
 * @param {string} props.className - Classes CSS adicionais
 */
export function ProfessionalPaymentsList({
    onCreatePayment,
    onViewDetails,
    onMarkAsPaid,
    onDelete,
    className = ''
}) {
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'paid'
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState(null);

    const { pendingPayments, paidPayments, totalPending, totalPaid, loading, refresh } = usePaymentCalculation();

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: {
                label: 'Pendente',
                className: 'bg-orange-100 text-orange-800 border-orange-200'
            },
            paid: {
                label: 'Pago',
                className: 'bg-green-100 text-green-800 border-green-200'
            },
            cancelled: {
                label: 'Cancelado',
                className: 'bg-gray-100 text-gray-800 border-gray-200'
            }
        };

        const badge = badges[status] || badges.pending;

        return (
            <span className={cn(
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                badge.className
            )}>
                {badge.label}
            </span>
        );
    };

    const getPaymentMethodLabel = (method) => {
        const methods = {
            pix: 'PIX',
            transferencia: 'Transferência',
            dinheiro: 'Dinheiro',
            outro: 'Outro'
        };
        return methods[method] || method || '-';
    };

    // Filtrar pagamentos
    const filteredPayments = () => {
        let payments = [];

        if (statusFilter === 'all') {
            payments = [...pendingPayments, ...paidPayments];
        } else if (statusFilter === 'pending') {
            payments = pendingPayments;
        } else if (statusFilter === 'paid') {
            payments = paidPayments;
        }

        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            payments = payments.filter(p =>
                p.professional?.name?.toLowerCase().includes(search) ||
                p.professional?.email?.toLowerCase().includes(search)
            );
        }

        return payments;
    };

    const payments = filteredPayments();

    if (loading) {
        return (
            <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden', className)}>
                <div className="p-6">
                    <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-4" />
                </div>
                <SkeletonTable rows={8} columns={6} />
            </div>
        );
    }

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header com Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-6"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-orange-600 mb-1">Pagamentos Pendentes</p>
                            <p className="text-3xl font-bold text-orange-900">{formatCurrency(totalPending)}</p>
                            <p className="text-xs text-orange-600 mt-1">{pendingPayments.length} pagamento(s)</p>
                        </div>
                        <Clock className="w-12 h-12 text-orange-400" />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-600 mb-1">Pagamentos Realizados</p>
                            <p className="text-3xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
                            <p className="text-xs text-green-600 mt-1">{paidPayments.length} pagamento(s)</p>
                        </div>
                        <Check className="w-12 h-12 text-green-400" />
                    </div>
                </motion.div>
            </div>

            {/* Filtros e Ações */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <DollarSign className="w-6 h-6 text-[#2d8659]" />
                            Pagamentos aos Profissionais
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Gerencie pagamentos e histórico de repasses
                        </p>
                    </div>

                    <Button
                        onClick={onCreatePayment}
                        className="bg-[#2d8659] hover:bg-[#236b47]"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Pagamento
                    </Button>
                </div>

                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex gap-2">
                        <Button
                            variant={statusFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('all')}
                            className={statusFilter === 'all' ? 'bg-[#2d8659] hover:bg-[#236b47]' : ''}
                        >
                            Todos
                        </Button>
                        <Button
                            variant={statusFilter === 'pending' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('pending')}
                            className={statusFilter === 'pending' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                        >
                            Pendentes
                        </Button>
                        <Button
                            variant={statusFilter === 'paid' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter('paid')}
                            className={statusFilter === 'paid' ? 'bg-green-600 hover:bg-green-700' : ''}
                        >
                            Pagos
                        </Button>
                    </div>

                    <input
                        type="text"
                        placeholder="Buscar profissional..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                    />
                </div>

                {/* Lista de Pagamentos */}
                {payments.length === 0 ? (
                    <EmptyState
                        icon={DollarSign}
                        title="Nenhum pagamento encontrado"
                        description={
                            statusFilter === 'pending'
                                ? "Não há pagamentos pendentes no momento"
                                : statusFilter === 'paid'
                                    ? "Nenhum pagamento foi realizado ainda"
                                    : "Crie um novo pagamento para começar"
                        }
                        action={statusFilter === 'all' ? {
                            label: 'Criar Pagamento',
                            onClick: onCreatePayment
                        } : undefined}
                        compact={true}
                    />
                ) : (
                    <div className="space-y-3">
                        {payments.map((payment, index) => (
                            <motion.div
                                key={payment.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-gray-900">
                                                {payment.professional?.name || 'Profissional não encontrado'}
                                            </h3>
                                            {getStatusBadge(payment.status)}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                <span>
                                                    {formatDate(payment.period_start)} - {formatDate(payment.period_end)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-medium">{payment.total_bookings}</span> consulta(s)
                                            </div>
                                            {payment.payment_method && (
                                                <div>
                                                    Método: {getPaymentMethodLabel(payment.payment_method)}
                                                </div>
                                            )}
                                        </div>

                                        {payment.payment_date && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Pago em: {formatDate(payment.payment_date)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-[#2d8659]">
                                                {formatCurrency(payment.total_amount)}
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onViewDetails(payment)}
                                                title="Ver Detalhes"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>

                                            {payment.status === 'pending' && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onCreatePayment(payment)}
                                                        title="Editar Pagamento"
                                                    >
                                                        <span className="sr-only">Editar</span>
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="w-4 h-4"
                                                        >
                                                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                                                        </svg>
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                        onClick={() => onMarkAsPaid(payment)}
                                                    >
                                                        <Check className="w-4 h-4 mr-1" />
                                                        Marcar como Pago
                                                    </Button>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => {
                                                            setPaymentToDelete(payment);
                                                            setDeleteConfirmOpen(true);
                                                        }}
                                                        title="Excluir Pagamento"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>Tem certeza que deseja excluir este pagamento?</p>
                            {paymentToDelete && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-1 text-sm">
                                    <p><strong>Profissional:</strong> {paymentToDelete.professional?.name}</p>
                                    <p><strong>Período:</strong> {formatDate(paymentToDelete.period_start)} - {formatDate(paymentToDelete.period_end)}</p>
                                    <p><strong>Valor:</strong> {formatCurrency(paymentToDelete.total_amount)}</p>
                                    <p><strong>Consultas:</strong> {paymentToDelete.total_bookings}</p>
                                </div>
                            )}
                            <p className="text-red-600 font-medium mt-4">
                                ⚠️ Esta ação não pode ser desfeita.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPaymentToDelete(null)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (paymentToDelete) {
                                    onDelete(paymentToDelete);
                                    setPaymentToDelete(null);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Excluir Pagamento
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default ProfessionalPaymentsList;
