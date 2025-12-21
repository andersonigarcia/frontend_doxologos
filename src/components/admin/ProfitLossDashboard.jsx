import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard, EmptyState, SkeletonStatsGrid } from '@/components/common';
import { useProfitLoss, usePlatformCosts } from '@/hooks/useProfitLoss';
import { cn } from '@/lib/utils';

export function ProfitLossDashboard({ onAddCost, onEditCost, onDeleteCost, className = '' }) {
    const [period, setPeriod] = useState('month');

    // Calcular datas baseado no período
    const getDateRange = () => {
        const today = new Date();
        let startDate, endDate;

        if (period === 'month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else if (period === 'quarter') {
            const quarter = Math.floor(today.getMonth() / 3);
            startDate = new Date(today.getFullYear(), quarter * 3, 1);
            endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
        } else {
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date(today.getFullYear(), 11, 31);
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
    };

    const { startDate, endDate } = getDateRange();
    const {
        totalRevenue, platformMargin, totalCosts, profitLoss, profitMargin,
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
                <Button onClick={onAddCost} className="bg-[#2d8659] hover:bg-[#236b47]">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Custo
                </Button>
            </div>

            {/* Filtros de Período */}
            <div className="flex gap-2">
                <Button variant={period === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('month')}
                    className={period === 'month' ? 'bg-[#2d8659]' : ''}>
                    Este Mês
                </Button>
                <Button variant={period === 'quarter' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('quarter')}
                    className={period === 'quarter' ? 'bg-[#2d8659]' : ''}>
                    Trimestre
                </Button>
                <Button variant={period === 'year' ? 'default' : 'outline'} size="sm" onClick={() => setPeriod('year')}
                    className={period === 'year' ? 'bg-[#2d8659]' : ''}>
                    Ano
                </Button>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Receita Total" value={formatCurrency(totalRevenue)} format="currency" />
                <StatCard label="Margem Plataforma" value={formatCurrency(platformMargin)} format="currency" />
                <StatCard label="Custos Totais" value={formatCurrency(totalCosts)} format="currency" />
                <motion.div className={cn(
                    'rounded-xl border p-6',
                    isProfitable ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                )}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-600">Lucro/Prejuízo</p>
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
                <div className="bg-white rounded-xl border p-6">
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
                <div className="bg-white rounded-xl border p-6">
                    <h3 className="text-lg font-semibold mb-4">Custos Detalhados</h3>
                    <div className="space-y-2">
                        {costs.map((cost) => (
                            <motion.div
                                key={cost.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                            {getCategoryLabel(cost.category)}
                                        </span>
                                        <p className="font-medium">{cost.description}</p>
                                        {cost.is_recurring && (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
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
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onEditCost(cost)}
                                            title="Editar Custo"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => onDeleteCost(cost)}
                                            title="Excluir Custo"
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
                <EmptyState icon={DollarSign} title="Nenhum custo registrado"
                    description="Adicione custos para ver a análise completa" compact={true} />
            )}
        </div>
    );
}

export default ProfitLossDashboard;
