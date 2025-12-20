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
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="text-sm font-medium text-gray-900">{payload[0].payload.month}</p>
                    <p className="text-lg font-bold text-[#2d8659]">
                        {formatCurrency(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="h-64 bg-gray-100 rounded animate-pulse" />
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#2d8659]" />
                    {title}
                </h3>
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <DollarSign className="w-12 h-12 mb-2" />
                    <p>Nenhum dado de receita disponível</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[#2d8659]" />
                        {title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Últimos {data.length} meses
                    </p>
                </div>

                {/* Total e Crescimento */}
                <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(totalRevenue)}
                    </p>
                    {growth !== 0 && (
                        <div className={`flex items-center gap-1 text-sm font-medium ${growth > 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                            <TrendingUp className={`w-4 h-4 ${growth < 0 ? 'rotate-180' : ''}`} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey="month"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(45, 134, 89, 0.1)' }} />
                    <Bar
                        dataKey="revenue"
                        radius={[8, 8, 0, 0]}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={index === data.length - 1 ? '#2d8659' : '#93c5b0'}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#93c5b0]" />
                    <span className="text-gray-600">Meses anteriores</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#2d8659]" />
                    <span className="text-gray-600">Mês atual</span>
                </div>
            </div>
        </motion.div>
    );
};

export default RevenueChart;
