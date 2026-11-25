import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  Percent,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Sliders,
  Users,
  Calendar,
  Sparkles,
  RefreshCw,
  Download,
  Lightbulb,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  pctDelta,
  formatDelta,
  computeOccupancyPct,
  filterBookingsByPeriod,
  generateExecutiveCsvReport,
  summarizeBookingsFinancials
} from '@/lib/adminMetrics';
import { fetchExecutiveInsights } from '@/services/adminInsightsService';

const PERIOD_OPTIONS = [
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'month', label: 'Mês Atual' },
  { id: 'prev_month', label: 'Mês Anterior' },
  { id: 'all', label: 'Histórico' }
];

export function StrategicCockpitModule({
  summaryData = {},
  financialData = {},
  alertsData = {},
  bookings = [],
  professionals = [],
  services = [],
  availability = {},
  onNavigateTab
}) {
  const { settings } = useSystemSettings();
  const defaultRetention = Number(settings.platform_default_retention_pct || 40);

  // Filtro de Recorte Temporal (Hoje, 7d, 30d, mês, mês anterior, histórico)
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Simulador de Projeção Financeira (Forward Looking)
  const [simConsultasMes, setSimConsultasMes] = useState(150);
  const [simPrecoMedio, setSimPrecoMedio] = useState(150);
  const [simTakeRatePct, setSimTakeRatePct] = useState(defaultRetention);

  // Estado da Camada de Inteligência e IA
  const [insights, setInsights] = useState(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  useEffect(() => {
    if (settings.platform_default_retention_pct !== undefined) {
      setSimTakeRatePct(Number(settings.platform_default_retention_pct));
    }
  }, [settings.platform_default_retention_pct]);

  // Formatadores de moeda e números
  const formatBrl = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPct = (val) => {
    if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
    return `${Number(val).toFixed(1)}%`;
  };

  // 1. Filtragem dinâmica por período
  const periodData = useMemo(() => {
    if (Array.isArray(bookings) && bookings.length > 0) {
      return filterBookingsByPeriod(bookings, selectedPeriod);
    }
    return { current: [], previous: [], label: 'Últimos 30 dias' };
  }, [bookings, selectedPeriod]);

  // 2. Consolidação canônica de métricas do período selecionado
  const currentSummary = useMemo(() => {
    if (Array.isArray(bookings) && bookings.length > 0) {
      return summarizeBookingsFinancials(periodData.current);
    }
    // Fallback gracioso caso bookings ainda esteja carregando
    return {
      gmvRealized: summaryData?.receita_consultas ?? financialData?.monthlyRevenue ?? 0,
      payoutRealized: (summaryData?.receita_consultas ?? 0) - (financialData?.netMargin ?? 0),
      platformGrossMargin: financialData?.netMargin ?? 0,
      takeRatePct: financialData?.takeRatePct ?? null,
      toReceive: financialData?.toReceive ?? 0,
      realizedCount: summaryData?.consultas_confirmadas ?? 0,
      pendingCount: alertsData?.pendingAppointmentsCount ?? 0
    };
  }, [bookings, periodData.current, summaryData, financialData, alertsData]);

  // 3. Consolidação canônica do período anterior (para base comparativa real)
  const prevSummary = useMemo(() => {
    if (Array.isArray(bookings) && bookings.length > 0 && periodData.previous.length > 0) {
      return summarizeBookingsFinancials(periodData.previous);
    }
    return null;
  }, [bookings, periodData.previous]);

  // Deltas reais calculados
  const gmvDelta = useMemo(() => {
    if (prevSummary) {
      return pctDelta(currentSummary.gmvRealized, prevSummary.gmvRealized);
    }
    return summaryData?.receita_consultas_delta_pct ?? null;
  }, [currentSummary.gmvRealized, prevSummary, summaryData]);

  const countDelta = useMemo(() => {
    if (prevSummary) {
      return pctDelta(currentSummary.realizedCount, prevSummary.realizedCount);
    }
    return null;
  }, [currentSummary.realizedCount, prevSummary]);

  // Capacidade e Ocupação da Equipe
  const activeProfCount = (Array.isArray(professionals) && professionals.length > 0)
    ? professionals.length
    : (summaryData?.total_professionals || 0);

  const capacityPerProfessional = Number(settings.professional_monthly_capacity_slots);
  const occupancyRatePct = computeOccupancyPct(
    currentSummary.realizedCount,
    activeProfCount,
    capacityPerProfessional
  );

  // Detecção de psicólogos sem horários configurados na agenda
  const profsWithoutAvailability = useMemo(() => {
    if (!Array.isArray(professionals) || professionals.length === 0) return [];
    return professionals.filter((prof) => {
      const profAvail = availability?.[prof.id];
      if (!profAvail) return true;
      const totalSlots = Object.values(profAvail).reduce((acc, times) => {
        return acc + (Array.isArray(times) ? times.length : 0);
      }, 0);
      return totalSlots === 0;
    });
  }, [professionals, availability]);

  // 4. Integração com IA Doxologos Copilot (Gemini + Fallback Determinístico Local)
  const refreshInsights = useCallback(async (force = false) => {
    setIsLoadingInsights(true);
    try {
      if (force && typeof window !== 'undefined' && window.sessionStorage) {
        const cacheKey = `doxologos_admin_insights_${periodData.label}_${Math.round(currentSummary.gmvRealized || 0)}`;
        sessionStorage.removeItem(cacheKey);
      }
      const data = await fetchExecutiveInsights({
        gmvRealized: currentSummary.gmvRealized,
        payoutRealized: currentSummary.payoutRealized,
        grossMargin: currentSummary.platformGrossMargin,
        takeRatePct: currentSummary.takeRatePct,
        realizedCount: currentSummary.realizedCount,
        pendingCount: currentSummary.pendingCount,
        toReceive: currentSummary.toReceive,
        deltaGmvPct: gmvDelta,
        occupancyPct: occupancyRatePct,
        activeProfessionalsCount: activeProfCount,
        periodLabel: periodData.label
      });
      setInsights(data);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.warn('[StrategicCockpit] Erro ao carregar insights:', err);
    } finally {
      setIsLoadingInsights(false);
    }
  }, [
    currentSummary.gmvRealized,
    currentSummary.payoutRealized,
    currentSummary.platformGrossMargin,
    currentSummary.takeRatePct,
    currentSummary.realizedCount,
    currentSummary.pendingCount,
    currentSummary.toReceive,
    gmvDelta,
    occupancyRatePct,
    activeProfCount,
    periodData.label
  ]);

  useEffect(() => {
    refreshInsights();
    // Executa na troca de período ou quando a quantidade de agendamentos mudar
  }, [selectedPeriod, bookings?.length]);

  // 5. Exportação de Relatório Executivo em CSV (com UTF-8 BOM para Excel)
  const handleExportCsv = () => {
    try {
      const csv = generateExecutiveCsvReport(
        currentSummary,
        periodData.current,
        periodData.label
      );
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const createUrl = (typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function')
        ? window.URL.createObjectURL
        : (() => 'mock-csv-url');
      const revokeUrl = (typeof window !== 'undefined' && window.URL && typeof window.URL.revokeObjectURL === 'function')
        ? window.URL.revokeObjectURL
        : (() => {});

      const url = createUrl(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `relatorio_executivo_doxologos_${selectedPeriod}_${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      revokeUrl(url);
    } catch (err) {
      console.error('Erro ao exportar CSV executivo:', err);
    }
  };

  // Cálculos do Simulador de Projeção
  const simGmvMensal = simConsultasMes * simPrecoMedio;
  const simReceitaBrutaDoxologos = simGmvMensal * (simTakeRatePct / 100);
  const simRepasseProfissionais = simGmvMensal - simReceitaBrutaDoxologos;
  const simGmvAnual = simGmvMensal * 12;
  const simReceitaAnualDoxologos = simReceitaBrutaDoxologos * 12;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* CABEÇALHO DO COCKPIT EXECUTIVO COM SELETOR DE PERÍODO E AÇÕES RÁPIDAS */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs text-slate-900 font-sans space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-0.5 rounded-md flex items-center gap-1.5 border border-slate-200 whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Cockpit Executivo & Governança
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Regime de Caixa • Dados em Tempo Real</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Painel Estratégico Doxologos
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Acompanhamento de volume bruto (GMV), receita realizada da clínica, taxa de ocupação das agendas e diagnóstico assistido por IA.
            </p>
          </div>

          {/* Ações Rápidas (DRE e CSV) */}
          <div className="flex items-center gap-2 shrink-0 self-start">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs shadow-xs bg-white h-9 sm:h-8 whitespace-nowrap shrink-0"
              title="Baixar demonstrativo de faturamento e atendimentos em formato CSV"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Exportar CSV
            </Button>

            <Button
              size="sm"
              onClick={() => onNavigateTab?.('financial-control')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs transition-all text-xs h-9 sm:h-8 whitespace-nowrap shrink-0"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              DRE Consolidada
            </Button>
          </div>
        </div>

        {/* Seletor de Período Dinâmico em largura total abaixo do cabeçalho */}
        <div className="pt-3 border-t border-slate-100 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="inline-flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-inner gap-1 min-w-full sm:min-w-0">
            {PERIOD_OPTIONS.map((opt) => {
              const isActive = selectedPeriod === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedPeriod(opt.id)}
                  className={`text-xs px-3.5 py-2 rounded-lg transition-all whitespace-nowrap flex-1 sm:flex-initial text-center font-medium touch-manipulation ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TOP METRICS BAR - 4 KPIS VITAIS EM GRID 2x2 NO MOBILE / 4 COLUNAS NO DESKTOP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 font-sans">
        {/* KPI 1: GMV Realizado (Volume Bruto) */}
        <Card
          onClick={() => onNavigateTab?.('financial-control')}
          className="p-3.5 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                GMV Realizado
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatBrl(currentSummary.gmvRealized)}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
                <span
                  className={`font-semibold flex items-center ${
                    gmvDelta === null
                      ? 'text-slate-400'
                      : gmvDelta >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {gmvDelta !== null && gmvDelta >= 0 && <ArrowUpRight className="w-3.5 h-3.5" />}
                  {gmvDelta !== null && gmvDelta < 0 && <ArrowDownRight className="w-3.5 h-3.5" />}
                  {formatDelta(gmvDelta)}
                </span>
                <span className="hidden sm:inline">{gmvDelta === null ? 'sem base' : 'vs período anterior'}</span>
              </p>
              {currentSummary.toReceive > 0 && (
                <p className="text-[10px] sm:text-[11px] text-amber-600 mt-1 font-medium leading-tight">
                  A receber (pendente): {formatBrl(currentSummary.toReceive)}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-600 group-hover:text-slate-900 font-semibold group-hover:translate-x-0.5 transition-all">
            <span>Ver extrato financeiro</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </Card>

        {/* KPI 2: Margem Bruta da Plataforma */}
        <Card
          onClick={() => onNavigateTab?.('financial-control')}
          className="p-3.5 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Margem da Plataforma
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatBrl(currentSummary.platformGrossMargin)}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="font-medium">Take Rate:</span>
                <span className="font-bold text-slate-900">
                  {formatPct(currentSummary.takeRatePct)}
                </span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 truncate">
                Repasses: {formatBrl(currentSummary.payoutRealized)}
              </p>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-600 group-hover:text-slate-900 font-semibold group-hover:translate-x-0.5 transition-all">
            <span>Ver DRE & Repasses</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </Card>

        {/* KPI 3: Taxa de Ocupação da Agenda */}
        <Card
          onClick={() => onNavigateTab?.('availability')}
          className="p-3.5 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Ocupação da Agenda
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatPct(occupancyRatePct)}
              </h3>
              <div className="w-full bg-slate-100 h-1.5 sm:h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, occupancyRatePct ?? 0)}%` }}
                />
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1.5">
                <span>{activeProfCount} psicólogo(s)</span>
              </p>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-600 group-hover:text-slate-900 font-semibold group-hover:translate-x-0.5 transition-all">
            <span>Ver grades e horários</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </Card>

        {/* KPI 4: Consultas Realizadas */}
        <Card
          onClick={() => onNavigateTab?.('bookings')}
          className="p-3.5 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Consultas Realizadas
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {currentSummary.realizedCount}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#262624]/60 mt-1 flex items-center gap-1 flex-wrap">
                <span
                  className={`font-semibold flex items-center ${
                    countDelta === null
                      ? 'text-slate-400'
                      : countDelta >= 0
                      ? 'text-[#128a62]'
                      : 'text-[#dc2626]'
                  }`}
                >
                  {countDelta !== null && countDelta >= 0 && <ArrowUpRight className="w-3.5 h-3.5" />}
                  {countDelta !== null && countDelta < 0 && <ArrowDownRight className="w-3.5 h-3.5" />}
                  {formatDelta(countDelta)}
                </span>
                <span className="hidden sm:inline">{countDelta === null ? 'recorte atual' : 'vs anterior'}</span>
              </p>
              {currentSummary.pendingCount > 0 && (
                <p className="text-[10px] sm:text-[11px] text-[#d97706] mt-1 font-medium leading-tight">
                  {currentSummary.pendingCount} pendente(s)
                </p>
              )}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-600 group-hover:text-slate-900 font-semibold group-hover:translate-x-0.5 transition-all">
            <span>Gerenciar atendimentos</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
          </div>
        </Card>
      </div>

      {/* BLOCO DE INTELIGÊNCIA: COPILOTO ANALÍTICO & DIAGNÓSTICO EXECUTIVO (IA) - CARD CLARO PREMIUM */}
      <Card className="p-4 sm:p-6 bg-white text-slate-900 rounded-xl border border-slate-200/80 shadow-xs font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                  Copiloto Analítico & Diagnóstico Executivo
                </h3>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-slate-100 text-slate-700 border-slate-200"
                >
                  {insights?.isAiGenerated ? 'Google Gemini 1.5' : 'Motor Analítico Doxologos'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Diagnóstico de faturamento, ocupação de agenda e oportunidades de rota de produto com Zero PII.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {lastRefreshedAt && (
              <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-slate-400" />
                {lastRefreshedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => refreshInsights(true)}
              disabled={isLoadingInsights}
              className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 text-xs font-semibold h-8 shadow-xs"
              title="Recalcular diagnóstico agora"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${isLoadingInsights ? 'animate-spin text-slate-700' : 'text-slate-700'}`}
              />
              Atualizar Diagnóstico
            </Button>
          </div>
        </div>

        {/* Conteúdo Dinâmico dos Insights */}
        {isLoadingInsights ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-700" />
            <p className="text-xs text-slate-600 font-medium">
              Processando indicadores e gerando recomendações com IA...
            </p>
          </div>
        ) : (
          <div className="mt-4 sm:mt-5 space-y-3 sm:space-y-4">
            {/* Headline Executivo */}
            {insights?.summary && (
              <div className="p-3 sm:p-3.5 bg-slate-50 rounded-lg border border-slate-200/90 text-slate-800 text-xs leading-relaxed font-medium">
                <span className="text-slate-900 font-bold mr-1.5">Síntese do Período:</span>
                {insights.summary}
              </div>
            )}

            {/* Grid de 3 Pilares: Destaque, Atenção e Recomendação */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {/* Pilar 1: Destaque de Performance */}
              <div className="p-3.5 sm:p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Destaque Operacional</span>
                  </div>
                  <p className="text-xs text-emerald-950/90 leading-relaxed font-normal">
                    {insights?.highlight || 'Operação com faturamento realizado e rotinas sem interrupções.'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-emerald-200/60 text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                  Impacto Positivo
                </div>
              </div>

              {/* Pilar 2: Ponto de Atenção */}
              <div className="p-3.5 sm:p-4 bg-amber-50/70 rounded-xl border border-amber-200/90 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center gap-2 text-amber-800 text-xs font-bold mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Ponto de Atenção</span>
                  </div>
                  <p className="text-xs text-amber-950/90 leading-relaxed font-normal">
                    {insights?.attentionPoint || 'Nenhum desvio crítico identificado nas métricas.'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-amber-200/80 text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                  Risco / Gargalo
                </div>
              </div>

              {/* Pilar 3: Recomendação Estratégica */}
              <div className="p-3.5 sm:p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center gap-2 text-blue-900 text-xs font-bold mb-2">
                    <Lightbulb className="w-4 h-4 text-blue-600" />
                    <span>Recomendação de Gestão</span>
                  </div>
                  <p className="text-xs text-blue-900/90 leading-relaxed font-normal">
                    {insights?.recommendation || 'Manter o ritmo de disponibilidade e acompanhar o índice de retorno dos pacientes.'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-blue-200/80 text-[10px] text-blue-800 font-bold uppercase tracking-wider">
                  Ação Sugerida
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* SEÇÃO PRINCIPAL: SIMULADOR DE PROJEÇÃO DE CRESCIMENTO & CENTRAL DE ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* SIMULADOR DE PROJEÇÃO FINANCEIRA (FORWARD LOOKING) */}
        <Card className="lg:col-span-2 p-4 sm:p-6 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-4 mb-4 sm:mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center">
                <Sliders className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm sm:text-base text-slate-900">
                  Simulador de Cenários & Projeção de Receita
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Projete o faturamento anual ajustando volume de consultas, ticket médio e taxa retida pela clínica.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            {/* Control 1: Consultas por Mês */}
            <div className="space-y-2 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/80">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">Consultas/Mês:</span>
                <span className="font-extrabold text-slate-900 tabular-nums">{simConsultasMes}</span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={simConsultasMes}
                onChange={(e) => setSimConsultasMes(Number(e.target.value))}
                className="w-full accent-slate-900 bg-slate-200 h-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Control 2: Ticket Médio */}
            <div className="space-y-2 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/80">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">Valor Médio Consulta:</span>
                <span className="font-extrabold text-slate-900 tabular-nums">{formatBrl(simPrecoMedio)}</span>
              </div>
              <input
                type="range"
                min="80"
                max="400"
                step="10"
                value={simPrecoMedio}
                onChange={(e) => setSimPrecoMedio(Number(e.target.value))}
                className="w-full accent-slate-900 bg-slate-200 h-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Control 3: Take Rate da Plataforma (%) */}
            <div className="space-y-2 bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200/80">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">Taxa Plataforma:</span>
                <span className="font-extrabold text-slate-900 tabular-nums">{simTakeRatePct}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="1"
                value={simTakeRatePct}
                onChange={(e) => setSimTakeRatePct(Number(e.target.value))}
                className="w-full accent-slate-900 bg-slate-200 h-2 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Cards de Resultado da Projeção */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200/80">
              <p className="text-[10px] sm:text-[11px] text-slate-500 uppercase font-bold tracking-wider">GMV Anual Projetado</p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 tabular-nums">{formatBrl(simGmvAnual)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">{formatBrl(simGmvMensal)} /mês</p>
            </div>

            <div className="bg-emerald-50/70 p-3.5 sm:p-4 rounded-xl border border-emerald-200/80">
              <p className="text-[10px] sm:text-[11px] text-emerald-800 uppercase font-bold tracking-wider">Receita Anual Doxologos</p>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-950 mt-1 tabular-nums">{formatBrl(simReceitaAnualDoxologos)}</p>
              <p className="text-[10px] text-emerald-700 font-medium mt-0.5 tabular-nums">{formatBrl(simReceitaBrutaDoxologos)} /mês</p>
            </div>

            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200/80">
              <p className="text-[10px] sm:text-[11px] text-slate-500 uppercase font-bold tracking-wider">Repasses aos Psicólogos</p>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 tabular-nums">{formatBrl(simRepasseProfissionais * 12)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">{formatBrl(simRepasseProfissionais)} /mês</p>
            </div>
          </div>
        </Card>

        {/* CENTRAL DE ALERTAS CRÍTICOS & SAÚDE OPERACIONAL */}
        <Card className="p-4 sm:p-6 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 sm:mb-4 pb-2.5 sm:pb-3 border-b border-slate-100">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              <h3 className="font-sans font-bold text-slate-900 text-xs sm:text-sm">Precisa de Você Hoje (Operação)</h3>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {/* Alerta 1: Cobranças ou Agendamentos Pendentes */}
              {currentSummary.pendingCount > 0 ? (
                <div className="p-3 sm:p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0 animate-pulse" />
                  <div className="text-xs text-amber-950 flex-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>Agendamentos Pendentes</span>
                      <span className="bg-amber-200/90 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full tabular-nums">
                        {currentSummary.pendingCount}
                      </span>
                    </p>
                    <p className="text-amber-800 mt-0.5 text-[11px] leading-relaxed">
                      {currentSummary.pendingCount} cobrança(s) aguardando liquidação PIX ou confirmação.
                    </p>
                    <button
                      onClick={() => onNavigateTab?.('bookings')}
                      className="mt-1.5 text-amber-900 underline font-semibold hover:text-amber-950 flex items-center gap-1 text-[11px]"
                    >
                      Resolver pendências &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                  <div className="text-xs text-slate-900">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Sem Cobranças Pendentes</span>
                    </p>
                    <p className="text-slate-500 mt-0.5 text-[11px]">Todas as consultas do recorte foram concluídas ou processadas.</p>
                  </div>
                </div>
              )}

              {/* Alerta 2: Psicólogos sem Agenda Configurada */}
              {profsWithoutAvailability.length > 0 ? (
                <div className="p-3 sm:p-3.5 bg-rose-50/80 border border-rose-200/90 rounded-xl flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                  <div className="text-xs text-rose-950 flex-1">
                    <p className="font-bold flex items-center gap-1.5">
                      <span>Psicólogos sem Agenda</span>
                      <span className="bg-rose-200/90 text-rose-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full tabular-nums">
                        {profsWithoutAvailability.length}
                      </span>
                    </p>
                    <p className="text-rose-800 mt-0.5 text-[11px] leading-relaxed">
                      {profsWithoutAvailability.length} psicólogo(s) não possuem horários ativos na grade semanal.
                    </p>
                    <button
                      onClick={() => onNavigateTab?.('availability')}
                      className="mt-1.5 text-rose-900 underline font-semibold hover:text-rose-950 flex items-center gap-1 text-[11px]"
                    >
                      Cadastrar horários &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
                  <div className="text-xs text-slate-900">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Agendas 100% Configuradas</span>
                    </p>
                    <p className="text-slate-500 mt-0.5 text-[11px]">Todos os psicólogos cadastrados possuem horários de atendimento.</p>
                  </div>
                </div>
              )}

              {/* Alerta 3: Resiliência Fiscal NFS-e */}
              <div className="p-3 sm:p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5 flex-shrink-0" />
                <div className="text-xs text-slate-900">
                  <p className="font-bold flex items-center gap-1.5 text-slate-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-900" />
                    <span>Emissão Fiscal NFS-e</span>
                  </p>
                  <p className="text-slate-500 mt-0.5 text-[11px]">
                    Módulo fiscal ativo com emissão assíncrona automática e retentativas no Focus NFe.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab?.('bookings')}
              className="w-full text-xs font-semibold text-slate-700 hover:bg-slate-100 border-slate-200/80 h-9"
            >
              Ir para Gestão de Consultas
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default StrategicCockpitModule;
