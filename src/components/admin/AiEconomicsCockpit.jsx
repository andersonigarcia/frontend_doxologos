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
    CheckCircle2,
    FileText,
    Lock,
    Search,
    ChevronRight,
    Clock
} from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';

export function AiEconomicsCockpit({ onNavigateTab }) {
    const { settings } = useSystemSettings();
    const [loading, setLoading] = useState(true);
    const [ledgerData, setLedgerData] = useState([]);
    const [professionalsCount, setProfessionalsCount] = useState(0);
    const [ledgerFilter, setLedgerFilter] = useState('all'); // 'all', 'paid', 'trial'

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
        const marginPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : (totalSessions === 0 ? 58.6 : 0);

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

    const filteredLedger = useMemo(() => {
        if (ledgerFilter === 'paid') {
            return ledgerData.filter(item => !item.is_trial);
        }
        if (ledgerFilter === 'trial') {
            return ledgerData.filter(item => item.is_trial);
        }
        return ledgerData;
    }, [ledgerData, ledgerFilter]);

    const formatBrl = (val) => {
        const num = Number(val) || 0;
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const monthlyCap = Number(settings.ai_monthly_budget_cap || 500);
    const budgetConsumedPct = monthlyCap > 0 ? Math.min(100, (metrics.totalCost / monthlyCap) * 100) : 0;

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* CABEÇALHO DO COCKPIT DE IA - CARD CLARO PREMIUM DOXOLOGOS */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e4ded5] shadow-[0_2px_12px_rgba(27,60,55,0.03)] text-[#262624]">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="bg-[#1b3c37]/5 text-[#1b3c37] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#1b3c37]/15 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#1b3c37]" />
                                Gestão & Monetização de IA
                            </span>
                            <span className="text-[11px] text-[#262624]/60 font-medium">
                                Modelo Add-on: R$ 2,90/sessão • Resolução CFP 01/2009
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#1b3c37]">
                            Cockpit Financeiro da IA & Telemedicina
                        </h1>
                        <p className="text-xs text-[#262624]/70 mt-1 max-w-2xl leading-relaxed">
                            Monitoramento em tempo real da margem de contribuição do Copiloto IA, custos de transcrição e inferência, consumo de degustações e garantias de contingência.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <Button
                            size="sm"
                            onClick={fetchAiLedger}
                            variant="outline"
                            className="flex-1 sm:flex-initial border-[#e4ded5] text-[#1b3c37] hover:bg-[#f8f6f0] text-xs font-semibold h-10 sm:h-9 bg-white shadow-2xs gap-1.5 touch-manipulation"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => onNavigateTab?.('settings')}
                            className="flex-1 sm:flex-initial bg-[#1b3c37] hover:bg-[#132d29] text-[#f0ebe1] font-semibold text-xs h-10 sm:h-9 gap-1.5 shadow-sm touch-manipulation"
                        >
                            <Sliders className="w-3.5 h-3.5" />
                            Ajustar Taxas & Limites
                        </Button>
                    </div>
                </div>
            </div>

            {/* 4 KPIS VITAIS DE ECONOMIA DA IA (GRID 2x2 NO MOBILE / 4 NO DESKTOP) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {/* KPI 1: Faturamento Bruto da IA */}
                <Card className="p-3.5 sm:p-5 bg-white border border-[#e4ded5] rounded-2xl shadow-[0_2px_8px_rgba(27,60,55,0.03)] flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] sm:text-xs font-semibold text-[#262624]/60 uppercase tracking-wider">
                                Receita Bruta (Add-on)
                            </span>
                            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#f4efe6] text-[#1b3c37] flex items-center justify-center font-bold">
                                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-base sm:text-2xl font-serif font-bold text-[#1b3c37]">
                                {formatBrl(metrics.grossRevenue)}
                            </h3>
                            <p className="text-[10px] sm:text-[11px] text-[#262624]/60 mt-1 truncate">
                                {metrics.paidSessions} consulta(s) cobrada(s) (R$ 2,90)
                            </p>
                        </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-[#f4efe6] flex items-center justify-between text-[10px] sm:text-[11px] text-[#1b3c37] font-semibold">
                        <span>Repasse quinzenal</span>
                        <span className="text-[#262624]/50">Automático</span>
                    </div>
                </Card>

                {/* KPI 2: Custos Técnicos (APIs STT + LLM) */}
                <Card className="p-3.5 sm:p-5 bg-white border border-[#e4ded5] rounded-2xl shadow-[0_2px_8px_rgba(27,60,55,0.03)] flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] sm:text-xs font-semibold text-[#262624]/60 uppercase tracking-wider">
                                Custos de Infraestrutura
                            </span>
                            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#f4efe6] text-[#262624] flex items-center justify-center font-bold">
                                <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1b3c37]" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-base sm:text-2xl font-serif font-bold text-[#262624]">
                                {formatBrl(metrics.totalCost)}
                            </h3>
                            <p className="text-[10px] sm:text-[11px] text-[#262624]/60 mt-1 truncate">
                                {metrics.totalSessions} sessão(ões) × ~R$ 1,20
                            </p>
                        </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-[#f4efe6] flex items-center justify-between text-[10px] sm:text-[11px] text-[#262624]/70 font-medium">
                        <span>STT + Gemini Flash</span>
                        <span className="text-xs font-bold text-[#1b3c37]">~R$ 1,20/un</span>
                    </div>
                </Card>

                {/* KPI 3: Margem Líquida Gerada pela IA */}
                <Card className="p-3.5 sm:p-5 bg-white border border-[#e4ded5] rounded-2xl shadow-[0_2px_8px_rgba(27,60,55,0.03)] flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] sm:text-xs font-semibold text-[#262624]/60 uppercase tracking-wider">
                                Margem Líquida da IA
                            </span>
                            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-base sm:text-2xl font-serif font-bold text-[#1b3c37]">
                                {formatBrl(metrics.netProfit)}
                            </h3>
                            <p className="text-[10px] sm:text-[11px] text-[#262624]/60 mt-1 truncate">
                                Margem operacional unitária: <strong className="text-[#1b3c37]">58.6%</strong>
                            </p>
                        </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-[#f4efe6] flex items-center justify-between text-[10px] sm:text-[11px] text-emerald-800 font-semibold">
                        <span>Lucro por sessão</span>
                        <span className="font-bold">+ R$ 1,70</span>
                    </div>
                </Card>

                {/* KPI 4: Aderência dos Psicólogos & Degustação */}
                <Card className="p-3.5 sm:p-5 bg-white border border-[#e4ded5] rounded-2xl shadow-[0_2px_8px_rgba(27,60,55,0.03)] flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] sm:text-xs font-semibold text-[#262624]/60 uppercase tracking-wider">
                                Aderência da Equipe
                            </span>
                            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#f4efe6] text-[#1b3c37] flex items-center justify-center font-bold">
                                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-base sm:text-2xl font-serif font-bold text-[#262624]">
                                {metrics.activeProfsUsing} / {professionalsCount}
                            </h3>
                            <p className="text-[10px] sm:text-[11px] text-[#262624]/60 mt-1 truncate">
                                {metrics.trialSessions} degustação(ões) concedida(s)
                            </p>
                        </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-[#f4efe6] flex items-center justify-between text-[10px] sm:text-[11px] text-[#1b3c37] font-semibold">
                        <span>Taxa de conversão</span>
                        <span>{metrics.conversionRate.toFixed(0)}%</span>
                    </div>
                </Card>
            </div>

            {/* QUADRO COMPARATIVO: UNIT ECONOMICS + RESILIÊNCIA OPERACIONAL */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* CARD 1: UNIT ECONOMICS EXECUTIVO (2 COLUNAS NO DESKTOP) */}
                <Card className="lg:col-span-2 p-4 sm:p-6 bg-white border border-[#e4ded5] rounded-2xl shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f4efe6] pb-3">
                        <div>
                            <h3 className="font-serif font-bold text-[#1b3c37] text-sm sm:text-base flex items-center gap-2">
                                <Activity className="w-4 h-4 text-[#1b3c37]" />
                                Decomposição Unitária do Add-on (Por Consulta)
                            </h3>
                            <p className="text-xs text-[#262624]/70">
                                Estrutura de precificação e margem de contribuição por evolução clínica estruturada.
                            </p>
                        </div>
                        <span className="self-start sm:self-auto text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +58,6% Margem Líquida
                        </span>
                    </div>

                    {/* BARRA VISUAL DE DISTRIBUIÇÃO DA RECEITA */}
                    <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between items-center text-[11px] text-[#262624]/70 font-medium">
                            <span>Distribuição de R$ 2,90 cobrados:</span>
                            <span className="text-[#1b3c37] font-semibold">R$ 1,70 Lucro (58,6%) • R$ 1,20 Infra (41,4%)</span>
                        </div>
                        <div className="h-3 w-full bg-[#f4efe6] rounded-full overflow-hidden flex border border-[#e4ded5]">
                            <div
                                style={{ width: '58.6%' }}
                                className="bg-[#1b3c37] h-full transition-all duration-500"
                                title="Margem Líquida Doxologos: 58.6%"
                            />
                            <div
                                style={{ width: '40.7%' }}
                                className="bg-[#c4bcb1] h-full transition-all duration-500"
                                title="Transcrição Whisper/Deepgram: 40.7%"
                            />
                            <div
                                style={{ width: '0.7%' }}
                                className="bg-[#d97706] h-full transition-all duration-500"
                                title="Inferência Gemini Flash: 0.7%"
                            />
                        </div>
                    </div>

                    {/* LINHAS DE DECOMPOSIÇÃO ELEGANTE */}
                    <div className="space-y-2 pt-2 text-xs">
                        {/* Preço de Venda */}
                        <div className="flex justify-between items-center p-3 bg-[#f8f6f0] rounded-xl border border-[#e4ded5]">
                            <div>
                                <span className="font-semibold text-[#262624] block">Preço do Add-on cobrado do psicólogo</span>
                                <span className="text-[11px] text-[#262624]/60">Debitado automaticamente no repasse quinzenal</span>
                            </div>
                            <span className="font-bold font-serif text-[#1b3c37] text-sm sm:text-base">R$ 2,90</span>
                        </div>

                        {/* Dedução STT */}
                        <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#e4ded5] hover:bg-[#f8f6f0]/50 transition-colors">
                            <div>
                                <span className="font-medium text-[#262624] block">(-) Transcrição de Áudio (STT - Whisper/Deepgram ~50 min)</span>
                                <span className="text-[11px] text-[#262624]/60">Processamento assíncrono de voz com criptografia em trânsito</span>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-[#b91c1c]">- R$ 1,18</span>
                                <span className="text-[10px] text-[#262624]/50 block">40,7% do add-on</span>
                            </div>
                        </div>

                        {/* Dedução LLM */}
                        <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#e4ded5] hover:bg-[#f8f6f0]/50 transition-colors">
                            <div>
                                <span className="font-medium text-[#262624] block">(-) Inferência Gemini 1.5 Flash (~2.5k tokens in/out)</span>
                                <span className="text-[11px] text-[#262624]/60">Estruturação SOAP/Doxologos e síntese clínica sem retenção de dados</span>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-[#b91c1c]">- R$ 0,02</span>
                                <span className="text-[10px] text-[#262624]/50 block">0,7% do add-on</span>
                            </div>
                        </div>

                        {/* Resultado Líquido */}
                        <div className="flex justify-between items-center p-3.5 bg-[#1b3c37]/5 rounded-xl border border-[#1b3c37]/20">
                            <div>
                                <span className="font-bold text-[#1b3c37] block text-xs sm:text-sm">(=) Margem de Contribuição Líquida da Doxologos</span>
                                <span className="text-[11px] text-[#1b3c37]/80">Lucro livre retido por prontuário gerado</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[#1b3c37] text-base sm:text-lg font-bold font-serif">+ R$ 1,70 / sessão</span>
                                <span className="text-[10px] font-semibold text-emerald-800 block">58,6% de margem</span>
                            </div>
                        </div>
                    </div>

                    {/* INSIGHT ESTRATÉGICO CAC LOCK-IN */}
                    <div className="pt-3 border-t border-[#f4efe6] text-[11px] text-[#262624]/75 flex items-start gap-2.5 bg-[#f8f6f0] p-3 rounded-xl border border-[#e4ded5]/70">
                        <ShieldCheck className="w-4 h-4 text-[#1b3c37] shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                            <strong className="text-[#1b3c37]">Estratégia de Degustação (CAC Lock-in):</strong> 3 sessões gratuitas representam um investimento máximo de apenas R$ 3,60 por psicólogo. A partir da 3ª sessão paga subsequente, o custo de aquisição é 100% amortizado, gerando margem de contribuição perpétua.
                        </div>
                    </div>
                </Card>

                {/* CARD 2: RESILIÊNCIA OPERACIONAL & GUARDRAILS */}
                <Card className="p-4 sm:p-6 bg-white border border-[#e4ded5] rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 border-b border-[#f4efe6] pb-3">
                            <ShieldCheck className="w-4 h-4 text-[#1b3c37]" />
                            <h3 className="font-serif font-bold text-[#1b3c37] text-sm sm:text-base">Guardrails & Resiliência</h3>
                        </div>

                        <div className="space-y-3.5 pt-3 text-xs">
                            {/* Circuit Breaker Status */}
                            <div className="p-3 bg-[#f8f6f0] border border-[#e4ded5] rounded-xl">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                        <span className="font-bold text-[#262624]">Circuit Breaker Telemedicina</span>
                                    </div>
                                    <span className="bg-[#1b3c37] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        Ativo
                                    </span>
                                </div>
                                <p className="text-[11px] text-[#262624]/70 leading-relaxed">
                                    Em caso de oscilação na Daily.co, o tráfego é direcionado instantaneamente para a sala de contingência segura, assegurando zero perda de consultas.
                                </p>
                            </div>

                            {/* Consumo do Teto Orçamentário */}
                            <div className="p-3 bg-[#f8f6f0] border border-[#e4ded5] rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-[#262624]">Teto Mensal de IA:</span>
                                    <span className="font-bold font-serif text-[#1b3c37]">
                                        {formatBrl(monthlyCap)}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-white rounded-full overflow-hidden border border-[#e4ded5]">
                                    <div
                                        style={{ width: `${budgetConsumedPct}%` }}
                                        className="h-full bg-emerald-700 rounded-full transition-all duration-500"
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-[#262624]/60">
                                    <span>Consumido: {formatBrl(metrics.totalCost)}</span>
                                    <span>{budgetConsumedPct.toFixed(1)}% utilizado</span>
                                </div>
                            </div>

                            {/* Conformidade Ética CFP */}
                            <div className="p-3 bg-white border border-[#e4ded5] rounded-xl flex items-start gap-2">
                                <Lock className="w-4 h-4 text-[#1b3c37] shrink-0 mt-0.5" />
                                <div className="text-[11px] text-[#262624]/70 leading-relaxed">
                                    <strong className="text-[#1b3c37]">Privacidade & CFP 01/2009:</strong> Áudio de teleconsultas é processado em memória volátil e prontuários exigem validação soberana do psicólogo antes da assinatura digital.
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigateTab?.('settings')}
                        className="w-full text-xs font-semibold text-[#1b3c37] border-[#e4ded5] hover:bg-[#f8f6f0] mt-4 h-10 sm:h-9 shadow-2xs touch-manipulation"
                    >
                        Configurar Limites & Alertas
                    </Button>
                </Card>
            </div>

            {/* EXTRATO CONTÁBIL DO COPILOTO IA (LEDGER) */}
            <Card className="p-4 sm:p-6 bg-white border border-[#e4ded5] rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f4efe6] pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#1b3c37]" />
                            <h3 className="font-serif font-bold text-[#1b3c37] text-base sm:text-lg">
                                Extrato Contábil de Lançamentos de IA (Ledger)
                            </h3>
                        </div>
                        <p className="text-xs text-[#262624]/70 mt-0.5">
                            Auditoria contábil imutável, apuração quinzenal e rastreabilidade por consulta realizada.
                        </p>
                    </div>

                    {/* FILTROS RÁPIDOS SEM SCROLLBAR VISÍVEL */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-0.5">
                        <button
                            onClick={() => setLedgerFilter('all')}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all touch-manipulation whitespace-nowrap ${
                                ledgerFilter === 'all'
                                    ? 'bg-[#1b3c37] text-[#f0ebe1] shadow-2xs'
                                    : 'bg-[#f4efe6] text-[#262624]/70 hover:bg-[#e4ded5]'
                            }`}
                        >
                            Todos ({ledgerData.length})
                        </button>
                        <button
                            onClick={() => setLedgerFilter('paid')}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all touch-manipulation whitespace-nowrap ${
                                ledgerFilter === 'paid'
                                    ? 'bg-[#1b3c37] text-[#f0ebe1] shadow-2xs'
                                    : 'bg-[#f4efe6] text-[#262624]/70 hover:bg-[#e4ded5]'
                            }`}
                        >
                            Pagos ({metrics.paidSessions})
                        </button>
                        <button
                            onClick={() => setLedgerFilter('trial')}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all touch-manipulation whitespace-nowrap ${
                                ledgerFilter === 'trial'
                                    ? 'bg-[#1b3c37] text-[#f0ebe1] shadow-2xs'
                                    : 'bg-[#f4efe6] text-[#262624]/70 hover:bg-[#e4ded5]'
                            }`}
                        >
                            Degustação ({metrics.trialSessions})
                        </button>
                    </div>
                </div>

                {filteredLedger.length === 0 ? (
                    <div className="py-12 px-4 text-center rounded-xl bg-[#f8f6f0] border border-dashed border-[#e4ded5] max-w-xl mx-auto my-4 space-y-2">
                        <div className="w-10 h-10 rounded-full bg-[#f4efe6] text-[#1b3c37] flex items-center justify-center mx-auto font-bold">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <h4 className="font-serif font-bold text-[#1b3c37] text-sm">
                            Nenhum prontuário com IA registrado no período
                        </h4>
                        <p className="text-xs text-[#262624]/70 max-w-md mx-auto leading-relaxed">
                            Assim que um psicólogo finalizar uma sessão com transcrição autorizada pelo paciente, o lançamento financeiro automático (R$ 2,90 cobrados, R$ 1,20 custo e R$ 1,70 margem líquida) será discriminado aqui em tempo real.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* VISÃO MOBILE: CARDS COMPACTOS COM TOUCH AMIGÁVEL (< 640px) */}
                        <div className="block sm:hidden space-y-2.5">
                            {filteredLedger.slice(0, 15).map((row) => (
                                <div
                                    key={row.id}
                                    className="p-3 bg-white border border-[#e4ded5] rounded-xl shadow-2xs space-y-2"
                                >
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5 text-[#262624]/60">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{new Date(row.created_at).toLocaleDateString('pt-BR')}</span>
                                        </div>
                                        {row.is_trial ? (
                                            <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                Degustação
                                            </span>
                                        ) : (
                                            <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                Pago (R$ 2,90)
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-baseline pt-1">
                                        <div>
                                            <p className="font-semibold text-xs text-[#262624]">
                                                {row.professional?.name || 'Psicólogo'}
                                            </p>
                                            <p className="text-[11px] text-[#262624]/60">
                                                Paciente: {row.booking?.patient_name || 'Paciente'}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-serif font-bold text-[#1b3c37] block">
                                                {row.is_trial ? 'R$ 0,00' : formatBrl(row.add_on_amount || 2.90)}
                                            </span>
                                            <span className="text-[10px] text-emerald-800 font-semibold block">
                                                Margem: {row.is_trial ? `(${formatBrl(row.technical_cost || 1.20)})` : `+${formatBrl((row.add_on_amount || 2.90) - (row.technical_cost || 1.20))}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* VISÃO DESKTOP: TABELA COMPLETA COM ESTILIZAÇÃO DOXOLOGOS (>= 640px) */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-xs text-left text-[#262624]">
                                <thead className="text-[11px] uppercase bg-[#f8f6f0] text-[#262624]/70 font-bold border-b border-[#e4ded5]">
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
                                <tbody className="divide-y divide-[#f4efe6]">
                                    {filteredLedger.slice(0, 15).map((row) => (
                                        <tr key={row.id} className="hover:bg-[#f8f6f0]/60 transition-colors">
                                            <td className="p-3 font-mono text-[#262624]/80">
                                                {new Date(row.created_at).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="p-3 font-semibold text-[#262624]">
                                                {row.professional?.name || 'Psicólogo'}
                                            </td>
                                            <td className="p-3 text-[#262624]/75">
                                                {row.booking?.patient_name || 'Paciente'}
                                            </td>
                                            <td className="p-3">
                                                {row.is_trial ? (
                                                    <span className="bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        Degustação
                                                    </span>
                                                ) : (
                                                    <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        Pago (R$ 2,90)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right font-bold text-[#1b3c37]">
                                                {row.is_trial ? 'R$ 0,00' : formatBrl(row.add_on_amount || 2.90)}
                                            </td>
                                            <td className="p-3 text-right text-[#b91c1c] font-medium">
                                                ({formatBrl(row.technical_cost || 1.20)})
                                            </td>
                                            <td className="p-3 text-right font-bold text-emerald-800 font-serif">
                                                {row.is_trial
                                                    ? `(${formatBrl(row.technical_cost || 1.20)})`
                                                    : `+${formatBrl((row.add_on_amount || 2.90) - (row.technical_cost || 1.20))}`}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="text-[10px] bg-[#f4efe6] text-[#262624] px-2 py-0.5 rounded-md font-medium border border-[#e4ded5]">
                                                    {row.billing_status === 'deducted' ? 'Debitado' : 'A Compensar'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>
        </div>
    );
}

export default AiEconomicsCockpit;
