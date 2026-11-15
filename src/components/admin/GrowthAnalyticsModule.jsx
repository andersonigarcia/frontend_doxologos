import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Target,
  Users,
  DollarSign,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  Sliders,
  Save,
  HelpCircle,
  Award
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import {
  computeFunnelMetrics,
  computeChannelAcquisition,
  computeMonthlyGoalsProgress,
  computePatientRetentionMetrics,
  filterBookingsByPeriod,
  summarizeBookingsFinancials,
  REALIZED_STATUSES
} from '@/lib/adminMetrics';
import { fetchAssessmentLeads } from '@/lib/assessmentService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const CHANNEL_COLORS = ['#059669', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4'];

export function GrowthAnalyticsModule({
  bookings = [],
  onNavigateTab
}) {
  const { toast } = useToast();
  const { settings, updateSetting } = useSystemSettings();

  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);

  // Formulário de edição de metas
  const [goalsFormData, setGoalsFormData] = useState({
    target_monthly_revenue_brl: 30000,
    target_monthly_bookings_count: 200,
    target_new_patients_count: 30,
    target_retention_return_rate_pct: 60
  });

  useEffect(() => {
    if (settings) {
      setGoalsFormData({
        target_monthly_revenue_brl: Number(settings.target_monthly_revenue_brl || 30000),
        target_monthly_bookings_count: Number(settings.target_monthly_bookings_count || 200),
        target_new_patients_count: Number(settings.target_new_patients_count || 30),
        target_retention_return_rate_pct: Number(settings.target_retention_return_rate_pct || 60)
      });
    }
  }, [
    settings?.target_monthly_revenue_brl,
    settings?.target_monthly_bookings_count,
    settings?.target_new_patients_count,
    settings?.target_retention_return_rate_pct
  ]);

  // Carregar leads de avaliações emocionais (GAD-7/PHQ-9)
  useEffect(() => {
    async function loadLeads() {
      setLoadingLeads(true);
      try {
        const res = await fetchAssessmentLeads({ status: 'all', severity: 'all' });
        if (res && res.success) {
          setLeads(res.data || []);
        }
      } catch (err) {
        console.warn('Não foi possível carregar leads de assessment:', err);
      } finally {
        setLoadingLeads(false);
      }
    }
    loadLeads();
  }, []);

  // Formatador de BRL
  const formatBrl = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPct = (val) => {
    if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
    return `${Number(val).toFixed(1)}%`;
  };

  // 1. Funil de Conversão e Abandono
  const funnelMetrics = useMemo(
    () => computeFunnelMetrics(bookings, leads),
    [bookings, leads]
  );

  // 2. Canais de Aquisição & ROI
  const channelData = useMemo(
    () => computeChannelAcquisition(bookings),
    [bookings]
  );

  // 3. Retenção
  const retention = useMemo(
    () => computePatientRetentionMetrics(bookings),
    [bookings]
  );

  // 4. Novos Pacientes no Mês Atual (Considera apenas pacientes com consultas pagas/confirmadas)
  const newPatientsCount = useMemo(() => {
    const now = new Date();
    const curYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const patientFirstDates = {};

    (bookings || []).forEach((b) => {
      const status = (b.status || '').toLowerCase().trim();
      if (!REALIZED_STATUSES.includes(status)) return;

      const key = (b.patient_email || b.user_id || b.patient_name || '').toLowerCase().trim();
      if (!key || !b.booking_date) return;
      const d = String(b.booking_date).slice(0, 10);
      if (!patientFirstDates[key] || d < patientFirstDates[key]) {
        patientFirstDates[key] = d;
      }
    });

    let count = 0;
    Object.values(patientFirstDates).forEach((d) => {
      if (d.startsWith(curYearMonth)) count += 1;
    });
    return count;
  }, [bookings]);

  // 5. Progresso das Metas Mensais (Consolidado estritamente com dados do mês atual)
  const goalsProgress = useMemo(() => {
    const { current: curMonthBookings } = filterBookingsByPeriod(bookings, 'month');
    const monthSummary = summarizeBookingsFinancials(curMonthBookings);

    const currentMetrics = {
      gmvRealized: monthSummary.gmvRealized,
      realizedCount: monthSummary.realizedCount,
      newPatientsCount: newPatientsCount,
      retentionPct: retention.secondSessionReturnRatePct
    };

    return computeMonthlyGoalsProgress(currentMetrics, settings);
  }, [bookings, newPatientsCount, retention, settings]);

  // Salvar Metas Mensais
  const handleSaveGoals = async () => {
    try {
      await updateSetting('target_monthly_revenue_brl', Number(goalsFormData.target_monthly_revenue_brl));
      await updateSetting('target_monthly_bookings_count', Number(goalsFormData.target_monthly_bookings_count));
      await updateSetting('target_new_patients_count', Number(goalsFormData.target_new_patients_count));
      await updateSetting('target_retention_return_rate_pct', Number(goalsFormData.target_retention_return_rate_pct));

      toast({
        title: 'Metas salvas com sucesso',
        description: 'Os novos objetivos foram atualizados no painel executivo.'
      });
      setIsGoalsModalOpen(false);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar metas',
        description: 'Não foi possível persistir as configurações.'
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* CABEÇALHO DO MÓDULO DE GROWTH */}
      <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200/80 shadow-xs text-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-emerald-50 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-emerald-200/80">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                Growth & Aquisição
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Metas • Funil • Canais</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Crescimento, Funil de Conversão & Metas
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Acompanhe o atingimento das metas mensais, a passagem de leads para consultas, o abandono de checkout e a receita por canal.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              onClick={() => setIsGoalsModalOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs h-9 sm:h-8"
            >
              <Target className="w-3.5 h-3.5 mr-1.5" />
              Configurar Metas
            </Button>
          </div>
        </div>
      </div>

      {/* TOP CARDS: 4 INDICADORES DE CRESCIMENTO EM GRID 2X2 NO MOBILE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* KPI 1: Novos Pacientes no Mês */}
        <Card className="p-3.5 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Novos Pacientes (Mês)
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h3 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">{newPatientsCount}</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                <span>Primeira sessão realizada este mês</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-blue-700 font-medium mt-1">
                Base ativa: {retention.totalPatients} pacientes
              </p>
            </div>
          </div>
        </Card>

        {/* KPI 2: Conversão do Checkout */}
        <Card className="p-3.5 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Conversão de Checkout
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h3 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatPct(funnelMetrics.checkoutConversionPct)}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                <span>{funnelMetrics.realizedBookings} pagamentos confirmados</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
                De {funnelMetrics.totalBookingsCreated} checkouts iniciados
              </p>
            </div>
          </div>
        </Card>

        {/* KPI 3: Conversão Leads GAD-7 */}
        <Card className="p-3.5 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Conversão Leads GAD-7
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h3 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatPct(funnelMetrics.leadConversionPct)}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                <span>{funnelMetrics.leadsBooked} agendaram após teste</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-purple-700 font-medium mt-1 truncate">
                De {funnelMetrics.totalLeads} testes concluídos
              </p>
            </div>
          </div>
        </Card>

        {/* KPI 4: Abandono de Checkout (PIX Expirado / Não Pago) */}
        <Card className="p-3.5 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Abandono de Checkout
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h3 className="text-base sm:text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                {formatPct(funnelMetrics.checkoutAbandonmentPct)}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
                <span>{funnelMetrics.pendingBookings + funnelMetrics.cancelledBookings} pendentes / cancelados</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-amber-700 font-medium mt-1 truncate">
                Oportunidade de recuperação
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* SEÇÃO 1: PAINEL DE METAS MENSAIS (TARGETS VS REALIZADO) */}
      <Card className="p-4 sm:p-6 bg-white border border-slate-200/80 rounded-xl shadow-xs">
        <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center">
              <Award className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm sm:text-base text-slate-900">
                Acompanhamento de Metas Mensais
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Progresso percentual de atingimento das metas configuradas pela coordenação da clínica.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {goalsProgress.map((g) => {
            const isAchieved = g.progressPct >= 100;
            const isOnTrack = g.progressPct >= 70;

            const formatVal = (v) => {
              if (g.unit === 'currency') return formatBrl(v);
              if (g.unit === 'percent') return `${v}%`;
              return v;
            };

            return (
              <div
                key={g.id}
                className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">{g.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                        isAchieved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isOnTrack
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {g.progressPct}%
                    </span>
                  </div>

                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Realizado:</span>
                      <strong className="text-slate-900 tabular-nums">{formatVal(g.current)}</strong>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Meta:</span>
                      <span className="tabular-nums">{formatVal(g.target)}</span>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="w-full bg-slate-200 h-1.5 sm:h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isAchieved ? 'bg-emerald-600' : isOnTrack ? 'bg-blue-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, g.progressPct)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                  <span>Status:</span>
                  <span className="font-semibold text-slate-900">
                    {isAchieved ? 'Meta Atingida 🎉' : isOnTrack ? 'No Ritmo' : 'Abaixo do Esperado'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* SEÇÃO 2: FUNIL COMPLETO DE CONVERSÃO & CANAIS DE NEGÓCIO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Funil Visual de Conversão */}
        <Card className="lg:col-span-2 p-4 sm:p-6 bg-white border border-slate-200/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="font-sans font-bold text-sm sm:text-base text-slate-900">
                Funil de Aquisição & Conversão
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Passagem de visitantes de testes psicológicos até a realização da consulta.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {funnelMetrics.funnelStages.map((stage, idx) => (
              <div
                key={stage.stage}
                className="p-3 sm:p-3.5 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center justify-between hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{stage.stage}</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 tabular-nums">{stage.count} registros no período</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 tabular-nums">
                    {stage.conversionPct !== null ? `${stage.conversionPct}%` : '—'}
                  </span>
                  <p className="text-[10px] text-slate-400">conversão</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Canais de Origem & Faturamento */}
        <Card className="p-4 sm:p-6 bg-white border border-slate-200/80 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="font-sans font-bold text-sm sm:text-base text-slate-900">
                  Canais de Faturamento
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">Origem de receita por modelo de negócio.</p>
              </div>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {channelData.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhum dado de canal registrado.</p>
              ) : (
                channelData.map((c) => (
                  <div
                    key={c.channel}
                    className="p-3 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{c.channel}</p>
                      <p className="text-[10px] sm:text-[11px] text-slate-500 tabular-nums">{c.count} agendamento(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-slate-900 tabular-nums">{formatBrl(c.revenue)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 sm:pt-4 border-t border-slate-100 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab?.('assessment-leads')}
              className="w-full text-xs font-semibold text-slate-700 hover:bg-slate-100 border-slate-200/80 h-9"
            >
              Ver Central de Leads GAD-7 &rarr;
            </Button>
          </div>
        </Card>
      </div>

      {/* MODAL DE CONFIGURAÇÃO DE METAS MENSAIS */}
      <Dialog open={isGoalsModalOpen} onOpenChange={setIsGoalsModalOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200/80">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-sans font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-slate-900" />
              Configurar Metas Mensais da Clínica
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Defina as metas operacionais e financeiras de referência para acompanhamento executivo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-2 sm:py-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Meta de Faturamento Bruto (R$ GMV):
              </label>
              <Input
                type="number"
                value={goalsFormData.target_monthly_revenue_brl}
                onChange={(e) =>
                  setGoalsFormData((prev) => ({
                    ...prev,
                    target_monthly_revenue_brl: e.target.value
                  }))
                }
                className="text-xs border-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Meta de Consultas Concluídas:
              </label>
              <Input
                type="number"
                value={goalsFormData.target_monthly_bookings_count}
                onChange={(e) =>
                  setGoalsFormData((prev) => ({
                    ...prev,
                    target_monthly_bookings_count: e.target.value
                  }))
                }
                className="text-xs border-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Meta de Novos Pacientes no Mês:
              </label>
              <Input
                type="number"
                value={goalsFormData.target_new_patients_count}
                onChange={(e) =>
                  setGoalsFormData((prev) => ({
                    ...prev,
                    target_new_patients_count: e.target.value
                  }))
                }
                className="text-xs border-slate-200"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Meta de Retorno para 2ª Sessão (%):
              </label>
              <Input
                type="number"
                min="10"
                max="100"
                value={goalsFormData.target_retention_return_rate_pct}
                onChange={(e) =>
                  setGoalsFormData((prev) => ({
                    ...prev,
                    target_retention_return_rate_pct: e.target.value
                  }))
                }
                className="text-xs border-slate-200"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGoalsModalOpen(false)}
              className="text-xs border-slate-200"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveGoals}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-9 sm:h-8"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Salvar Metas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GrowthAnalyticsModule;
