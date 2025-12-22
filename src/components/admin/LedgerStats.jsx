import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Loader2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';

export function LedgerStats() {
    const [stats, setStats] = useState({
        liabilityBalance: 0,
        cashBalance: 0,
        revenueTotal: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);

            // Fetch all ledger entries
            // In a real production app with millions of rows, this should be a Postgres View or Materialized View
            const { data, error } = await supabase
                .from('payment_ledger_entries')
                .select('account_code, entry_type, amount');

            if (error) throw error;

            let liability = 0;
            let cash = 0;
            let revenue = 0;

            data.forEach(entry => {
                const amount = parseFloat(entry.amount || 0);

                if (entry.account_code === 'LIABILITY_PROFESSIONAL') {
                    // Liability: Credit increases (owe more), Debit decreases (paid out)
                    if (entry.entry_type === 'CREDIT') liability += amount;
                    if (entry.entry_type === 'DEBIT') liability -= amount;
                }

                if (entry.account_code === 'CASH_BANK') {
                    // Asset: Debit increases (money in), Credit decreases (money out)
                    if (entry.entry_type === 'DEBIT') cash += amount;
                    if (entry.entry_type === 'CREDIT') cash -= amount;
                }

                if (entry.account_code === 'REVENUE_SERVICE' || entry.account_code === 'REVENUE_GROSS') {
                    // Revenue: Credit increases
                    if (entry.entry_type === 'CREDIT') revenue += amount;
                    // Debits to revenue (refunds) would reduce it
                    if (entry.entry_type === 'DEBIT') revenue -= amount;
                }
            });

            setStats({
                liabilityBalance: liability,
                cashBalance: cash,
                revenueTotal: revenue
            });

        } catch (error) {
            console.error('Error fetching ledger stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Liability Card */}
            <div className="bg-white p-6 rounded-xl border border-orange-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-500">Obrigação com Profissionais</p>
                        <Tooltip content="Valor total (histórico) que a plataforma deve repassar aos profissionais.">
                            <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        </Tooltip>
                    </div>
                    <Wallet className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.liabilityBalance)}</h3>
                <p className="text-xs text-orange-600 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Valor pendente de repasse
                </p>
            </div>

            {/* Cash Card */}
            <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-500">Saldo em Caixa (Estimado)</p>
                        <Tooltip content="Estimativa baseada apenas nas Entradas e Saídas registradas neste livro caixa.">
                            <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        </Tooltip>
                    </div>
                    <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.cashBalance)}</h3>
                <p className="text-xs text-blue-600 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Entradas líquidas
                </p>
            </div>

            {/* Revenue Card */}
            <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-500">Receita de Serviços (Plataforma)</p>
                        <Tooltip content="Total acumulado que a plataforma ganhou com taxas de serviço.">
                            <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        </Tooltip>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenueTotal)}</h3>
                <p className="text-xs text-green-600 mt-1 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Total acumulado
                </p>
            </div>
        </div>
    );
}
