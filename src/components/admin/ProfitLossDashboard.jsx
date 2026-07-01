import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Plus, Pencil, Trash2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard, EmptyState, SkeletonStatsGrid } from '@/components/common';
import { useProfitLoss, usePlatformCosts } from '@/hooks/useProfitLoss';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';

export function ProfitLossDashboard({ onAddCost, onEditCost, onDeleteCost, className = '' }) {
    const [period, setPeriod] = useState('month');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Gerar lista de anos disponíveis (últimos 5 anos + ano atual)
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = 0; i < 5; i++) {
            years.push(currentYear - i);
        }
        return years;
    }, []);

    // Calcular datas baseado no período e ano selecionado (recalcula quando period ou selectedYear muda)
    const { startDate, endDate } = useMemo(() => {
        const today = new Date();
        let start, end;

        if (period === 'month') {
            // Se ano selecionado é o atual, usar mês atual
            // Senão, usar janeiro do ano selecionado
            const month = selectedYear === today.getFullYear() ? today.getMonth() : 0;
            start = new Date(selectedYear, month, 1);
            end = new Date(selectedYear, month + 1, 0);
        } else if (period === 'quarter') {
            // Se ano selecionado é o atual, usar trimestre atual
            // Senão, usar primeiro trimestre do ano selecionado
            const currentQuarter = Math.floor(today.getMonth() / 3);
            const quarter = selectedYear === today.getFullYear() ? currentQuarter : 0;
            start = new Date(selectedYear, quarter * 3, 1);
            end = new Date(selectedYear, (quarter + 1) * 3, 0);
        } else {
            // Ano completo do ano selecionado
            start = new Date(selectedYear, 0, 1);
            end = new Date(selectedYear, 11, 31);
        }

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        };
    }, [period, selectedYear]); // Recalcula quando period ou selectedYear muda
    const {
        totalRevenue, totalPayouts, platformMargin, totalCosts, profitLoss, profitMargin,
        isProfitable, costsByCategory, loading
    } = useProfitLoss(startDate, endDate);

    // Buscar custos individuais para mostrar lista
    const { costs, loading: costsLoading } = usePlatformCosts(startDate, endDate);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    const getCategoryLabel = (category) => {
        const labels = {
            server: 'Servidor',
            marketing: 'Marketing',
            tools: 'Ferramentas',
            salaries: 'Salários',
            other: 'Outros'
        };
        return labels[category] || category;
    };

    if (loading) {
        return (
            <div className={cn('space-y-6', className)}>
                <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
                <SkeletonStatsGrid cards={4} />
            </div>
        );
    }

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <PieChart className="w-8 h-8 text-[#2d8659]" />
                        Dashboard Financeiro
                    </h2>
                    <p className="text-gray-600 mt-1">Lucro/Prejuízo e análise de custos</p>
                </div>
                <Button onClick={onAddCost} className="rounded-full bg-[#2d8659] hover:bg-[#236b47]">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Custo
                </Button>
            </div>

            {/* Filtros de Período */}
            <div className="flex gap-4 items-center">
                <div className="flex gap-2">
                    <Button variant={period === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('month')}
                        className={`rounded-full ${period === 'month' ? 'bg-[#2d8659]' : ''}`}>
                        Este Mês
                    </Button>
                    <Button variant={period === 'quarter' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('quarter')}
                        className={`rounded-full ${period === 'quarter' ? 'bg-[#2d8659]' : ''}`}>
                        Trimestre
                    </Button>
                    <Button variant={period === 'year' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('year')}
                        className={`rounded-full ${period === 'year' ? 'bg-[#2d8659]' : ''}`}>
                        Ano
                    </Button>
                </div>

                {/* Seletor de Ano */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 font-medium">Ano:</span>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-4 py-1.5 border border-gray-200 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2d8659] focus:border-transparent bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Azul — receita bruta (entrada total dos clientes) */}
                <StatCard
                    label="Receita Total"
                    value={totalRevenue}
                    format="currency"
                    tooltip="Valor total recebido dos clientes no período (bruto)."
                    className="border-l-4 border-l-blue-500 bg-blue-50"
                />
                {/* Verde — margem da plataforma */}
                <StatCard
                    label="Margem Plataforma"
                    value={platformMargin}
                    format="currency"
                    tooltip="Comissão da plataforma (% sobre cada agendamento)."
                    className="border-l-4 border-l-emerald-500 bg-emerald-50"
                />
                {/* Roxo — obrigação com profissionais (liability) */}
                <StatCard
                    label="Repasse Profissionais"
                    value={totalPayouts}
                    format="currency"
                    tooltip="Total repassado (ou a repassar) aos profissionais no período."
                    className="border-l-4 border-l-violet-500 bg-violet-50"
                />
                {/* Âmbar — custos operacionais (despesa) */}
                <StatCard
                    label="Custos Totais"
                    value={totalCosts}
                    format="currency"
                    tooltip="Soma das despesas operacionais (servidor, marketing, etc)."
                    className="border-l-4 border-l-amber-500 bg-amber-50"
                />
                <motion.div className={cn(
                    'rounded-2xl border shadow-sm p-6',
                    isProfitable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                )}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-600">Lucro/Prejuízo</p>
                            <Tooltip content="Resultado final: Margem da Plataforma - Custos Totais.">
                                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                            </Tooltip>
                        </div>
                        {isProfitable ? <TrendingUp className="w-5 h-5 text-green-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
                    </div>
                    <p className={cn('text-3xl font-bold', isProfitable ? 'text-green-900' : 'text-red-900')}>
                        {formatCurrency(profitLoss)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{profitMargin.toFixed(1)}% margem</p>
                </motion.div>
            </div>

            {/* Breakdown de Custos */}
            {Object.keys(costsByCategory).length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Custos por Categoria</h3>
                    <div className="space-y-3">
                        {Object.entries(costsByCategory).map(([category, data]) => {
                            const percentage = totalCosts > 0 ? (data.total / totalCosts) * 100 : 0;
                            return (
                                <div key={category}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium">{getCategoryLabel(category)}</span>
                                        <span>{formatCurrency(data.total)} ({percentage.toFixed(1)}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div className="bg-[#2d8659] h-2 rounded-full" style={{ width: `${percentage}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Lista de Custos Individuais */}
            {costs.length > 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-lg font-semibold mb-4">Custos Detalhados</h3>
                    <div className="space-y-2">
                        {costs.map((cost) => (
                            <motion.div
                                key={cost.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-between p-5 border border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                            {getCategoryLabel(cost.category)}
                                        </span>
                                        <p className="font-medium">{cost.description}</p>
                                        {cost.is_recurring && (
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                Recorrente
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {formatDate(cost.cost_date)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-lg font-bold text-gray-900">
                                        {formatCurrency(cost.amount)}
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-full"
                                            onClick={() => onEditCost(cost)}
                                        >
                                            <Pencil className="w-4 h-4 text-gray-500" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-full hover:bg-red-50 hover:text-red-600"
                                            onClick={() => onDeleteCost(cost)}
                                        >
                                            <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-600" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ) : (
                <EmptyState icon={DollarSign} title="Nenhum custo registrado"
                    description="Adicione custos para ver a análise completa" compact={true} />
            )}
        </div>
    );
}

export default ProfitLossDashboard;
