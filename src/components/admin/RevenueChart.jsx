import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * RevenueChart - Gráfico de receita mensal
 * 
 * @component
 * @param {Object} props
 * @param {Array} props.data - Array de objetos { month: string, revenue: number }
 * @param {boolean} props.loading - Estado de carregamento
 * @param {string} props.currency - Código da moeda (default: 'BRL')
 * @param {string} props.title - Título do gráfico
 * @param {string} props.className - Classes CSS adicionais
 */
export const RevenueChart = ({
    data = [],
    loading = false,
    currency = 'BRL',
    title = 'Receita Mensal',
    className = ''
}) => {
    // Formatar valor para moeda
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    // Calcular total e crescimento
    const totalRevenue = data.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const lastMonth = data[data.length - 1]?.revenue || 0;
    const previousMonth = data[data.length - 2]?.revenue || 0;
    const growth = previousMonth > 0
        ? ((lastMonth - previousMonth) / previousMonth) * 100
        : 0;

    // Tooltip customizado
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-slate-200 rounded-lg shadow-md p-3">
                    <p className="text-xs font-semibold text-slate-500">{payload[0].payload.month}</p>
                    <p className="text-base font-extrabold text-emerald-700 tabular-nums">
                        {formatCurrency(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className={`bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 ${className}`}>
                <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-4" />
                <div className="h-64 bg-slate-50 rounded animate-pulse" />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className={`bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 ${className}`}>
                <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-slate-800" />
                    {title}
                </h3>
                <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <DollarSign className="w-12 h-12 mb-2 text-slate-300" />
                    <p className="text-xs">Nenhum dado de receita disponível</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 ${className}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-slate-800" />
                        {title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Últimos {data.length} meses
                    </p>
                </div>

                {/* Total e Crescimento */}
                <div className="text-right">
                    <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
                        {formatCurrency(totalRevenue)}
                    </p>
                    {growth !== 0 && (
                        <div className={`flex items-center justify-end gap-1 text-xs font-bold tabular-nums ${growth > 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}>
                            <TrendingUp className={`w-3.5 h-3.5 ${growth < 0 ? 'rotate-180' : ''}`} />
                            <span>{Math.abs(growth).toFixed(1)}%</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
                <BarChart
                    data={data}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                        dataKey="month"
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
                    <Bar
                        dataKey="revenue"
                        radius={[6, 6, 0, 0]}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={index === data.length - 1 ? '#059669' : '#cbd5e1'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs font-semibold">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-slate-300" />
                    <span className="text-slate-600">Meses anteriores</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-600" />
                    <span className="text-slate-900">Mês atual</span>
                </div>
            </div>
        </motion.div>
    );
};

export default RevenueChart;
