import React, { useState, useEffect, Suspense, lazy } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  FileText,
  Receipt,
  Building2,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  PieChart,
  ShieldCheck,
  Calendar,
  Sparkles,
  Cpu,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { REALIZED_STATUSES, computeConsolidatedDreMetrics } from '@/lib/adminMetrics';

const ReconciliationPanel = lazy(() => import('@/components/admin/ReconciliationPanel').then(m => ({ default: m.ReconciliationPanel })));
const LedgerStats = lazy(() => import('@/components/admin/LedgerStats').then(m => ({ default: m.LedgerStats })));
const LedgerCharts = lazy(() => import('@/components/admin/LedgerCharts').then(m => ({ default: m.LedgerCharts })));
const LedgerTable = lazy(() => import('@/components/admin/LedgerTable').then(m => ({ default: m.LedgerTable })));

export function FinancialControlModule({
  financialData = {},
  bookings = [],
  userRole = 'admin',
  onNavigateTab
}) {
  const { settings } = useSystemSettings();
  const [subTab, setSubTab] = useState('dre'); // 'dre', 'reconcile', 'ledger', 'refunds'
  
  // Período DRE (Default: Mês e Ano atuais)
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [selectedYear, setSelectedYear] = useState(currentYearNum);

  const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const formatBrl = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const mpFeeRate = (Number(settings.mp_estimated_gateway_fee_pct) || 2.99) / 100;
  const nfseTaxRate = (Number(settings.nfse_estimated_tax_rate_pct) || 6.00) / 100;
  const defaultRetentionPct = Number(settings.platform_default_retention_pct) || 40;

  // Estado para armazenar os dados reais do DRE (paginado, com custos operacionais e sem mascarar prejuízo)
  const [dreData, setDreData] = useState({
    gmv: 0,
    payoutTotal: 0,
    count: 0,
    aiGrossRevenue: 0,
    aiTechnicalCost: 0,
    aiSessionsCount: 0,
    aiTrialCount: 0,
    aiNetMargin: 0,
    operationalCosts: 0,
    operationalCostsCount: 0,
    platformConsultationMargin: 0,
    platformGrossMargin: 0,
    estimatedMpFees: 0,
    estimatedNfseTaxes: 0,
    netMargin: 0,
    takeRatePct: defaultRetentionPct,
    isProfitable: true,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    let cancelled = false;
    const PAGE_SIZE = 1000; // limite padrão do Supabase por requisição

    async function fetchDRE() {
      setDreData(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const rows = [];
        for (let from = 0; ; from += PAGE_SIZE) {
          let query = supabase.from('bookings').select(`
            valor_consulta, 
            valor_repasse_profissional, 
            status,
            service:services ( price, professional_payout )
          `);

          // Alinhado com REALIZED_STATUSES (inclui no_show_unjustified)
          query = query.in('status', REALIZED_STATUSES);

          // Filtros de Data
          if (selectedYear !== 'all') {
              const y = Number(selectedYear);
              if (selectedMonth !== 'all') {
                  const m = Number(selectedMonth);
                  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
                  const endDate = new Date(y, m, 0).toISOString().split('T')[0];
                  query = query.gte('booking_date', startDate).lte('booking_date', endDate);
              } else {
                  const startDate = `${y}-01-01`;
                  const endDate = `${y}-12-31`;
                  query = query.gte('booking_date', startDate).lte('booking_date', endDate);
              }
          }

          // order estável é necessário para paginação consistente
          const { data, error } = await query.order('booking_date', { ascending: true }).range(from, from + PAGE_SIZE - 1);
          if (error) throw error;
          rows.push(...(data || []));
          if (!data || data.length < PAGE_SIZE) break;
        }

        // Buscar dados de uso de IA do mesmo período (ai_usage_ledger)
        let aiRows = [];
        try {
          let aiQuery = supabase.from('ai_usage_ledger').select('add_on_amount, technical_cost, is_trial, billing_status, created_at');
          if (selectedYear !== 'all') {
            const y = Number(selectedYear);
            if (selectedMonth !== 'all') {
              const m = Number(selectedMonth);
              const startDate = `${y}-${String(m).padStart(2, '0')}-01T00:00:00`;
              const endDate = new Date(y, m, 0).toISOString().split('T')[0] + 'T23:59:59';
              aiQuery = aiQuery.gte('created_at', startDate).lte('created_at', endDate);
            } else {
              const startDate = `${y}-01-01T00:00:00`;
              const endDate = `${y}-12-31T23:59:59`;
              aiQuery = aiQuery.gte('created_at', startDate).lte('created_at', endDate);
            }
          }
          const { data: fetchedAiRows, error: aiError } = await aiQuery;
          if (!aiError && fetchedAiRows) {
            aiRows = fetchedAiRows;
          }
        } catch (aiErr) {
          console.warn('[FinancialControlModule] Erro ao carregar ai_usage_ledger para DRE:', aiErr);
        }

        // Buscar custos operacionais fixos/variáveis (platform_costs) do mesmo período
        let platformCostsRows = [];
        try {
          let costsQuery = supabase.from('platform_costs').select('amount, category, cost_date');
          if (selectedYear !== 'all') {
            const y = Number(selectedYear);
            if (selectedMonth !== 'all') {
              const m = Number(selectedMonth);
              const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
              const endDate = new Date(y, m, 0).toISOString().split('T')[0];
              costsQuery = costsQuery.gte('cost_date', startDate).lte('cost_date', endDate);
            } else {
              costsQuery = costsQuery.gte('cost_date', `${y}-01-01`).lte('cost_date', `${y}-12-31`);
            }
          }
          const { data: fetchedCosts, error: costsError } = await costsQuery.limit(5000);
          if (!costsError && fetchedCosts) {
            platformCostsRows = fetchedCosts;
          }
        } catch (costErr) {
          console.warn('[FinancialControlModule] Erro ao carregar platform_costs para DRE:', costErr);
        }

        if (cancelled) return;

        const computed = computeConsolidatedDreMetrics({
          bookings: rows,
          aiUsageRows: aiRows,
          platformCosts: platformCostsRows,
          mpFeeRate,
          nfseTaxRate,
          defaultRetentionPct
        });

        setDreData({
          ...computed,
          isLoading: false,
          error: null
        });
      } catch (err) {
        console.error("Erro na busca do DRE:", err);
        if (!cancelled) {
          setDreData(prev => ({
            ...prev,
            gmv: 0,
            payoutTotal: 0,
            count: 0,
            aiGrossRevenue: 0,
            aiTechnicalCost: 0,
            aiSessionsCount: 0,
            aiTrialCount: 0,
            operationalCosts: 0,
            operationalCostsCount: 0,
            netMargin: 0,
            isLoading: false,
            error: err?.message || 'Falha ao carregar a DRE'
          }));
        }
      }
    }
    fetchDRE();
    return () => { cancelled = true; };
  }, [selectedMonth, selectedYear, defaultRetentionPct, mpFeeRate, nfseTaxRate]);

  // Cálculos da DRE Consolidada (sem mascaramento de prejuízo)
  const {
    gmv,
    payoutTotal,
    aiGrossRevenue,
    aiTechnicalCost,
    aiNetMargin,
    operationalCosts,
    operationalCostsCount,
    estimatedMpFees,
    platformConsultationMargin,
    platformGrossMargin,
    estimatedNfseTaxes,
    netMargin,
    takeRatePct,
    isProfitable
  } = dreData;

  return (
    <div className="space-y-6 font-sans">
      {/* Header da Controladoria */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs text-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Módulo de Controladoria Unificada
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              DRE, Extrato Financeiro & Ledger de Repasses
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Visão consolidada de caixa, conciliação de recebíveis do Mercado Pago, retenção de impostos e repasses aos profissionais.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNavigateTab?.('payments')}
            className="rounded-xl text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0 self-start"
          >
            Repasses Profissionais
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        {/* Sub-Navegação da Controladoria (largura total abaixo do cabeçalho, sem scrollbar visível) */}
        <div className="pt-3 border-t border-slate-100 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="inline-flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-inner gap-1 min-w-full sm:min-w-0">
            {[
              { id: 'dre', label: 'DRE Consolidada' },
              { id: 'reconcile', label: 'Conciliação (4 Pontas)' },
              { id: 'ledger', label: 'Livro Caixa (Ledger)' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`text-xs px-3.5 py-2 rounded-lg transition-all whitespace-nowrap font-medium flex-1 sm:flex-initial text-center touch-manipulation ${
                  subTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RENDERIZADOR SUB-TAB: DRE CONSOLIDADA */}
      {subTab === 'dre' && (
        <div className="space-y-5 sm:space-y-6">
          {dreData.error && (
            <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs">
              <p className="font-bold">Não foi possível carregar a DRE deste período.</p>
              <p className="mt-0.5">Os valores abaixo não são confiáveis. Tente novamente ou altere o período. ({dreData.error})</p>
            </div>
          )}
          {/* SELETOR DE PERÍODO DRE */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-slate-700 shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                  Período de Referência do DRE
                </span>
                <span className="text-xs text-slate-500">
                  {selectedMonth === 'all'
                    ? `Acumulado ${selectedYear === 'all' ? 'Histórico Total' : selectedYear}`
                    : `${monthNames[selectedMonth]} de ${selectedYear}`}
                  <strong className="ml-2 bg-slate-200 text-slate-800 border border-slate-300 px-2 py-0.5 rounded-full text-[11px] tabular-nums">
                    {dreData.isLoading ? '...' : `${dreData.count} ${dreData.count === 1 ? 'consulta' : 'consultas'}`}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="flex-1 min-w-0 bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-2.5 sm:px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/20 shadow-xs cursor-pointer hover:border-slate-400 transition-colors min-h-[42px]"
              >
                <option value="all">Todos os Meses (Acumulado)</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {monthNames[i + 1]}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="shrink-0 w-28 sm:w-auto bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-2.5 sm:px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900/20 shadow-xs cursor-pointer hover:border-slate-400 transition-colors min-h-[42px]"
              >
                <option value="all">Todos os Anos</option>
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CARDS RESUMO DRE (Grid 2x2 no Mobile) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <Card className="p-3.5 sm:p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Receita Bruta (GMV)</span>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 tabular-nums">{formatBrl(gmv)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {selectedMonth === 'all' ? (selectedYear === 'all' ? 'Histórico geral' : `Ano ${selectedYear}`) : `${monthNames[selectedMonth]}/${selectedYear}`}
              </p>
            </Card>

            <Card className="p-3.5 sm:p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Repasse Psicólogos</span>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 tabular-nums">{formatBrl(payoutTotal)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">Honorários de consultas</p>
            </Card>

            <Card className="p-3.5 sm:p-4 bg-white border border-slate-200/80 rounded-xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Margem Bruta</span>
                {aiGrossRevenue > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> IA inclusa
                  </span>
                )}
              </div>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-700 mt-1 tabular-nums">{formatBrl(platformGrossMargin)}</p>
              <p className="text-[10px] text-emerald-800 font-semibold mt-0.5 tabular-nums">Take Rate: {takeRatePct.toFixed(1)}%</p>
            </Card>

            <Card className={`p-3.5 sm:p-4 rounded-xl shadow-xs border ${isProfitable ? 'bg-slate-900 text-white border-slate-800' : 'bg-rose-950 text-white border-rose-900'}`}>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-300 uppercase tracking-wider">Resultado Líquido</span>
              <p className={`text-lg sm:text-xl font-extrabold mt-1 tabular-nums ${isProfitable ? 'text-white' : 'text-rose-300'}`}>{formatBrl(netMargin)}</p>
              <p className="text-[10px] text-slate-300 mt-0.5 truncate">Pós impostos, gateway, IA e custos</p>
            </Card>
          </div>

          {/* TABELA DRE SINTÉTICA */}
          <Card className="p-4 sm:p-6 bg-white border border-slate-200/80 rounded-xl shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-4 border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-900" />
                Demonstrativo de Resultado do Exercício (DRE Gerencial)
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full w-fit">
                📅 Período: {selectedMonth === 'all' ? (selectedYear === 'all' ? 'Histórico Geral' : `Ano ${selectedYear}`) : `${monthNames[selectedMonth]} / ${selectedYear}`}
              </span>
            </h3>

            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              <div className="py-3 flex justify-between font-bold text-slate-900 bg-slate-50 px-3.5 sm:px-4 rounded-lg">
                <span>(+) RECEITA OPERACIONAL BRUTA (GMV Consultas)</span>
                <span className="tabular-nums">{formatBrl(gmv)}</span>
              </div>

              {/* Receita Add-on IA — 100% da plataforma */}
              <div className="py-2.5 flex justify-between text-emerald-800 font-semibold px-3.5 sm:px-4 pl-6 sm:pl-8 bg-emerald-50/40">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>(+) RECEITA DE SERVIÇOS DE IA (Add-ons • 100% Retido pela Plataforma)</span>
                </div>
                <div className="text-right">
                  <span className="tabular-nums">+{formatBrl(aiGrossRevenue)}</span>
                  {dreData.aiSessionsCount > 0 && (
                    <span className="text-[10px] text-emerald-700 font-normal block">
                      {dreData.aiSessionsCount - dreData.aiTrialCount} sessão(ões) faturadas • {dreData.aiTrialCount} em degustação
                    </span>
                  )}
                </div>
              </div>

              <div className="py-2.5 flex justify-between text-slate-600 px-3.5 sm:px-4 pl-6 sm:pl-8">
                <span>(-) Repasse devido aos Psicólogos (Honorários de Consulta)</span>
                <span className="text-rose-600 font-semibold tabular-nums">({formatBrl(payoutTotal)})</span>
              </div>

              <div className="py-3 flex justify-between font-semibold text-emerald-950 bg-emerald-50/70 px-3.5 sm:px-4 rounded-lg border border-emerald-100">
                <span>(=) MARGEM BRUTA CONSOLIDADA DA PLATAFORMA</span>
                <span className="text-emerald-800 font-bold tabular-nums">{formatBrl(platformGrossMargin)}</span>
              </div>

              {/* Custo Técnico de IA */}
              <div className="py-2.5 flex justify-between text-slate-600 px-3.5 sm:px-4 pl-6 sm:pl-8">
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-slate-500" />
                  <span>(-) Custos Técnicos de IA (APIs Gemini, Transcrição & Processamento)</span>
                </div>
                <span className="text-rose-600 font-semibold tabular-nums">({formatBrl(aiTechnicalCost)})</span>
              </div>

              <div className="py-2.5 flex justify-between text-slate-600 px-3.5 sm:px-4 pl-6 sm:pl-8">
                <span>(-) Taxas de Meio de Pagamento (Mercado Pago ~{(mpFeeRate*100).toFixed(2)}%)</span>
                <span className="text-rose-600 font-semibold tabular-nums">({formatBrl(estimatedMpFees)})</span>
              </div>

              <div className="py-2.5 flex justify-between text-slate-600 px-3.5 sm:px-4 pl-6 sm:pl-8">
                <div className="flex items-center gap-1 group relative">
                  <span>(-) Provisão Tributária NFS-e / Simples (~{(nfseTaxRate*100).toFixed(0)}%)</span>
                  <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 w-64 bg-slate-900 text-white text-[10px] p-2 rounded shadow-lg z-10">
                    Calculado sobre a Margem Bruta Consolidada (Take Rate + Receita IA)
                  </div>
                </div>
                <span className="text-rose-600 font-semibold tabular-nums">({formatBrl(estimatedNfseTaxes)})</span>
              </div>

              <div className="py-2.5 flex justify-between text-slate-600 px-3.5 sm:px-4 pl-6 sm:pl-8">
                <div className="flex items-center gap-1.5">
                  <span>(-) Custos Operacionais Fixos & Variáveis ({operationalCostsCount} lançamento(s))</span>
                </div>
                <span className="text-rose-600 font-semibold tabular-nums">({formatBrl(operationalCosts)})</span>
              </div>

              <div className={`py-3.5 flex justify-between font-extrabold text-sm sm:text-base px-3.5 sm:px-4 rounded-xl mt-2 shadow-xs ${isProfitable ? 'bg-slate-900 text-white' : 'bg-rose-950 text-white'}`}>
                <div>
                  <span>(=) RESULTADO LÍQUIDO OPERACIONAL CONSOLIDADO</span>
                  <span className="text-[11px] text-slate-300 font-normal block">
                    Margem Consultas ({formatBrl(platformConsultationMargin)}) + Margem Líquida IA ({formatBrl(aiNetMargin)}) - Gateway, Tributos & Custos Operacionais
                  </span>
                </div>
                <span className={`tabular-nums ${isProfitable ? 'text-white' : 'text-rose-300'}`}>{formatBrl(netMargin)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* RENDERIZADOR SUB-TAB: CONCILIAÇÃO POR EXCEÇÃO (4 PONTAS) */}
      {subTab === 'reconcile' && (
        <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-7 h-7 animate-spin text-slate-700" /></div>}>
          <ReconciliationPanel onNavigateTab={onNavigateTab} onSelectSubTab={setSubTab} />
        </Suspense>
      )}

      {/* RENDERIZADOR SUB-TAB: LIVRO CAIXA (LEDGER CANÔNICO) */}
      {subTab === 'ledger' && (
        <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-7 h-7 animate-spin text-slate-700" /></div>}>
          <div className="space-y-6">
            <LedgerStats />
            <LedgerCharts />
            <LedgerTable />
          </div>
        </Suspense>
      )}
    </div>
  );
}

export default FinancialControlModule;
