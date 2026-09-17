import React from 'react';
import { useMonthlyRevenue } from '@/hooks/useMonthlyRevenue';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RevenueAnalytics({ professionalId, className }) {
    const { data, loading, error } = useMonthlyRevenue(professionalId, 6);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    if (loading) {
        return (
            <div className={cn("bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center min-h-[300px]", className)}>
                <Loader2 className="w-8 h-8 animate-spin text-[#2d8659] mb-4" />
                <p className="text-gray-500 text-sm">Carregando dados financeiros...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("bg-red-50 p-6 rounded-xl border border-red-100 flex flex-col items-center justify-center min-h-[300px]", className)}>
                <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
                <p className="text-red-700 text-sm text-center">Não foi possível carregar o gráfico de receita.</p>
                <p className="text-red-500 text-xs mt-2">{error.message}</p>
            </div>
        );
    }

    // Calcula se houve crescimento entre o último e o penúltimo mês
    let growth = null;
    let growthValue = 0;
    
    if (data && data.length >= 2) {
        const currentMonth = data[data.length - 1]?.revenue || 0;
        const previousMonth = data[data.length - 2]?.revenue || 0;
        
        if (previousMonth > 0) {
            growthValue = ((currentMonth - previousMonth) / previousMonth) * 100;
            growth = growthValue.toFixed(1);
        }
    }

    return (
        <div className={cn("bg-white rounded-xl border border-gray-200 shadow-sm p-6", className)}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[#2d8659]" />
                        Evolução da Receita
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Acompanhamento dos últimos 6 meses
                    </p>
                </div>
                {growth !== null && (
                    <div className="mt-4 sm:mt-0">
                        <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                            growthValue >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        )}>
                            {growthValue > 0 ? '+' : ''}{growth}% em relação ao mês anterior
                        </span>
                    </div>
                )}
            </div>

            {(!data || data.length === 0) ? (
                <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-sm">Nenhum dado financeiro disponível no período.</p>
                </div>
            ) : (
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{
                                top: 10,
                                right: 10,
                                left: -20,
                                bottom: 0,
                            }}
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2d8659" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#2d8659" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis 
                                dataKey="month" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6b7280', fontSize: 12 }}
                                tickFormatter={(value) => `R$ ${value}`}
                            />
                            <Tooltip 
                                formatter={(value) => [formatCurrency(value), 'Receita']}
                                labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '4px' }}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#2d8659"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                activeDot={{ r: 6, fill: "#2d8659", stroke: "#fff", strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
