import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Filter } from 'lucide-react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '@/utils/formatParams';
import { Input } from '@/components/ui/input';

export function LedgerCharts() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30); // Default to last 30 days

    useEffect(() => {
        fetchChartData();
    }, [days]);

    const fetchChartData = async () => {
        setLoading(true);
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data: entries, error } = await supabase
                .from('payment_ledger_entries')
                .select('*')
                .eq('account_code', 'CASH_BANK')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Group by Date
            const grouped = {};

            // Initialize all dates in range to 0 to show gaps
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateKey = d.toISOString().split('T')[0];
                grouped[dateKey] = {
                    date: dateKey,
                    entrada: 0,
                    saida: 0,
                    saldo: 0
                };
            }

            entries.forEach(entry => {
                const dateKey = entry.created_at.split('T')[0];
                const amount = parseFloat(entry.amount);

                if (grouped[dateKey]) {
                    if (entry.entry_type === 'DEBIT') {
                        grouped[dateKey].entrada += amount;
                        grouped[dateKey].saldo += amount;
                    } else if (entry.entry_type === 'CREDIT') {
                        grouped[dateKey].saida += amount;
                        grouped[dateKey].saldo -= amount;
                    }
                }
            });

            // Convert to array
            const chartData = Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));

            // Format Date for display
            const formattedData = chartData.map(item => ({
                ...item,
                displayDate: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            }));

            setData(formattedData);

        } catch (error) {
            console.error('Error fetching chart data:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="mb-6">
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <BarChart3 className="w-5 h-5 text-gray-500" />
                            Fluxo de Caixa ({days} dias)
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            Visualização diária de entradas, saídas e saldo líquido.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                        >
                            <option value={7}>7 dias</option>
                            <option value={15}>15 dias</option>
                            <option value={30}>30 dias</option>
                            <option value={60}>60 dias</option>
                            <option value={90}>90 dias</option>
                        </select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                            data={data}
                            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        >
                            <CartesianGrid stroke="#f5f5f5" vertical={false} />
                            <XAxis dataKey="displayDate" scale="point" padding={{ left: 10, right: 10 }} tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(val) => `R$ ${val}`} tick={{ fontSize: 12 }} />
                            <Tooltip
                                formatter={(value) => formatCurrency(value)}
                                labelStyle={{ color: '#333' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend />
                            <Bar dataKey="entrada" name="Entradas" fill="#22c55e" barSize={20} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="saida" name="Saídas" fill="#ef4444" barSize={20} radius={[4, 4, 0, 0]} />
                            <Line type="monotone" dataKey="saldo" name="Saldo do Dia" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
