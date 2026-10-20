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
            <div className={cn("bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center min-h-[300px]", className)}>
                <Loader2 className="w-8 h-8 animate-spin text-slate-800 mb-4" />
                <p className="text-slate-500 text-xs">Carregando dados financeiros...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("bg-rose-50 p-6 rounded-xl border border-rose-200 flex flex-col items-center justify-center min-h-[300px]", className)}>
                <AlertCircle className="w-8 h-8 text-rose-500 mb-4" />
                <p className="text-rose-800 text-sm font-semibold text-center">Não foi possível carregar o gráfico de receita.</p>
                <p className="text-rose-600 text-xs mt-2">{error.message}</p>
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
        <div className={cn("bg-white rounded-xl border border-slate-200/80 shadow-xs p-6", className)}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6">
                <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-slate-800" />
                        Evolução da Receita
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Acompanhamento dos últimos 6 meses
                    </p>
                </div>
                {growth !== null && (
                    <div className="mt-4 sm:mt-0">
                        <span className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums",
                            growthValue >= 0 ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                        )}>
                            {growthValue > 0 ? '+' : ''}{growth}% em relação ao mês anterior
                        </span>
                    </div>
                )}
            </div>

            {(!data || data.length === 0) ? (
                <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-xl">
                    <p className="text-slate-500 text-xs">Nenhum dado financeiro disponível no período.</p>
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
                                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="month" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                                tickFormatter={(value) => `R$ ${value}`}
                            />
                            <Tooltip 
                                formatter={(value) => [formatCurrency(value), 'Receita']}
                                labelStyle={{ color: '#0f172a', fontWeight: 'bold', marginBottom: '4px' }}
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#059669"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                activeDot={{ r: 5, fill: "#059669", stroke: "#fff", strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
