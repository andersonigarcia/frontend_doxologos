import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Calendar, Check, Clock, Download, Eye, X, Plus, Filter, Trash2, Search, CheckCircle2, User, Edit3 } from 'lucide-react';
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

    const getInitials = (name) => {
        if (!name) return 'PR';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const getStatusBadge = (status) => {
        if (status === 'paid') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-200 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Pago
                </span>
            );
        }
        if (status === 'pending') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100/80 text-amber-800 border border-amber-200 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Pendente
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Cancelado
            </span>
        );
    };

    const getPaymentMethodLabel = (method) => {
        const methods = {
            pix: '⚡ PIX',
            transferencia: '🏦 Transferência',
            dinheiro: '💵 Dinheiro',
            outro: '💳 Outro'
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
    const allCount = pendingPayments.length + paidPayments.length;

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
                    className="bg-gradient-to-br from-amber-50/80 to-amber-100/60 rounded-2xl border border-amber-200/80 p-6 shadow-sm flex items-center justify-between"
                >
                    <div>
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Pagamentos Pendentes</p>
                        <p className="text-3xl font-extrabold text-amber-950">{formatCurrency(totalPending)}</p>
                        <p className="text-xs font-medium text-amber-700 mt-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {pendingPayments.length} repasse(s) a liberar
                        </p>
                    </div>
                    <div className="p-3.5 bg-amber-200/50 rounded-2xl text-amber-700">
                        <Clock className="w-8 h-8" />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/60 rounded-2xl border border-emerald-200/80 p-6 shadow-sm flex items-center justify-between"
                >
                    <div>
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Pagamentos Realizados</p>
                        <p className="text-3xl font-extrabold text-emerald-950">{formatCurrency(totalPaid)}</p>
                        <p className="text-xs font-medium text-emerald-700 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {paidPayments.length} repasse(s) efetuados
                        </p>
                    </div>
                    <div className="p-3.5 bg-emerald-200/50 rounded-2xl text-emerald-700">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                </motion.div>
            </div>

            {/* Filtros e Ações */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-[#2d8659]" />
                            Pagamentos aos Profissionais
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Gerencie o fluxo de repasses e histórico financeiro dos psicólogos.
                        </p>
                    </div>

                    <Button
                        onClick={() => onCreatePayment()}
                        className="bg-[#2d8659] hover:bg-[#236b47] text-white rounded-xl shadow-sm px-5 font-semibold text-xs h-10"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        Novo Pagamento
                    </Button>
                </div>

                {/* Filtros de Aba e Busca */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={cn(
                                'px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all',
                                statusFilter === 'all'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            )}
                        >
                            Todos ({allCount})
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('pending')}
                            className={cn(
                                'px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
                                statusFilter === 'pending'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-amber-700 hover:text-amber-900'
                            )}
                        >
                            Pendentes ({pendingPayments.length})
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('paid')}
                            className={cn(
                                'px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5',
                                statusFilter === 'paid'
                                    ? 'bg-[#2d8659] text-white shadow-xs'
                                    : 'text-emerald-700 hover:text-emerald-900'
                            )}
                        >
                            Pagos ({paidPayments.length})
                        </button>
                    </div>

                    <div className="relative flex-1 sm:max-w-xs">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar por profissional ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#2d8659]/30 focus:border-[#2d8659] transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Lista de Pagamentos */}
                {payments.length === 0 ? (
                    <EmptyState
                        icon={DollarSign}
                        title="Nenhum pagamento encontrado"
                        description={
                            statusFilter === 'pending'
                                ? "Não há repasses pendentes no momento"
                                : statusFilter === 'paid'
                                    ? "Nenhum pagamento foi realizado ainda"
                                    : "Crie um novo pagamento para começar"
                        }
                        action={statusFilter === 'all' ? {
                            label: 'Criar Pagamento',
                            onClick: () => onCreatePayment()
                        } : undefined}
                        compact={true}
                    />
                ) : (
                    <div className="space-y-3">
                        {payments.map((payment, index) => {
                            const isPaid = payment.status === 'paid';
                            const profName = payment.professional?.name || 'Profissional não encontrado';
                            const initials = getInitials(profName);

                            return (
                                <motion.div
                                    key={payment.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className={cn(
                                        "group bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:border-slate-300 relative overflow-hidden",
                                        isPaid ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-amber-500"
                                    )}
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                        {/* Informações do Profissional e Detalhes */}
                                        <div className="flex items-start gap-4">
                                            {/* Avatar do Profissional */}
                                            <div className={cn(
                                                "w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-2xs mt-0.5",
                                                isPaid 
                                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200/80" 
                                                    : "bg-amber-50 text-amber-800 border-amber-200/80"
                                            )}>
                                                {initials}
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    <h3 className="font-bold text-slate-900 text-base group-hover:text-[#2d8659] transition-colors">
                                                        {profName}
                                                    </h3>
                                                    {getStatusBadge(payment.status)}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                                    <span className="inline-flex items-center gap-1 bg-slate-100/80 text-slate-700 px-2.5 py-1 rounded-lg font-medium">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                        {formatDate(payment.period_start)} — {formatDate(payment.period_end)}
                                                    </span>

                                                    <span className="inline-flex items-center gap-1 bg-slate-100/80 text-slate-700 px-2.5 py-1 rounded-lg font-medium">
                                                        <strong>{payment.total_bookings}</strong> {payment.total_bookings === 1 ? 'consulta' : 'consultas'}
                                                    </span>

                                                    {payment.payment_method && (
                                                        <span className="inline-flex items-center gap-1 bg-indigo-50/80 text-indigo-800 px-2.5 py-1 rounded-lg font-bold border border-indigo-100">
                                                            {getPaymentMethodLabel(payment.payment_method)}
                                                        </span>
                                                    )}
                                                </div>

                                                {payment.payment_date && (
                                                    <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        Pago em: {formatDate(payment.payment_date)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Valor e Ações */}
                                        <div className="flex items-center justify-between lg:justify-end gap-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                                            <div className="text-left lg:text-right">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Valor do Repasse</span>
                                                <p className="text-2xl font-extrabold text-[#2d8659]">
                                                    {formatCurrency(payment.total_amount)}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200/60">
                                                <button
                                                    type="button"
                                                    onClick={() => onViewDetails(payment)}
                                                    className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white shadow-2xs transition-all"
                                                    title="Ver Detalhes do Repasse"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => onCreatePayment(payment)}
                                                    className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white shadow-2xs transition-all"
                                                    title="Editar Dados do Repasse"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>

                                                {payment.status === 'pending' && (
                                                    <Button
                                                        size="sm"
                                                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 ml-1 shadow-xs"
                                                        onClick={() => onMarkAsPaid(payment)}
                                                    >
                                                        <Check className="w-3.5 h-3.5 mr-1" />
                                                        Pagar
                                                    </Button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPaymentToDelete(payment);
                                                        setDeleteConfirmOpen(true);
                                                    }}
                                                    className="p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all"
                                                    title="Excluir Repasse"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
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
