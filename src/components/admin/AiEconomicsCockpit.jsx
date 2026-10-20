import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Sparkles,
    DollarSign,
    TrendingUp,
    ShieldCheck,
    Cpu,
    ArrowUpRight,
    Users,
    Activity,
    Layers,
    RefreshCw,
    Sliders,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export function AiEconomicsCockpit({ onNavigateTab }) {
    const { settings } = useSystemSettings();
    const [loading, setLoading] = useState(true);
    const [ledgerData, setLedgerData] = useState([]);
    const [professionalsCount, setProfessionalsCount] = useState(0);

    const [filterPeriod, setFilterPeriod] = useState('all'); // 'month', 'all'

    // Carregar dados reais do ai_usage_ledger
    const fetchAiLedger = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ai_usage_ledger')
                .select(`
                    id,
                    booking_id,
                    professional_id,
                    is_trial,
                    add_on_amount,
                    technical_cost,
                    net_margin,
                    billing_status,
                    created_at,
                    professional:professionals ( id, name, crp, email ),
                    booking:bookings ( id, booking_date, patient_name )
                `)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setLedgerData(data);
            }

            // Buscar contagem de psicólogos ativos
            const { count } = await supabase
                .from('professionals')
                .select('*', { count: 'exact', head: true })
                .eq('ativo', true);

            setProfessionalsCount(count || 1);
        } catch (err) {
            console.error('Erro ao carregar ledger de IA:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAiLedger();
    }, []);

    // Cálculos consolidados
    const metrics = useMemo(() => {
        const totalSessions = ledgerData.length;
        const trialSessions = ledgerData.filter(item => item.is_trial).length;
        const paidSessions = totalSessions - trialSessions;

        const grossRevenue = ledgerData.reduce((acc, item) => {
            return acc + (item.is_trial ? 0 : Number(item.add_on_amount || 2.90));
        }, 0);

        const totalCost = ledgerData.reduce((acc, item) => {
            return acc + Number(item.technical_cost || 1.20);
        }, 0);

        const netProfit = grossRevenue - totalCost;
        const marginPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

        // Psicólogos que usaram trial vs que continuaram pagando
        const profsUsingTrial = new Set(ledgerData.filter(i => i.is_trial).map(i => i.professional_id));
        const profsPaid = new Set(ledgerData.filter(i => !i.is_trial).map(i => i.professional_id));

        const conversionRate = profsUsingTrial.size > 0
            ? (profsPaid.size / profsUsingTrial.size) * 100
            : 0;

        return {
            totalSessions,
            trialSessions,
            paidSessions,
            grossRevenue,
            totalCost,
            netProfit,
            marginPct,
            activeProfsUsing: new Set(ledgerData.map(i => i.professional_id)).size,
            conversionRate
        };
    }, [ledgerData]);

    const formatBrl = (val) => {
        const num = Number(val) || 0;
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div className="space-y-6">
            {/* Header do Cockpit de Economia da IA */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1.5 backdrop-blur-sm">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                            Gestão & Monetização de IA
                        </span>
                        <span className="text-xs text-slate-300">Modelo Add-on: R$ 2,90/sessão</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-white">
                        Cockpit Financeiro da IA & Telemedicina
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                        Acompanhamento em tempo real da margem de contribuição do Copiloto IA (CFP 01/2009), custos técnicos de transcrição/inferência, consumo de degustações gratuitas e conversão de psicólogos.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        size="sm"
                        onClick={fetchAiLedger}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10 text-xs font-semibold gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => onNavigateTab?.('settings')}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs gap-1.5 shadow-md"
                    >
                        <Sliders className="w-3.5 h-3.5" />
                        Ajustar Taxas
                    </Button>
                </div>
            </div>

            {/* 4 KPIs Vitais de Economia da IA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Faturamento Bruto da IA */}
                <Card className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Receita Bruta (Add-on)
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl font-black text-slate-900">
                            {formatBrl(metrics.grossRevenue)}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <span>{metrics.paidSessions} consultas cobradas (R$ 2,90)</span>
                        </p>
                    </div>
                </Card>

                {/* KPI 2: Custos de Infraestrutura / APIs */}
                <Card className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Custo de IA (Infra)
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
                            <Cpu className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl font-black text-slate-900">
                            {formatBrl(metrics.totalCost)}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <span>{metrics.totalSessions} sessões × ~R$ 1,20 (Gemini+STT)</span>
                        </p>
                    </div>
                </Card>

                {/* KPI 3: Lucro Líquido Gerado pela IA */}
                <Card className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Lucro Líquido da IA
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className={`text-2xl font-black ${metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-amber-600'}`}>
                            {formatBrl(metrics.netProfit)}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Margem Operacional Líquida: <strong className="text-slate-800">{metrics.marginPct.toFixed(1)}%</strong>
                        </p>
                    </div>
                </Card>

                {/* KPI 4: Degustações & Conversão */}
                <Card className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Aderência dos Psicólogos
                        </span>
                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl font-black text-slate-900">
                            {metrics.activeProfsUsing} / {professionalsCount}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1">
                            {metrics.trialSessions} degustações concedidas
                        </p>
                    </div>
                </Card>
            </div>

            {/* Quadro Comparativo de Margem Unitária & Guardrails de Segurança */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-600" />
                                Decomposição Unitária do Add-on (Por Consulta)
                            </h3>
                            <p className="text-xs text-slate-500">
                                Modelo de remuneração da plataforma por evolução clínica automatizada.
                            </p>
                        </div>
                        <span className="text-xs font-black px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                            +58.6% Margem Líquida
                        </span>
                    </div>

                    <div className="space-y-3 pt-2 text-xs">
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                            <span className="font-semibold text-slate-700">Preço do Add-on cobrado do psicólogo:</span>
                            <span className="font-bold text-slate-900">R$ 2,90</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-50/60 rounded-xl text-red-900">
                            <span>(-) Transcrição de Áudio (STT - Whisper/Deepgram ~50 min):</span>
                            <span className="font-bold text-red-700">- R$ 1,18</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-red-50/60 rounded-xl text-red-900">
                            <span>(-) Inferência Gemini 1.5 Flash (~2.5k tokens input + output):</span>
                            <span className="font-bold text-red-700">- R$ 0,02</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-xl text-emerald-950 font-bold border border-emerald-200">
                            <span>(=) Margem de Contribuição Líquida da Plataforma:</span>
                            <span className="text-emerald-700 text-sm font-black">+ R$ 1,70 / sessão</span>
                        </div>
                    </div>

                    <div className="pt-3 border-t text-[11px] text-slate-500 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                            <strong>Estratégia de Degustação (CAC Lock-in):</strong> 3 sessões gratuitas representam um custo máximo de R$ 3,60 por psicólogo. Com 3 sessões pagas subsequentes, o CAC é 100% recuperado.
                        </span>
                    </div>
                </Card>

                {/* Guardrails e Status de Contingência (Circuit Breaker) */}
                <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 border-b pb-3">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <h3 className="font-bold text-slate-900 text-sm">Guardrails & Contingência</h3>
                        </div>

                        <div className="space-y-3 pt-3 text-xs">
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span className="font-bold text-emerald-950">Circuit Breaker Telemedicina</span>
                                </div>
                                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Ativo
                                </span>
                            </div>

                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                Em caso de esgotamento de quota ou indisponibilidade na Daily.co, o sistema direciona os pacientes automaticamente para a sala de contingência segura (Fase 1), <strong>garantindo zero vendas perdidas</strong>.
                            </p>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                <span className="font-semibold text-slate-700">Teto Orçamentário Mensal (IA):</span>
                                <span className="font-bold text-slate-900">
                                    {formatBrl(settings.ai_monthly_budget_cap || 500)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigateTab?.('settings')}
                        className="w-full text-xs font-bold text-slate-700 mt-4"
                    >
                        Configurar Limites & Alertas
                    </Button>
                </Card>
            </div>

            {/* Extrato do Ledger de Uso de IA */}
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
                    <div>
                        <h3 className="font-bold text-slate-900 text-base">
                            Extrato Contábil de Lançamentos de IA (Ledger)
                        </h3>
                        <p className="text-xs text-slate-500">
                            Registro de deduções quinzenais e auditoria de cada prontuário gerado.
                        </p>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                        {ledgerData.length} registros
                    </span>
                </div>

                {ledgerData.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                        Nenhum prontuário com IA gerado até o momento. As novas evoluções aparecerão aqui com detalhamento financeiro.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-slate-700">
                            <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="p-3">Data</th>
                                    <th className="p-3">Psicólogo</th>
                                    <th className="p-3">Paciente</th>
                                    <th className="p-3">Tipo</th>
                                    <th className="p-3 text-right">Add-on Cobrado</th>
                                    <th className="p-3 text-right">Custo Técnico</th>
                                    <th className="p-3 text-right">Margem Líquida</th>
                                    <th className="p-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {ledgerData.slice(0, 15).map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-mono">
                                            {new Date(row.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-3 font-semibold text-slate-900">
                                            {row.professional?.name || 'Psicólogo'}
                                        </td>
                                        <td className="p-3">
                                            {row.booking?.patient_name || 'Paciente'}
                                        </td>
                                        <td className="p-3">
                                            {row.is_trial ? (
                                                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    Degustação
                                                </span>
                                            ) : (
                                                <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                    Pago (R$ 2,90)
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right font-bold text-slate-900">
                                            {row.is_trial ? 'R$ 0,00' : formatBrl(row.add_on_amount || 2.90)}
                                        </td>
                                        <td className="p-3 text-right text-red-600 font-medium">
                                            ({formatBrl(row.technical_cost || 1.20)})
                                        </td>
                                        <td className="p-3 text-right font-black text-emerald-700">
                                            {row.is_trial
                                                ? `(${formatBrl(row.technical_cost || 1.20)})`
                                                : `+${formatBrl((row.add_on_amount || 2.90) - (row.technical_cost || 1.20))}`}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                                                {row.billing_status === 'deducted' ? 'Debitado' : 'A Compensar'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}

export default AiEconomicsCockpit;
