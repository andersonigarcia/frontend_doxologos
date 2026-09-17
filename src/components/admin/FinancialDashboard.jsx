import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Clock, Download, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/common/StatCard';
import { SkeletonStatsGrid, SkeletonList } from '@/components/common/SkeletonLoaders';
import { InfoTooltip, EmptyState } from '@/components/common';
import { useFinancialData } from '@/hooks/useFinancialData';
import { usePaymentCalculation } from '@/hooks/usePaymentCalculation';
import { cn } from '@/lib/utils';

/**
 * FinancialDashboard - Dashboard financeiro para profissionais
 * 
 * @param {Object} props
 * @param {string} props.professionalId - ID do profissional
 * @param {string} props.className - Classes CSS adicionais
 */
export function FinancialDashboard({ professionalId, className = '' }) {
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const {
        dailyRevenue,
        weeklyRevenue,
        monthlyRevenue,
        pendingPayments,
        serviceBreakdown,
        totalPending,
        loading: financialLoading
    } = useFinancialData(professionalId, dateRange.start, dateRange.end);

    const { 
        pendingPayments: payoutsPending, 
        paidPayments: payoutsPaid, 
        totalPending: totalPayoutPending, 
        totalPaid: totalPayoutPaid, 
        loading: payoutsLoading 
    } = usePaymentCalculation(professionalId, dateRange.start, dateRange.end);

    const loading = financialLoading || payoutsLoading;

    const handleExportCSV = () => {
        // Prepare CSV data
        const csvData = [
            ['Relatório Financeiro'],
            ['Período', `${dateRange.start} a ${dateRange.end}`],
            [''],
            ['Resumo'],
            ['Receita Diária', dailyRevenue.toFixed(2)],
            ['Receita Semanal', weeklyRevenue.toFixed(2)],
            ['Receita do Período', monthlyRevenue.toFixed(2)],
            ['Repasses Pagos (Período)', totalPayoutPaid.toFixed(2)],
            ['Repasses Pendentes (Período)', totalPayoutPending.toFixed(2)],
            ['Aguardando Pagto. de Pacientes', totalPending.toFixed(2)],
            [''],
            ['Receita por Serviço'],
            ['Serviço', 'Receita (R$)', 'Quantidade', 'Percentual (%)'],
            ...serviceBreakdown.map(s => [
                s.name,
                s.revenue.toFixed(2),
                s.count,
                ((s.revenue / monthlyRevenue) * 100).toFixed(1)
            ]),
            [''],
            ['Sessões com Pagamento Pendente'],
            ['Paciente', 'Data', 'Horário', 'Valor (R$)'],
            ...pendingPayments.map(p => [
                p.patient_name,
                new Date(p.booking_date).toLocaleDateString('pt-BR'),
                p.booking_time,
                parseFloat(p.valor_repasse_profissional || 0).toFixed(2)
            ])
        ];

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-financeiro-${dateRange.start}-${dateRange.end}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handlePresetFilter = (preset) => {
        const end = new Date().toISOString().split('T')[0];
        let start;

        switch (preset) {
            case 'today':
                start = end;
                break;
            case 'week':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                start = weekAgo.toISOString().split('T')[0];
                break;
            case 'month':
                start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
                break;
            case 'year':
                start = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
                break;
            default:
                start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        }

        setDateRange({ start, end });
    };

    if (loading) {
        return (
            <div className={cn('space-y-6', className)}>
                {/* Header Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>

                {/* Revenue Cards Skeleton */}
                <SkeletonStatsGrid cards={3} />

                {/* Pending Payments Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <SkeletonList items={3} showAvatar={false} />
                </div>

                {/* Service Breakdown Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="space-y-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                                <div className="h-4 bg-gray-200 rounded"></div>
                                <div className="h-2 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header with Period Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Dashboard Financeiro</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Período: {new Date(dateRange.start).toLocaleDateString('pt-BR')} até {new Date(dateRange.end).toLocaleDateString('pt-BR')}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePresetFilter('today')}
                            className="text-xs rounded-full"
                        >
                            Hoje
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePresetFilter('week')}
                            className="text-xs rounded-full"
                        >
                            Semana
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePresetFilter('month')}
                            className="text-xs rounded-full"
                        >
                            Mês
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePresetFilter('year')}
                            className="text-xs rounded-full"
                        >
                            Ano
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleExportCSV}
                            className="rounded-full bg-[#2d8659] hover:bg-[#236b47] text-xs"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Exportar CSV
                        </Button>
                    </div>
                </div>
            </div>

            {/* Revenue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="relative">
                        <StatCard
                            label="Receita Hoje"
                            tooltip="Soma dos valores recebidos hoje de consultas confirmadas, pagas ou completadas"
                            value={dailyRevenue}
                            format="currency"
                        />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="relative">
                        <StatCard
                            label="Receita Semana"
                            tooltip="Receita dos últimos 7 dias (consultas confirmadas, pagas ou completadas)"
                            value={weeklyRevenue}
                            format="currency"
                        />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="relative">
                        <StatCard
                            label="Receita do Período"
                            tooltip="Receita total do período selecionado (consultas confirmadas, pagas ou completadas)"
                            value={monthlyRevenue}
                            format="currency"
                        />
                    </div>
                </motion.div>
            </div>

            {/* Pending Payments */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-gray-900">Sessões com Pagamento Pendente</h3>
                    </div>
                    <span className="text-2xl font-bold text-orange-600">
                        R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {pendingPayments.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {pendingPayments.map((payment, index) => (
                            <motion.div
                                key={payment.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + index * 0.05 }}
                                className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200"
                            >
                                <div>
                                    <p className="font-medium text-gray-900">{payment.patient_name}</p>
                                    <p className="text-sm text-gray-600">
                                        {new Date(payment.booking_date).toLocaleDateString('pt-BR')} às {payment.booking_time}
                                    </p>
                                    {payment.service?.name && (
                                        <p className="text-xs text-gray-500">{payment.service.name}</p>
                                    )}
                                </div>
                                <span className="font-semibold text-orange-600 text-lg">
                                    R$ {parseFloat(payment.valor_repasse_profissional || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={Clock}
                        title="Nenhum pagamento aguardando"
                        description="Todos os pacientes estão em dia! 🎉"
                        compact={true}
                    />
                )}
            </motion.div>

            {/* Service Breakdown */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
            >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#2d8659]" />
                    Receita por Serviço
                </h3>

                {serviceBreakdown.length > 0 ? (
                    <div className="space-y-4">
                        {serviceBreakdown.map((service, index) => {
                            const percentage = monthlyRevenue > 0 ? (service.revenue / monthlyRevenue * 100) : 0;
                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 + index * 0.05 }}
                                    className="space-y-2"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-gray-900">{service.name}</span>
                                        <div className="text-right">
                                            <span className="font-semibold text-[#2d8659]">
                                                R$ {service.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-sm text-gray-600 ml-2">
                                                ({percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ delay: 0.7 + index * 0.05, duration: 0.5 }}
                                            className="bg-[#2d8659] h-2.5 rounded-full"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {service.count} {service.count === 1 ? 'consulta' : 'consultas'}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        icon={DollarSign}
                        title="Nenhum dado disponível"
                        description="Não há receita registrada para o período selecionado"
                        compact={true}
                    />
                )}
            </motion.div>

            {/* Payouts Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 bg-slate-50/50">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Repasses Financeiros (Período Selecionado)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Histórico de pagamentos da clínica para o profissional.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    {/* Paid Payouts */}
                    <div className="p-6 bg-emerald-50/30">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-emerald-800 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Pagos
                            </h4>
                            <span className="font-bold text-emerald-700">R$ {totalPayoutPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        
                        {payoutsPaid.length > 0 ? (
                            <div className="space-y-3">
                                {payoutsPaid.map(p => (
                                    <div key={p.id} className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm flex justify-between items-center text-sm">
                                        <div>
                                            <p className="font-medium text-slate-700">{new Date(p.period_start).toLocaleDateString('pt-BR')} - {new Date(p.period_end).toLocaleDateString('pt-BR')}</p>
                                            <p className="text-xs text-slate-500">{p.total_bookings} consultas</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-semibold text-emerald-600 block">R$ {parseFloat(p.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            {p.payment_date && <span className="text-[10px] text-emerald-500">Em {new Date(p.payment_date).toLocaleDateString('pt-BR')}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-emerald-600/70 text-center py-4">Nenhum repasse pago neste período.</p>
                        )}
                    </div>

                    {/* Pending Payouts */}
                    <div className="p-6 bg-amber-50/30">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-amber-800 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> A Liberar
                            </h4>
                            <span className="font-bold text-amber-700">R$ {totalPayoutPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                        
                        {payoutsPending.length > 0 ? (
                            <div className="space-y-3">
                                {payoutsPending.map(p => (
                                    <div key={p.id} className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm flex justify-between items-center text-sm">
                                        <div>
                                            <p className="font-medium text-slate-700">{new Date(p.period_start).toLocaleDateString('pt-BR')} - {new Date(p.period_end).toLocaleDateString('pt-BR')}</p>
                                            <p className="text-xs text-slate-500">{p.total_bookings} consultas</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-semibold text-amber-600 block">R$ {parseFloat(p.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            <span className="text-[10px] text-amber-500 uppercase font-bold">Pendente</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-amber-600/70 text-center py-4">Nenhum repasse a liberar neste período.</p>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default FinancialDashboard;
