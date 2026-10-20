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
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <PieChart className="w-6 h-6 text-slate-800" />
                        Dashboard Financeiro
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">Lucro/Prejuízo e análise de custos operacionais</p>
                </div>
                <Button onClick={onAddCost} className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-9 px-4 shadow-xs">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Adicionar Custo
                </Button>
            </div>

            {/* Filtros de Período */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                    <Button variant="ghost" size="sm" onClick={() => setPeriod('month')}
                        className={`rounded-lg text-xs font-bold transition-all h-8 px-3 ${period === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                        Este Mês
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPeriod('quarter')}
                        className={`rounded-lg text-xs font-bold transition-all h-8 px-3 ${period === 'quarter' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                        Trimestre
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPeriod('year')}
                        className={`rounded-lg text-xs font-bold transition-all h-8 px-3 ${period === 'year' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
                        Ano
                    </Button>
                </div>

                {/* Seletor de Ano */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-semibold">Ano:</span>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-1.5 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
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
                    className="border-l-4 border-l-blue-500 bg-blue-50/70 border border-slate-200/80 shadow-xs rounded-xl"
                />
                {/* Verde — margem da plataforma */}
                <StatCard
                    label="Margem Plataforma"
                    value={platformMargin}
                    format="currency"
                    tooltip="Comissão da plataforma (% sobre cada agendamento)."
                    className="border-l-4 border-l-emerald-500 bg-emerald-50/70 border border-slate-200/80 shadow-xs rounded-xl"
                />
                {/* Roxo — obrigação com profissionais (liability) */}
                <StatCard
                    label="Repasse Profissionais"
                    value={totalPayouts}
                    format="currency"
                    tooltip="Total repassado (ou a repassar) aos profissionais no período."
                    className="border-l-4 border-l-violet-500 bg-violet-50/70 border border-slate-200/80 shadow-xs rounded-xl"
                />
                {/* Âmbar — custos operacionais (despesa) */}
                <StatCard
                    label="Custos Totais"
                    value={totalCosts}
                    format="currency"
                    tooltip="Soma das despesas operacionais (servidor, marketing, etc)."
                    className="border-l-4 border-l-amber-500 bg-amber-50/70 border border-slate-200/80 shadow-xs rounded-xl"
                />
                <motion.div className={cn(
                    'rounded-xl border shadow-xs p-5',
                    isProfitable ? 'bg-emerald-50/70 border-emerald-200/80' : 'bg-rose-50/70 border-rose-200/80'
                )}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Lucro/Prejuízo</p>
                            <Tooltip content="Resultado final: Margem da Plataforma - Custos Totais.">
                                <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                            </Tooltip>
                        </div>
                        {isProfitable ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-rose-600" />}
                    </div>
                    <p className={cn('text-2xl font-extrabold tabular-nums tracking-tight', isProfitable ? 'text-emerald-950' : 'text-rose-950')}>
                        {formatCurrency(profitLoss)}
                    </p>
                    <p className={cn('text-xs font-semibold mt-1 tabular-nums', isProfitable ? 'text-emerald-700' : 'text-rose-700')}>{profitMargin.toFixed(1)}% margem</p>
                </motion.div>
            </div>

            {/* Breakdown de Custos */}
            {Object.keys(costsByCategory).length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-4">Custos por Categoria</h3>
                    <div className="space-y-3">
                        {Object.entries(costsByCategory).map(([category, data]) => {
                            const percentage = totalCosts > 0 ? (data.total / totalCosts) * 100 : 0;
                            return (
                                <div key={category}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-semibold text-slate-700">{getCategoryLabel(category)}</span>
                                        <span className="tabular-nums font-semibold text-slate-900">{formatCurrency(data.total)} ({percentage.toFixed(1)}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {/* Lista de Custos Individuais */}
            {costs.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-4">Custos Detalhados</h3>
                    <div className="space-y-2">
                        {costs.map((cost) => (
                            <motion.div
                                key={cost.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-between p-4 border border-slate-200/80 rounded-xl bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2.5">
                                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
                                            {getCategoryLabel(cost.category)}
                                        </span>
                                        <p className="font-semibold text-slate-900 text-sm">{cost.description}</p>
                                        {cost.is_recurring && (
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-200">
                                                Recorrente
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {formatDate(cost.cost_date)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-base font-extrabold text-slate-900 tabular-nums">
                                        {formatCurrency(cost.amount)}
                                    </p>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-lg h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                            onClick={() => onEditCost(cost)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="rounded-lg h-8 w-8 p-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                            onClick={() => onDeleteCost(cost)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            ) : (
                <EmptyState
                    icon={DollarSign}
                    title="Nenhum custo registrado"
                    description="Adicione custos operacionais para acompanhar a saúde financeira da plataforma."
                    actionLabel="Adicionar Custo"
                    onAction={onAddCost}
                />
            )}
        </div>
    );
}

export default ProfitLossDashboard;
