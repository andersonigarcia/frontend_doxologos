import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Users, Calendar, TrendingUp, TrendingDown, ArrowLeft, 
  DollarSign, Activity, AlertTriangle, CheckCircle, Percent,
  Clock, XCircle, HeartPulse, Building2, ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { listBookings } from '@/services/bookingService';
import { listProfessionals } from '@/services/professionalService';
import StrategicCockpitModule from '@/components/admin/StrategicCockpitModule';
import OperationalRetentionModule from '@/components/admin/OperationalRetentionModule';
import GrowthAnalyticsModule from '@/components/admin/GrowthAnalyticsModule';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

export const ManagementDashboardPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [daysLimit, setDaysLimit] = useState(30);
  const [businessModel, setBusinessModel] = useState('global'); // 'global', 'b2c', 'b2b'
  
  // Dashboard states
  const [summary, setSummary] = useState(null);
  const [temporalData, setTemporalData] = useState([]);
  const [workloadData, setWorkloadData] = useState([]);
  const [retentionData, setRetentionData] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [eventStats, setEventStats] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [pulseData, setPulseData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  
  const [apiVersion, setApiVersion] = useState('v2');
  const [loadIssues, setLoadIssues] = useState([]); // painéis que falharam (nunca silenciar)

  useEffect(() => {
    loadDashboardData();
  }, [daysLimit, businessModel]);

  const loadDashboardData = async () => {
    setLoading(true);
    const issues = [];
    const reportIssue = (e) => {
      console.error('Falha em painel do dashboard:', e);
      issues.push(e?.message || 'erro desconhecido');
    };
    try {
      let usingFallback = false;

      // 0. Carregar dados base para os módulos Clean Analytics (Cockpit, Retenção e Growth)
      try {
        const [bookingsList, professionalsList, servicesRes] = await Promise.all([
          listBookings().catch(() => []),
          listProfessionals().catch(() => []),
          Promise.resolve(supabase.from('services').select('*').order('name', { ascending: true })).catch(() => ({ data: [] }))
        ]);
        setBookings(Array.isArray(bookingsList) ? bookingsList : []);
        setProfessionals(Array.isArray(professionalsList) ? professionalsList : []);
        setServices(Array.isArray(servicesRes?.data) ? servicesRes.data : []);
      } catch (baseErr) {
        console.warn('Aviso ao carregar dados base para Clean Analytics:', baseErr);
      }

      // 1. Fetch Summary
      try {
        const { data, error } = await supabase.rpc('get_dashboard_summary_v3', { days_limit: daysLimit, p_business_model: businessModel });
        if (error) throw error;
        setSummary(data);
      } catch (err) {
        console.warn('⚠️ Falha ao carregar get_dashboard_summary_v3. Usando fallback v1:', err);
        usingFallback = true;
        setApiVersion('v1');
        issues.push('Resumo em modo reduzido: variações e receita de eventos indisponíveis');
        
        const { data, error } = await supabase.rpc('get_dashboard_summary');
        if (!error) {
          setSummary({
            consultas_confirmadas: data.total_bookings || 0,
            pacientes_unicos: data.unique_patients || 0,
            receita_consultas: data.total_revenue || 0,
            receita_eventos: 0,
            ticket_medio: data.total_bookings > 0 ? (data.total_revenue / data.total_bookings) : 0,
            total_professionals: data.total_professionals || 0
          });
        }
      }

      // 2. Fetch Temporal Data
      try {
        if (usingFallback) throw new Error('Using fallback');
        const { data, error } = await supabase.rpc('get_bookings_temporal_v3', { days_limit: daysLimit, p_business_model: businessModel });
        if (error) throw error;
        
        const formatted = (data || []).map(item => ({
          ...item,
          formattedDate: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        }));
        setTemporalData(formatted);
      } catch (err) {
        const { data, error } = await supabase.rpc('get_bookings_temporal', { days_limit: daysLimit });
        if (!error) {
          const formatted = (data || []).map(item => ({
            date: item.date,
            confirmados: item.count,
            cancelados: 0,
            receita: 0,
            formattedDate: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          }));
          setTemporalData(formatted);
        }
      }

      // 3. Workload
      try {
        const { data, error } = await supabase.rpc(usingFallback ? 'get_professional_workload' : 'get_professional_workload_v2', { days_limit: daysLimit });
        if (error) throw error;
        setWorkloadData(data || []);
      } catch (e) { reportIssue(e); }

      // 4. Retention
      try {
        const { data, error } = await supabase.rpc('get_patient_retention');
        if (error) throw error;
        setRetentionData(data || []);
      } catch (e) { reportIssue(e); }

      if (!usingFallback) {
        try {
          const { data, error } = await supabase.rpc('get_conversion_funnel', { days_limit: daysLimit });
          if (error) throw error;
          setFunnelData(data || []);
        } catch (e) { reportIssue(e); }
        
        try {
          const { data, error } = await supabase.rpc('get_event_stats', { days_limit: daysLimit });
          if (error) throw error;
          setEventStats(data);
        } catch (e) { reportIssue(e); }
        
        try {
          const { data, error } = await supabase.rpc('get_pending_alerts');
          if (error) throw error;
          setAlerts(data);
        } catch (e) { reportIssue(e); }

        // Phase 2: Pulse Data
        try {
          const { data, error } = await supabase.rpc('get_dashboard_pulse_phase2', { days_limit: 1, p_business_model: businessModel });
          if (error) throw error;
          setPulseData(data);
        } catch (e) { reportIssue(e); }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dashboard',
        description: 'Verifique suas permissões de administrador.'
      });
    } finally {
      setLoadIssues(Array.from(new Set(issues)));
      setLoading(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // Dados para o Traffic Light System Fase 2
  const m_ocupacao = pulseData?.ocupacao ?? null; // null = ainda não instrumentado (mostra "—")
 
  const m_noshows = pulseData?.noshows || 0; 
  const m_espera = pulseData?.espera_horas || 0;
  const m_sem_match = pulseData?.sem_match ?? null;

  // Retenção real (RPC get_patient_retention): % de pacientes com 2+ consultas
  const retentionTotal = (retentionData || []).reduce((acc, r) => acc + Number(r.count || 0), 0);
  const retentionReturning = (retentionData || [])
    .filter((r) => r.category !== 'Única Consulta')
    .reduce((acc, r) => acc + Number(r.count || 0), 0);
  const returningPct = retentionTotal > 0 ? `${Math.round((retentionReturning / retentionTotal) * 100)}%` : '—';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Sincronizando operação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans">
      <Helmet>
        <title>Dashboard Operacional | Doxologos</title>
      </Helmet>

      {/* Header Orientado à Ação */}
      <header className="bg-white shadow-sm border-b px-6 py-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/admin">
            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-gray-900" />
              Painel Operacional
            </h1>
            <p className="text-sm text-gray-500">Métricas acionáveis para gestão diária</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Toggle Master B2C / B2B */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
            {[
              { label: 'Global', val: 'global', icon: <Building2 className="w-3 h-3 mr-1" /> },
              { label: 'B2C (Pacientes)', val: 'b2c', icon: <Users className="w-3 h-3 mr-1" /> },
              { label: 'B2B (Empresas)', val: 'b2b', icon: <Building2 className="w-3 h-3 mr-1" /> }
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => setBusinessModel(opt.val)}
                className={`flex items-center px-4 py-2 text-xs font-bold rounded-md transition-all ${
                  businessModel === opt.val 
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            {[
              { label: 'Hoje', val: 1 },
              { label: '7d', val: 7 },
              { label: '30d', val: 30 }
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => setDaysLimit(opt.val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  daysLimit === opt.val 
                    ? 'bg-gray-900 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-8">

        {loadIssues.length > 0 && (
          <div role="alert" className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm">
            <p className="font-bold">Alguns painéis não carregaram — os valores exibidos podem estar incompletos.</p>
            <ul className="list-disc ml-5 mt-1 text-xs">
              {loadIssues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
            <button onClick={loadDashboardData} className="mt-2 text-xs font-semibold underline">Tentar novamente</button>
          </div>
        )}

        {/* 🟢 MÓDULO 8.1: COCKPIT EXECUTIVO & CLEAN ANALYTICS */}
        <section aria-label="Cockpit Executivo & Clean Analytics">
          <StrategicCockpitModule
            bookings={bookings}
            professionals={professionals}
            services={services}
          />
        </section>

        {/* 🟣 MÓDULO 8.2: RETENÇÃO CLÍNICA & PREVENÇÃO DE ABANDONO (ZERO PII) */}
        <section aria-label="Retenção Clínica & Prevenção de Abandono">
          <OperationalRetentionModule
            bookings={bookings}
            professionals={professionals}
          />
        </section>

        {/* 🟠 MÓDULO 8.3: FUNIL DE AQUISIÇÃO & METAS */}
        <section aria-label="Funil de Aquisição & Metas">
          <GrowthAnalyticsModule
            bookings={bookings}
          />
        </section>

        {/* 🔴 SEÇÃO 1: PULSO DIÁRIO (O que exige ação AGORA) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <HeartPulse className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Pulso Diário (Foco em Ação)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <ActionCard 
              title="Ocupação da Agenda" 
              value={m_ocupacao === null ? '—' : `${m_ocupacao}%`} 
              threshold={{ warn: 80, critical: 85, dir: 'up' }}
              currentNum={m_ocupacao ?? 0}
              icon={<Calendar className="w-5 h-5" />}
              subtext="> 85% indica risco de burnout"
            />
            <ActionCard 
              title="No-Shows Hoje" 
              value={m_noshows} 
              threshold={{ warn: 5, critical: 10, dir: 'up' }}
              currentNum={m_noshows}
              icon={<XCircle className="w-5 h-5" />}
              subtext="Clique para acionar CS via WhatsApp"
              isClickable
            />
            <ActionCard 
              title="Tempo Espera 1ª Sessão" 
              value={`${m_espera}h`} 
              threshold={{ warn: 48, critical: 72, dir: 'up' }}
              currentNum={m_espera}
              icon={<Clock className="w-5 h-5" />}
              subtext="SLA Alvo: < 48 horas"
            />
            <ActionCard 
              title="Pacientes na fila de Match" 
              value={m_sem_match === null ? '—' : m_sem_match} 
              threshold={{ warn: 5, critical: 15, dir: 'up' }}
              currentNum={m_sem_match ?? 0}
              icon={<AlertTriangle className="w-5 h-5" />}
              subtext={m_sem_match === null ? 'Métrica ainda não instrumentada' : 'Aguardando indicação de profissional'}
            />
          </div>
        </section>

        {/* 🟡 SEÇÃO 2: SAÚDE DA OPERAÇÃO */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Saúde da Operação (Semanal)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Pacientes que Retornam (2+ consultas)</p>
                <div className="flex items-end gap-3 mt-1">
                  <h3 className="text-2xl font-black text-gray-900">{returningPct}</h3>
                  <span className="text-xs text-gray-400 mb-1">{retentionTotal} pacientes na base</span>
                </div>
              </div>
              <Users className="w-8 h-8 text-gray-200" />
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Taxa de Confirmação (período)</p>
                <div className="flex items-end gap-3 mt-1">
                  <h3 className="text-2xl font-black text-gray-900">{summary?.taxa_conversao == null ? '—' : `${summary.taxa_conversao}%`}</h3>
                  <span className="text-xs text-gray-400 mb-1">confirmadas ÷ criadas</span>
                </div>
              </div>
              <Users className="w-8 h-8 text-gray-200" />
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Ticket Médio Realizado</p>
                <div className="flex items-end gap-3 mt-1">
                  <h3 className="text-2xl font-black text-gray-900">{formatCurrency(summary?.ticket_medio)}</h3>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-gray-200" />
            </div>
          </div>
        </section>

        {/* 🔵 SEÇÃO 3: RESULTADOS */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Resultados de Fechamento</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Agendamentos e Faturamento ({daysLimit}d)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={temporalData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#111827" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#111827" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 11}} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 11}} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 11}} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area yAxisId="right" type="monotone" dataKey="receita" name="Receita" stroke="#111827" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="confirmados" name="Confirmados" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-900 text-white p-6 rounded-xl shadow-sm">
                <p className="text-xs text-gray-400 font-bold uppercase">Consultas Faturadas</p>
                <h3 className="text-3xl font-black mt-1">{formatCurrency(summary?.receita_consultas)}</h3>
                {summary?.receita_consultas_delta_pct != null && (
                  <p className="text-sm mt-2 text-gray-300">
                    <span className={summary.receita_consultas_delta_pct >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                      {summary.receita_consultas_delta_pct >= 0 ? '+' : ''}{summary.receita_consultas_delta_pct}%
                    </span> vs período anterior
                  </p>
                )}
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Consultas Concluídas</p>
                  <h3 className="text-xl font-black text-gray-900 mt-1">{summary?.consultas_confirmadas || 0}</h3>
                </div>
                <Calendar className="w-8 h-8 text-gray-200" />
              </div>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Pacientes Únicos</p>
                  <h3 className="text-xl font-black text-gray-900 mt-1">{summary?.pacientes_unicos || 0}</h3>
                </div>
                <Users className="w-8 h-8 text-gray-200" />
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

// Componente Especial: Traffic Light System
const ActionCard = ({ title, value, threshold, currentNum, icon, subtext, isClickable }) => {
  let status = 'neutral';
  
  if (threshold.dir === 'up') {
    if (currentNum >= threshold.critical) status = 'critical';
    else if (currentNum >= threshold.warn) status = 'warning';
  } else {
    if (currentNum <= threshold.critical) status = 'critical';
    else if (currentNum <= threshold.warn) status = 'warning';
  }

  const bgColors = {
    neutral: 'bg-white border-gray-200',
    warning: 'bg-amber-50 border-amber-300',
    critical: 'bg-red-50 border-red-300'
  };

  const textColors = {
    neutral: 'text-gray-900',
    warning: 'text-amber-900',
    critical: 'text-red-900'
  };
  
  const iconColors = {
    neutral: 'text-gray-400 bg-gray-100',
    warning: 'text-amber-700 bg-amber-200',
    critical: 'text-red-700 bg-red-200'
  };

  return (
    <div className={`p-5 rounded-xl border shadow-sm transition-all ${bgColors[status]} ${isClickable ? 'cursor-pointer hover:shadow-md' : ''}`}>
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-lg ${iconColors[status]}`}>
          {icon}
        </div>
        {status === 'critical' && <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />}
      </div>
      <div className="mt-4">
        <h4 className={`text-3xl font-black ${textColors[status]}`}>{value}</h4>
        <p className="text-xs font-bold uppercase tracking-tight text-gray-500 mt-1">{title}</p>
        <p className="text-[10px] text-gray-400 mt-2 font-medium">{subtext}</p>
      </div>
    </div>
  );
};

export default ManagementDashboardPage;
