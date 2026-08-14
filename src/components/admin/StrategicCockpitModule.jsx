import React, { useState, useEffect } from 'react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  Percent,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle,
  Sliders,
  Users,
  Calendar,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function StrategicCockpitModule({
  summaryData = {},
  financialData = {},
  alertsData = {},
  onNavigateTab
}) {
  const { settings } = useSystemSettings();
  const defaultRetention = Number(settings.platform_default_retention_pct || 40);

  // Simulador de Projeção Financeira (Forward Looking)
  const [simConsultasMes, setSimConsultasMes] = useState(150);
  const [simPrecoMedio, setSimPrecoMedio] = useState(150);
  const [simTakeRatePct, setSimTakeRatePct] = useState(defaultRetention);

  useEffect(() => {
    if (settings.platform_default_retention_pct !== undefined) {
      setSimTakeRatePct(Number(settings.platform_default_retention_pct));
    }
  }, [settings.platform_default_retention_pct]);

  // Cálculos do Simulador
  const simGmvMensal = simConsultasMes * simPrecoMedio;
  const simReceitaBrutaDoxologos = simGmvMensal * (simTakeRatePct / 100);
  const simRepasseProfissionais = simGmvMensal - simReceitaBrutaDoxologos;
  const simGmvAnual = simGmvMensal * 12;
  const simReceitaAnualDoxologos = simReceitaBrutaDoxologos * 12;

  // Formatadores de moeda
  const formatBrl = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPct = (val) => {
    const num = Number(val) || 0;
    return `${num.toFixed(1)}%`;
  };

  const gmvActual = summaryData?.receita_consultas || financialData?.monthlyRevenue || 0;
  const takeRateActualPct = financialData?.takeRatePct || 20;
  const netMarginActual = financialData?.netMargin || (gmvActual * (takeRateActualPct / 100));
  const totalBookings = summaryData?.consultas_confirmadas || 0;
  const activeProfCount = summaryData?.total_professionals || 1;

  // Estimar taxa de ocupação da agenda (ex: baseado em slots abertos vs slots vendidos)
  const estimatedCapacity = activeProfCount * 80; // 80 slots por profissional/mês
  const occupancyRatePct = Math.min(100, Math.max(0, (totalBookings / Math.max(1, estimatedCapacity)) * 100));

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Cockpit Estratégico em Tema Claro Doxologos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white p-6 rounded-2xl border border-emerald-100/80 shadow-sm text-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#2d8659]/10 text-[#2d8659] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-[#2d8659]/20">
              <Sparkles className="w-3.5 h-3.5" />
              Cockpit Executivo
            </span>
            <span className="text-xs text-slate-500 font-medium">Visão em Tempo Real & Projeções</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Painel Estratégico Doxologos
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-xl">
            Acompanhamento de volume bruto (GMV), receita da plataforma (Take Rate), taxa de ocupação de agenda e projeção de cenários.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => onNavigateTab?.('financial-control')}
            className="bg-[#2d8659] hover:bg-[#236b47] text-white font-bold shadow-md transition-all text-xs"
          >
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            Ver DRE Consolidada
          </Button>
        </div>
      </div>

      {/* TOP METRICS BAR - 4 KPIs Vitais Executivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: GMV (Faturamento Bruto) */}
        <Card className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GMV (Volume Bruto)</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900">{formatBrl(gmvActual)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +12.5%
              </span>
              <span>vs. mês anterior</span>
            </p>
          </div>
        </Card>

        {/* KPI 2: Margem Líquida Doxologos */}
        <Card className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receita Líquida Plataforma</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#2d8659] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900">{formatBrl(netMarginActual)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-slate-600 font-medium">Take Rate Líquido:</span>
              <span className="font-bold text-[#2d8659]">{formatPct(takeRateActualPct)}</span>
            </p>
          </div>
        </Card>

        {/* KPI 3: Taxa de Ocupação da Agenda (Slot Occupancy Rate) */}
        <Card className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ocupação da Agenda</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900">{formatPct(occupancyRatePct)}</h3>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#2d8659] h-full rounded-full transition-all duration-500"
                style={{ width: `${occupancyRatePct}%` }}
              />
            </div>
          </div>
        </Card>

        {/* KPI 4: Consultas Confirmadas */}
        <Card className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Consultas Realizadas</span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900">{totalBookings}</h3>
            <p className="text-xs text-slate-500 mt-1">
              <span>{activeProfCount} psicólogo(s) ativo(s)</span>
            </p>
          </div>
        </Card>
      </div>

      {/* SEÇÃO PRINCIPAL: SIMULADOR DE PROJEÇÃO DE CRESCIMENTO & SAÚDE OPERACIONAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SIMULADOR DE PROJEÇÃO FINANCEIRA (FORWARD LOOKING) - Tema Claro Elegant */}
        <Card className="lg:col-span-2 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#2d8659] flex items-center justify-center">
                <Sliders className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Simulador de Cenários & Projeção de Receita</h3>
                <p className="text-xs text-slate-500">Projete o faturamento anual ajustando volume de consultas, ticket médio e taxa da clínica.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Control 1: Consultas por Mês */}
            <div className="space-y-2 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">Consultas/Mês:</span>
                <span className="font-extrabold text-[#2d8659]">{simConsultasMes}</span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={simConsultasMes}
                onChange={(e) => setSimConsultasMes(Number(e.target.value))}
                className="w-full accent-[#2d8659] bg-slate-200 h-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Control 2: Ticket Médio */}
            <div className="space-y-2 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">Valor Médio Consulta:</span>
                <span className="font-extrabold text-[#2d8659]">{formatBrl(simPrecoMedio)}</span>
              </div>
              <input
                type="range"
                min="80"
                max="400"
                step="10"
                value={simPrecoMedio}
                onChange={(e) => setSimPrecoMedio(Number(e.target.value))}
                className="w-full accent-[#2d8659] bg-slate-200 h-2 rounded-lg cursor-pointer"
              />
            </div>

            {/* Control 3: Take Rate da Plataforma (%) */}
            <div className="space-y-2 bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
              <div className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium">Taxa Plataforma:</span>
                <span className="font-extrabold text-[#2d8659]">{simTakeRatePct}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={simTakeRatePct}
                onChange={(e) => setSimTakeRatePct(Number(e.target.value))}
                className="w-full accent-[#2d8659] bg-slate-200 h-2 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Cards de Resultado da Projeção em Tema Claro */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-[11px] text-slate-500 uppercase font-bold">GMV Anual Projetado</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{formatBrl(simGmvAnual)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{formatBrl(simGmvMensal)} /mês</p>
            </div>

            <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200">
              <p className="text-[11px] text-emerald-900 uppercase font-bold">Receita Anual Doxologos</p>
              <p className="text-xl font-extrabold text-[#2d8659] mt-1">{formatBrl(simReceitaAnualDoxologos)}</p>
              <p className="text-[10px] text-emerald-800 font-medium mt-0.5">{formatBrl(simReceitaBrutaDoxologos)} /mês</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-[11px] text-slate-500 uppercase font-bold">Repasses aos Psicólogos</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{formatBrl(simRepasseProfissionais * 12)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{formatBrl(simRepasseProfissionais)} /mês</p>
            </div>
          </div>
        </Card>

        {/* PAINEL DE SAÚDE OPERACIONAL E ALERTAS CRÍTICOS - 1 Coluna */}
        <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Saúde Operacional & Ação Imediata</h3>
            </div>

            <div className="space-y-3">
              {/* Alerta 1: Pagamentos Pendentes / Reservas Expirando */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                <div className="text-xs text-amber-950">
                  <p className="font-bold">Agendamentos Pendentes</p>
                  <p className="text-amber-800 mt-0.5">Existem cobranças em andamento aguardando confirmação no PIX.</p>
                  <button
                    onClick={() => onNavigateTab?.('bookings')}
                    className="mt-2 text-amber-900 underline font-semibold hover:text-amber-950"
                  >
                    Ver agendamentos pendentes &rarr;
                  </button>
                </div>
              </div>

              {/* Alerta 2: Resiliência NFS-e */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div className="text-xs text-blue-950">
                  <p className="font-bold">Emissão Fiscal NFS-e</p>
                  <p className="text-blue-800 mt-0.5">Sistema fiscal com emissão assíncrona automática ativa.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab?.('bookings')}
              className="w-full text-xs font-semibold text-slate-700 hover:bg-slate-50 border-slate-200"
            >
              Ir para Gestão da Clínica
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default StrategicCockpitModule;
