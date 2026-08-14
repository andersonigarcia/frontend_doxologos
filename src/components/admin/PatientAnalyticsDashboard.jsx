import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  HeartHandshake,
  MessageCircle,
  Calendar,
  DollarSign,
  ArrowRight,
  Filter,
  Activity,
  Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PatientAnalyticsDashboard({
  patients = [],
  loading = false,
  onPatientClick
}) {
  const [filterSegment, setFilterSegment] = useState('all'); // 'all', 'active', 'at_risk', 'inactive'
  const [searchTerm, setSearchTerm] = useState('');

  const formatBrl = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Processamento de Métricas de Retenção e CRM
  const analytics = useMemo(() => {
    if (!patients || patients.length === 0) {
      return {
        totalPatients: 0,
        avgLtv: 0,
        avgSessions: 0,
        retentionRate2ndSession: 0,
        activeCount: 0,
        atRiskCount: 0,
        inactiveCount: 0,
        segmentedPatients: []
      };
    }

    const now = new Date();
    let totalSpentSum = 0;
    let totalBookingsSum = 0;
    let patientsWith2OrMore = 0;

    let activeCount = 0;
    let atRiskCount = 0;
    let inactiveCount = 0;

    const enrichedPatients = patients.map(p => {
      const totalBookings = p.totalBookings || (p.bookings ? p.bookings.length : 0);
      const totalSpent = p.totalSpent || 0;
      totalBookingsSum += totalBookings;
      totalSpentSum += totalSpent;

      if (totalBookings >= 2) {
        patientsWith2OrMore++;
      }

      // Calcular dias desde a última consulta
      let daysSinceLast = 999;
      if (p.lastBookingDate) {
        const lastDate = new Date(p.lastBookingDate);
        const diffTime = Math.abs(now - lastDate);
        daysSinceLast = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Definir Segmento de Saúde (RFM)
      let segment = 'inactive';
      let segmentLabel = 'Inativo (+60 dias)';
      let segmentBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

      if (daysSinceLast <= 30) {
        segment = 'active';
        segmentLabel = '🟢 Engajado (0-30d)';
        segmentBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold';
        activeCount++;
      } else if (daysSinceLast <= 60) {
        segment = 'at_risk';
        segmentLabel = '🟡 Em Risco (30-60d)';
        segmentBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200 font-bold';
        atRiskCount++;
      } else {
        inactiveCount++;
      }

      return {
        ...p,
        totalBookings,
        totalSpent,
        daysSinceLast,
        segment,
        segmentLabel,
        segmentBadgeClass
      };
    });

    const totalPatients = patients.length;
    const avgLtv = totalPatients > 0 ? totalSpentSum / totalPatients : 0;
    const avgSessions = totalPatients > 0 ? totalBookingsSum / totalPatients : 0;
    const retentionRate2ndSession = totalPatients > 0 ? (patientsWith2OrMore / totalPatients) * 100 : 0;

    return {
      totalPatients,
      avgLtv,
      avgSessions,
      retentionRate2ndSession,
      activeCount,
      atRiskCount,
      inactiveCount,
      segmentedPatients: enrichedPatients
    };
  }, [patients]);

  // Filtragem da Lista de Pacientes
  const filteredPatients = useMemo(() => {
    return analytics.segmentedPatients.filter(p => {
      const matchesSegment = filterSegment === 'all' || p.segment === filterSegment;
      const matchesSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSegment && matchesSearch;
    });
  }, [analytics.segmentedPatients, filterSegment, searchTerm]);

  // Helper para gerar link do WhatsApp de Reengajamento
  const handleWhatsAppReengage = (patient) => {
    if (!patient.phone) return;
    const cleanPhone = patient.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${patient.name}, tudo bem? Sentimos sua falta na Doxologos. Como você tem passado ultimamente? Estamos à disposição para agendar sua próxima sessão de acompanhamento.`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d8659]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Analytics */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white p-6 rounded-2xl border border-emerald-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#2d8659]/10 text-[#2d8659] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Patient Intelligence & Retention Cockpit
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Analytics de Saúde da Base & Retenção de Pacientes
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitore o Lifetime Value (LTV), a conversão para a 2ª consulta e identifique pacientes em risco de abandono para reengajamento.
          </p>
        </div>
      </div>

      {/* CARDS DE KPIS EXECUTIVOS DE RETENÇÃO */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: LTV Médio */}
        <Card className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">LTV Médio por Paciente</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-[#2d8659] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900">{formatBrl(analytics.avgLtv)}</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Média de <span className="font-bold text-slate-800">{analytics.avgSessions.toFixed(1)} sessões</span> /paciente
            </p>
          </div>
        </Card>

        {/* KPI 2: Retenção 1ª -> 2ª Consulta */}
        <Card className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retenção (1ª &rarr; 2ª Sessão)</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900">{analytics.retentionRate2ndSession.toFixed(1)}%</h3>
            <p className="text-xs text-slate-500 mt-1">
              Pacientes que retornaram após a 1ª consulta
            </p>
          </div>
        </Card>

        {/* KPI 3: Pacientes Ativos */}
        <Card className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Ativa (0-30 dias)</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900">{analytics.activeCount}</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {analytics.totalPatients > 0 ? ((analytics.activeCount / analytics.totalPatients) * 100).toFixed(1) : 0}% da base total
            </p>
          </div>
        </Card>

        {/* KPI 4: Pacientes em Risco */}
        <Card className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Em Risco de Churn</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-amber-600">{analytics.atRiskCount}</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Sem consulta há 30-60 dias
            </p>
          </div>
        </Card>
      </div>

      {/* GESTÃO DE REENGAJAMENTO DE PACIENTES */}
      <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Segmentação de Saúde & Reengajamento</h3>
            <p className="text-xs text-slate-500">Filtre pacientes por padrão de recorrência e acione contato preventivo.</p>
          </div>

          {/* Filtro por Segmento */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setFilterSegment('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterSegment === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Todos ({analytics.totalPatients})
            </button>
            <button
              onClick={() => setFilterSegment('active')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterSegment === 'active' ? 'bg-white text-emerald-800 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              🟢 Engajados ({analytics.activeCount})
            </button>
            <button
              onClick={() => setFilterSegment('at_risk')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterSegment === 'at_risk' ? 'bg-white text-amber-800 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              🟡 Em Risco ({analytics.atRiskCount})
            </button>
            <button
              onClick={() => setFilterSegment('inactive')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterSegment === 'inactive' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Inativos ({analytics.inactiveCount})
            </button>
          </div>
        </div>

        {/* Busca por paciente */}
        <div className="max-w-md">
          <Input
            type="text"
            placeholder="Buscar por nome ou e-mail do paciente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs bg-slate-50"
          />
        </div>

        {/* Tabela de Pacientes Segmentados */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Paciente</th>
                <th className="p-3">Status de Saúde</th>
                <th className="p-3 text-center">Total Sessões</th>
                <th className="p-3 text-right">LTV Acumulado</th>
                <th className="p-3">Última Consulta</th>
                <th className="p-3 text-right">Ação de Reengajamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-slate-400">
                    Nenhum paciente encontrado para este segmento.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <button
                        onClick={() => onPatientClick?.(patient)}
                        className="font-bold text-slate-900 hover:text-[#2d8659] text-left underline"
                      >
                        {patient.name}
                      </button>
                      <p className="text-[10px] text-slate-400">{patient.email || patient.phone || 'Sem contato'}</p>
                    </td>

                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] border ${patient.segmentBadgeClass}`}>
                        {patient.segmentLabel}
                      </span>
                    </td>

                    <td className="p-3 text-center font-extrabold text-slate-900">
                      {patient.totalBookings}
                    </td>

                    <td className="p-3 text-right font-bold text-emerald-700">
                      {formatBrl(patient.totalSpent)}
                    </td>

                    <td className="p-3 text-slate-600 font-mono">
                      {patient.lastBookingDate ? (
                        <span>{patient.lastBookingDate} ({patient.daysSinceLast}d atrás)</span>
                      ) : (
                        <span className="text-slate-400">Sem data</span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      {patient.phone ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsAppReengage(patient)}
                          className="text-[11px] h-7 bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 font-semibold"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
                          Reengajar WhatsApp
                        </Button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Sem telefone</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default PatientAnalyticsDashboard;
