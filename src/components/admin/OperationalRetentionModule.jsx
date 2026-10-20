import React, { useState, useMemo } from 'react';
import {
  Activity,
  Users,
  Calendar,
  AlertTriangle,
  Clock,
  XCircle,
  CheckCircle,
  TrendingUp,
  UserCheck,
  UserX,
  MessageCircle,
  ArrowRight,
  Filter,
  Layers,
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  computeNoShowAndCancellationMetrics,
  computePatientRetentionMetrics,
  identifyDisengagedPatients,
  computeCapacityAndDemandByDay
} from '@/lib/adminMetrics';
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

const COHORT_COLORS = ['#3b82f6', '#2d8659', '#8b5cf6'];

export function OperationalRetentionModule({
  bookings = [],
  professionals = [],
  availability = {},
  onNavigateTab
}) {
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'noshow' | 'churn_risk' | 'capacity'
  const [churnDaysThreshold, setChurnDaysThreshold] = useState(30);

  // Métricas canônicas de operação e retenção
  const noShowMetrics = useMemo(
    () => computeNoShowAndCancellationMetrics(bookings),
    [bookings]
  );

  const retentionMetrics = useMemo(
    () => computePatientRetentionMetrics(bookings),
    [bookings]
  );

  const atRiskPatients = useMemo(
    () => identifyDisengagedPatients(bookings, churnDaysThreshold),
    [bookings, churnDaysThreshold]
  );

  const capacityDemand = useMemo(
    () => computeCapacityAndDemandByDay(bookings, availability),
    [bookings, availability]
  );

  // Formatação de percentual
  const formatPct = (val) => {
    if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
    return `${Number(val).toFixed(1)}%`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* CABEÇALHO DO MÓDULO OPERACIONAL */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e4ded5] shadow-[0_2px_12px_rgba(27,60,55,0.03)] text-[#262624]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-[#1b3c37]/5 text-[#1b3c37] text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-[#1b3c37]/15">
                <Activity className="w-3.5 h-3.5 text-[#1b3c37]" />
                Operação & Retenção Clínica
              </span>
              <span className="text-[11px] text-[#262624]/60 font-medium">Fidelização • No-Show • Capacidade</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-[#262624]">
              Saúde da Operação & Retenção de Pacientes
            </h2>
            <p className="text-xs text-[#262624]/70 mt-1 max-w-2xl leading-relaxed">
              Acompanhe o retorno para a segunda sessão, a taxa de faltas (no-show) por psicólogo, a ocupação das grades e o mapa de prevenção de abandono clínico.
            </p>
          </div>

          {/* Seletor de Sub-Abas do Módulo com Rolagem Horizontal Suave para Mobile */}
          <div className="w-full lg:w-auto overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-0.5">
            <div className="inline-flex bg-[#f4efe6] p-1 rounded-xl border border-[#e4ded5] shadow-inner gap-1 min-w-full sm:min-w-0">
              {[
                { id: 'overview', label: 'Retenção & Coortes' },
                { id: 'noshow', label: 'No-Show & Cancelamentos' },
                { id: 'churn_risk', label: 'Prevenção de Abandono' },
                { id: 'capacity', label: 'Capacidade vs Demanda' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all whitespace-nowrap font-medium flex-1 sm:flex-initial text-center touch-manipulation ${
                    activeSubTab === tab.id
                      ? 'bg-[#1b3c37] text-[#f0ebe1] shadow-sm font-semibold'
                      : 'text-[#262624]/70 hover:text-[#262624] hover:bg-white/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TOP METRICS - 4 CARDS VITAIS EM GRID 2X2 NO MOBILE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* KPI 1: Taxa de Retorno (2ª Consulta) */}
        <Card className="p-3.5 sm:p-5 bg-white border border-[#e4ded5] rounded-2xl shadow-[0_2px_8px_rgba(27,60,55,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-[#262624]/60 uppercase tracking-wider">
                Retorno para 2ª Sessão
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#f4efe6] text-[#1b3c37] flex items-center justify-center">
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h3 className="text-base sm:text-2xl font-extrabold text-[#262624] tracking-tight">
                {formatPct(retentionMetrics.secondSessionReturnRatePct)}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#262624]/60 mt-1">
                <span>{retentionMetrics.multiSessionCount} de {retentionMetrics.totalPatients} retornaram</span>
              </p>
              {retentionMetrics.avgDaysToSecondSession !== null && (
                <p className="text-[10px] sm:text-[11px] text-[#1b3c37] font-medium mt-1 truncate">
                  Intervalo médio: ~{retentionMetrics.avgDaysToSecondSession} dias
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* KPI 2: Taxa de No-Show */}
        <Card className="p-3.5 sm:p-5 bg-white border border-[#e4ded5] rounded-2xl shadow-[0_2px_8px_rgba(27,60,55,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-[#262624]/60 uppercase tracking-wider">
                Taxa de No-Show (Faltas)
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#f4efe6] text-[#dc2626] flex items-center justify-center">
                <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h3 className="text-base sm:text-2xl font-extrabold text-[#262624] tracking-tight">
                {formatPct(noShowMetrics.noShowRatePct)}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#262624]/60 mt-1">
                <span>{noShowMetrics.noShowCount} falta(s) registrada(s)</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#262624]/60 mt-1 truncate">
                De {noShowMetrics.completedCount + noShowMetrics.noShowCount} marcadas
              </p>
            </div>
          </div>
        </Card>

        {/* KPI 3: Cancelamentos Gerais */}
        <Card className="p-3.5 sm:p-5 bg-white border border-[#e4ded5] rounded-2xl shadow-[0_2px_8px_rgba(27,60,55,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-[#262624]/60 uppercase tracking-wider">
                Cancelamentos
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#f4efe6] text-[#d97706] flex items-center justify-center">
                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h3 className="text-base sm:text-2xl font-extrabold text-[#262624] tracking-tight">
                {formatPct(noShowMetrics.cancellationRatePct)}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#262624]/60 mt-1">
                <span>{noShowMetrics.cancelledCount} cancelamento(s)</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#262624]/60 mt-1 truncate">
                De {noShowMetrics.total} agendamentos totais
              </p>
            </div>
          </div>
        </Card>

        {/* KPI 4: Pacientes em Risco de Abandono */}
        <Card className="p-3.5 sm:p-5 bg-white border border-[#e4ded5] rounded-2xl shadow-[0_2px_8px_rgba(27,60,55,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-[#262624]/60 uppercase tracking-wider">
                Em Risco de Abandono
              </span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#f4efe6] text-[#1b3c37] flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3">
              <h3 className="text-base sm:text-2xl font-extrabold text-[#262624] tracking-tight">
                {atRiskPatients.length}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#262624]/60 mt-1">
                <span>Sem consulta há {'>'} {churnDaysThreshold} dias</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#1b3c37] font-medium mt-1 truncate">
                Sem agendamento futuro
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* CONTEÚDO DAS SUB-ABAS */}

      {/* ABA 1: VISÃO GERAL & COORTES DE RETENÇÃO */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico de Coortes de Retenção */}
          <Card className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Distribuição de Pacientes por Ciclo de Sessões
                </h3>
                <p className="text-xs text-slate-500">
                  Frequência de pacientes na plataforma: 1 sessão (inicial), 2 a 4 sessões (acompanhamento), 5+ sessões (tratamento contínuo).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {retentionMetrics.cohorts.map((c, idx) => (
                <div
                  key={c.category}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60"
                >
                  <p className="text-xs text-slate-600 font-semibold">{c.category}</p>
                  <h4 className="text-2xl font-black text-slate-900 mt-1">{c.count}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{c.percentage}% da base ativa</p>
                </div>
              ))}
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={retentionMetrics.cohorts} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" name="Pacientes" fill="#2d8659" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Cartão de Boas Práticas Clínicas & Acolhimento */}
          <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                <ShieldCheck className="w-5 h-5 text-[#2d8659]" />
                <h3 className="font-bold text-slate-900 text-sm">Diretrizes de Retenção Ética</h3>
              </div>
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p>
                  <strong className="text-slate-800">Adesão Terapêutica:</strong> Em psicoterapia online, 60% a 70% dos pacientes que chegam à 3ª sessão completam ao menos 8 encontros.
                </p>
                <p>
                  <strong className="text-slate-800">Reagendamento Imediato:</strong> O encerramento da sessão com definição da data do próximo encontro é a prática mais eficaz para prevenir o abandono precoce.
                </p>
                <p>
                  <strong className="text-slate-800">Sigilo Absoluto:</strong> Nenhuma informação de evolução clínica é processada nesta tela; apenas frequência e assiduidade agregadas.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab?.('bookings')}
              className="w-full text-xs font-semibold text-slate-700 hover:bg-slate-50 border-slate-200"
            >
              Ver Grade de Agendamentos &rarr;
            </Button>
          </Card>
        </div>
      )}

      {/* ABA 2: NO-SHOW & CANCELAMENTOS */}
      {activeSubTab === 'noshow' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tabela de No-Show por Profissional */}
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    No-Show por Profissional
                  </h3>
                  <p className="text-xs text-slate-500">
                    Identifique psicólogos com taxa atípica de não comparecimento para alinhamento operacional.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-2.5">Psicólogo</th>
                      <th className="py-2.5 text-center">Concluídas</th>
                      <th className="py-2.5 text-center">Faltas</th>
                      <th className="py-2.5 text-center">Canceladas</th>
                      <th className="py-2.5 text-right">Taxa No-Show</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {noShowMetrics.byProfessional.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Nenhum dado registrado para o período.
                        </td>
                      </tr>
                    ) : (
                      noShowMetrics.byProfessional.map((p) => (
                        <tr key={p.professionalId} className="hover:bg-slate-50/60">
                          <td className="py-2.5 font-medium text-slate-900">{p.name}</td>
                          <td className="py-2.5 text-center font-semibold text-emerald-600">{p.completed}</td>
                          <td className="py-2.5 text-center font-semibold text-rose-600">{p.noShow}</td>
                          <td className="py-2.5 text-center text-slate-500">{p.cancelled}</td>
                          <td className="py-2.5 text-right">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                p.noShowRatePct > 15
                                  ? 'bg-rose-100 text-rose-800'
                                  : p.noShowRatePct > 5
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p.noShowRatePct}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* No-Show por Dia da Semana */}
            <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Ocorrências por Dia da Semana
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distribuição de faltas e cancelamentos de segunda a domingo.
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={noShowMetrics.byDayOfWeek} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="dayName"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="completed" name="Concluídas" fill="#2d8659" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="noShow" name="No-Show (Faltas)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cancelled" name="Canceladas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ABA 3: PREVENÇÃO DE ABANDONO (PACIENTES EM RISCO) */}
      {activeSubTab === 'churn_risk' && (
        <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Prevenção de Abandono Clínico (Pacientes Inativos)
                </h3>
                <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {atRiskPatients.length} paciente(s)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pacientes que realizaram sessões no passado, mas estão sem atendimento há mais de {churnDaysThreshold} dias e sem agendamento futuro.
              </p>
            </div>

            {/* Filtro de Janela de Inatividade */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Inativo há mais de:</span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {[15, 30, 45, 60].map((d) => (
                  <button
                    key={d}
                    onClick={() => setChurnDaysThreshold(d)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                      churnDaysThreshold === d
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-2.5">Paciente (Anonimizado)</th>
                  <th className="py-2.5">Último Psicólogo</th>
                  <th className="py-2.5 text-center">Sessões Realizadas</th>
                  <th className="py-2.5 text-center">Última Consulta</th>
                  <th className="py-2.5 text-center">Dias sem Sessão</th>
                  <th className="py-2.5 text-right">Ação Sugerida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {atRiskPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Nenhum paciente atende ao critério de inatividade ({churnDaysThreshold} dias) no momento.
                    </td>
                  </tr>
                ) : (
                  atRiskPatients.map((p) => (
                    <tr key={p.patientId} className="hover:bg-slate-50/60">
                      <td className="py-3 font-semibold text-slate-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                          {p.patientDisplay.slice(0, 1)}
                        </div>
                        <span>{p.patientDisplay}</span>
                      </td>
                      <td className="py-3 text-slate-600">{p.professionalName}</td>
                      <td className="py-3 text-center font-bold text-slate-800">{p.totalSessions}</td>
                      <td className="py-3 text-center text-slate-500">{p.lastSessionDate}</td>
                      <td className="py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-amber-100 text-amber-900">
                          {p.daysSinceLastSession} dias
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {p.phone ? (
                          <a
                            href={`https://wa.me/${p.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Olá, ${p.patientDisplay}! Aqui é da equipe Doxologos Psicologia. Gostaríamos de saber como você está e se deseja continuar o seu processo terapêutico.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                          >
                            <MessageCircle className="w-3 h-3" />
                            Acolher via WhatsApp
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sem telefone cadastrado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ABA 4: CAPACIDADE VS DEMANDA (MAPA DE TURNOS) */}
      {activeSubTab === 'capacity' && (
        <div className="space-y-6">
          <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Capacidade de Atendimento vs Demanda Real (por Turno)
                </h3>
                <p className="text-xs text-slate-500">
                  Slots abertos na grade semanal vs atendimentos preenchidos de segunda a sábado.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {capacityDemand.map((d) => (
                <div
                  key={d.key}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">{d.label}</h4>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        d.occupancyPct === null
                          ? 'bg-slate-200 text-slate-600'
                          : d.occupancyPct > 80
                          ? 'bg-rose-100 text-rose-800'
                          : d.occupancyPct > 50
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {formatPct(d.occupancyPct)} ocupação
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-200/60">
                    <div className="flex justify-between items-center">
                      <span>Manhã (08h - 12h):</span>
                      <span className="font-semibold text-slate-800">
                        {d.byShift.morning.booked} / {d.byShift.morning.available} slots
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Tarde (12h - 18h):</span>
                      <span className="font-semibold text-slate-800">
                        {d.byShift.afternoon.booked} / {d.byShift.afternoon.available} slots
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Noite (18h - 22h):</span>
                      <span className="font-semibold text-slate-800">
                        {d.byShift.night.booked} / {d.byShift.night.available} slots
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-500 flex justify-between border-t border-slate-100">
                    <span>Total de Slots: {d.slotsAvailable}</span>
                    <span>Ocupados: {d.slotsBooked}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default OperationalRetentionModule;
