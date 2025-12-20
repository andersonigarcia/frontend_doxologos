import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Clock, Download, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/common/StatCard';
import { useFinancialData } from '@/hooks/useFinancialData';
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
        loading
    } = useFinancialData(professionalId, dateRange.start, dateRange.end);

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
            ['Pagamentos Pendentes', totalPending.toFixed(2)],
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
            ['Pagamentos Pendentes'],
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
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d8659]"></div>
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
                            className="text-xs"
                        >
                            Hoje
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePresetFilter('week')}
                            className="text-xs"
                        >
                            Semana
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePresetFilter('month')}
                            className="text-xs"
                        >
                            Mês
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePresetFilter('year')}
                            className="text-xs"
                        >
                            Ano
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleExportCSV}
                            className="bg-[#2d8659] hover:bg-[#236b47] text-xs"
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
                    <StatCard
                        title="Receita Hoje"
                        value={`R$ ${dailyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        icon={<DollarSign className="w-5 h-5" />}
                        iconColor="text-green-600"
                        iconBgColor="bg-green-100"
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <StatCard
                        title="Receita Semana"
                        value={`R$ ${weeklyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        icon={<TrendingUp className="w-5 h-5" />}
                        iconColor="text-blue-600"
                        iconBgColor="bg-blue-100"
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <StatCard
                        title="Receita do Período"
                        value={`R$ ${monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        icon={<Calendar className="w-5 h-5" />}
                        iconColor="text-purple-600"
                        iconBgColor="bg-purple-100"
                    />
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
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-600" />
                        <h3 className="text-lg font-semibold">Pagamentos Pendentes</h3>
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
                    <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Nenhum pagamento pendente</p>
                    </div>
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
                    <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Nenhum dado disponível para o período selecionado</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

export default FinancialDashboard;
