import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Users, Calendar, TrendingUp, TrendingDown, ArrowLeft, 
  DollarSign, Activity, AlertTriangle, ArrowUpRight, CheckCircle, Percent
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';

export const ManagementDashboardPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [daysLimit, setDaysLimit] = useState(30);
  
  // Dashboard states
  const [summary, setSummary] = useState(null);
  const [temporalData, setTemporalData] = useState([]);
  const [workloadData, setWorkloadData] = useState([]);
  const [retentionData, setRetentionData] = useState([]);
  const [pageViewsData, setPageViewsData] = useState([]);
  const [funnelData, setFunnelData] = useState([]);
  const [eventStats, setEventStats] = useState(null);
  const [alerts, setAlerts] = useState(null);
  
  // Track if we are using the v2 API or v1 fallback
  const [apiVersion, setApiVersion] = useState('v2');

  useEffect(() => {
    loadDashboardData();
  }, [daysLimit]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Summary
      let summaryData = null;
      let usingFallback = false;

      try {
        const { data, error } = await supabase.rpc('get_dashboard_summary_v2', { days_limit: daysLimit });
        if (error) throw error;
        summaryData = data;
      } catch (err) {
        console.warn('⚠️ Falha ao carregar get_dashboard_summary_v2. Usando fallback v1:', err);
        usingFallback = true;
        setApiVersion('v1');
        
        // Fallback para get_dashboard_summary (v1)
        const { data, error } = await supabase.rpc('get_dashboard_summary');
        if (error) throw error;
        
        // Mapear dados v1 para a estrutura v2
        summaryData = {
          consultas_confirmadas: data.total_bookings || 0,
          consultas_delta_pct: null,
          pacientes_unicos: data.unique_patients || 0,
          pacientes_delta_pct: null,
          receita_consultas: data.total_revenue || 0,
          receita_consultas_delta_pct: null,
          receita_eventos: 0,
          ticket_medio: data.total_bookings > 0 ? (data.total_revenue / data.total_bookings) : 0,
          taxa_conversao: null,
          taxa_retencao: null,
          total_professionals: data.total_professionals || 0
        };
      }
      setSummary(summaryData);

      // 2. Fetch Temporal Data
      try {
        if (usingFallback) throw new Error('Using fallback mode');
        const { data, error } = await supabase.rpc('get_bookings_temporal_v2', { days_limit: daysLimit });
        if (error) throw error;
        
        const formatted = (data || []).map(item => ({
          ...item,
          formattedDate: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        }));
        setTemporalData(formatted);
      } catch (err) {
        // Fallback v1
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

      // 3. Fetch Professional Workload
      try {
        if (usingFallback) throw new Error('Using fallback mode');
        const { data, error } = await supabase.rpc('get_professional_workload_v2', { days_limit: daysLimit });
        if (error) throw error;
        setWorkloadData(data || []);
      } catch (err) {
        const { data, error } = await supabase.rpc('get_professional_workload');
        if (!error) {
          setWorkloadData(data || []);
        }
      }

      // 4. Fetch Retention Data
      try {
        const { data, error } = await supabase.rpc('get_patient_retention');
        if (error) throw error;
        setRetentionData(data || []);
      } catch (err) {
        console.error('Error fetching retention:', err);
      }

      // 5. Fetch Page Views (exclui admins no banco)
      try {
        const { data, error } = await supabase.rpc('get_page_views_stats', { days_limit: daysLimit });
        if (error) throw error;
        setPageViewsData(data || []);
      } catch (err) {
        console.error('Error fetching page views:', err);
      }

      // 6. Fetch Funnel (v2 apenas)
      if (!usingFallback) {
        try {
          const { data, error } = await supabase.rpc('get_conversion_funnel', { days_limit: daysLimit });
          if (error) throw error;
          setFunnelData(data || []);
        } catch (err) {
          console.warn('Funnel RPC failed:', err);
        }

        // 7. Fetch Event Stats (v2 apenas)
        try {
          const { data, error } = await supabase.rpc('get_event_stats', { days_limit: daysLimit });
          if (error) throw error;
          setEventStats(data);
        } catch (err) {
          console.warn('Event stats RPC failed:', err);
        }

        // 8. Fetch Alerts (v2 apenas)
        try {
          const { data, error } = await supabase.rpc('get_pending_alerts');
          if (error) throw error;
          setAlerts(data);
        } catch (err) {
          console.warn('Alerts RPC failed:', err);
        }
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dashboard',
        description: error.message || 'Verifique suas permissões de administrador.'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#2d8659] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Carregando Dashboard Gerencial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Helmet>
        <title>Dashboard Gerencial | Doxologos</title>
      </Helmet>

      {/* Header */}
      <header className="bg-white shadow-sm border-b px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/admin">
            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-[#2d8659]" />
              Dashboard Gerencial
            </h1>
            <p className="text-sm text-gray-500">Métricas reais de faturamento, retenção e funil comercial</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          {[
            { label: '7 dias', val: 7 },
            { label: '30 dias', val: 30 },
            { label: '90 dias', val: 90 },
            { label: '12 meses', val: 365 }
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setDaysLimit(opt.val)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                daysLimit === opt.val 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-6">
        {/* API warning for database schema compatibility */}
        {apiVersion === 'v1' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800">Visualização de Fallback Compatível</h4>
              <p className="text-xs text-amber-700 mt-1">
                A nova migração de banco de dados (`20260702_dashboard_v2.sql`) ainda não foi aplicada ao Supabase.
                O painel está rodando no modo de compatibilidade legado (v1). Algumas métricas como o funil de vendas,
                receita de eventos e alertas operacionais estarão ocultos ou simplificados.
              </p>
            </div>
          </div>
        )}

        {/* Operational Alerts Section (v2 only) */}
        {alerts && (alerts.pending_expirados > 0 || alerts.profissionais_inativos > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Atenção: Alertas Operacionais Requerendo Ação</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-red-700">
              {alerts.pending_expirados > 0 && (
                <div className="bg-white p-3 rounded-lg border border-red-100 flex items-center justify-between">
                  <span>Agendamentos pendentes vencidos e não pagos:</span>
                  <strong className="text-red-950 font-bold text-sm">{alerts.pending_expirados}</strong>
                </div>
              )}
              {alerts.profissionais_inativos > 0 && (
                <div className="bg-white p-3 rounded-lg border border-red-100 flex items-center justify-between">
                  <span>Profissionais sem consultas agendadas nos últimos 30 dias:</span>
                  <strong className="text-red-950 font-bold text-sm">{alerts.profissionais_inativos}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Receita Consultas (Real)" 
            value={formatCurrency(summary?.receita_consultas)} 
            delta={summary?.receita_consultas_delta_pct}
            icon={<DollarSign className="w-5 h-5 text-green-600" />} 
          />
          <StatCard 
            title="Receita de Eventos" 
            value={formatCurrency(summary?.receita_eventos)} 
            icon={<Activity className="w-5 h-5 text-blue-600" />} 
          />
          <StatCard 
            title="Consultas Pagas" 
            value={summary?.consultas_confirmadas || 0} 
            delta={summary?.consultas_delta_pct}
            icon={<Calendar className="w-5 h-5 text-purple-600" />} 
          />
          <StatCard 
            title="Pacientes Únicos" 
            value={summary?.pacientes_unicos || 0} 
            delta={summary?.pacientes_delta_pct}
            icon={<Users className="w-5 h-5 text-indigo-600" />} 
          />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardMini 
            title="Taxa de Conversão Funil" 
            value={summary?.taxa_conversao !== null && summary?.taxa_conversao !== undefined ? `${summary.taxa_conversao}%` : 'N/A'} 
            icon={<Percent className="w-4 h-4 text-emerald-600" />} 
          />
          <StatCardMini 
            title="Taxa de Retenção" 
            value={summary?.taxa_retencao !== null && summary?.taxa_retencao !== undefined ? `${summary.taxa_retencao}%` : 'N/A'} 
            icon={<CheckCircle className="w-4 h-4 text-sky-600" />} 
          />
          <StatCardMini 
            title="Ticket Médio" 
            value={formatCurrency(summary?.ticket_medio)} 
            icon={<DollarSign className="w-4 h-4 text-amber-600" />} 
          />
          <StatCardMini 
            title="Profissionais Cadastrados" 
            value={summary?.total_professionals || 0} 
            icon={<Users className="w-4 h-4 text-violet-600" />} 
          />
        </div>

        {/* Conversion Funnel Section (v2 only) */}
        {funnelData && funnelData.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-semibold mb-4 text-gray-800 font-medium">Funil de Conversão Comercial</h2>
            
            {/* Visual Funnel Bars */}
            <div className="space-y-4">
              {funnelData.map((step, idx) => {
                const maxVal = funnelData[0]?.count || 1;
                const pctOfTotal = maxVal > 0 ? (step.count / maxVal) * 100 : 0;
                
                return (
                  <div key={step.stage} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-gray-700">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                          {step.stage}
                        </span>
                        {step.label}
                      </span>
                      <div className="flex gap-4">
                        <span>{step.count.toLocaleString('pt-BR')}</span>
                        {idx > 0 && (
                          <span className="text-red-500 font-medium">
                            -{step.drop_off_pct}% abandono
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 h-6 rounded-lg overflow-hidden flex">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full transition-all duration-500" 
                        style={{ width: `${pctOfTotal}%` }}
                      />
                      {pctOfTotal > 0 && (
                        <span className="text-[10px] text-gray-500 ml-2 self-center font-medium">
                          {pctOfTotal.toFixed(0)}% conversão acumulada
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Temporal Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
            className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Agendamentos e Faturamento Diário</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={temporalData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 11}} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 11}} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 11}} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Area yAxisId="right" type="monotone" dataKey="receita" name="Faturamento (R$)" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="confirmados" name="Confirmados" stroke="#8b5cf6" strokeWidth={2.5} dot={{r: 3}} />
                  {apiVersion === 'v2' && (
                    <Line yAxisId="left" type="monotone" dataKey="cancelados" name="Cancelados" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Workload Ranking */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-semibold mb-4 text-gray-800 font-medium">Desempenho por Profissional</h2>
            <div className="h-80 overflow-y-auto pr-2 custom-scrollbar">
              {workloadData.length === 0 ? (
                <p className="text-gray-500 text-center mt-10">Nenhum dado disponível.</p>
              ) : (
                <div className="space-y-3">
                  {workloadData.map((prof, index) => (
                    <div key={prof.id} className="p-3 bg-gray-50 rounded-lg space-y-2 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2d8659] bg-[#2d8659]/10 px-2 py-0.5 rounded-full">
                            {index + 1}º
                          </span>
                          <span className="text-sm font-semibold text-gray-900">{prof.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900">
                          {formatCurrency(prof.receita)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{prof.completed_appointments} consultas confirmadas</span>
                        {prof.taxa_conclusao !== undefined && (
                          <span className="font-semibold text-emerald-600">
                            {prof.taxa_conclusao}% conversão
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Events Section (v2 only) */}
        {eventStats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100"
            >
              <h2 className="text-lg font-semibold mb-4 text-gray-800 font-medium flex items-center gap-2">
                Top Eventos e Inscrições
              </h2>
              <div className="space-y-4">
                {(!eventStats.top_eventos || eventStats.top_eventos.length === 0) ? (
                  <p className="text-gray-400 text-sm text-center py-8">Nenhum evento registrado no período.</p>
                ) : (
                  eventStats.top_eventos.map((ev, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {idx + 1}º
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{ev.title}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">{ev.inscricoes}</span>
                        <p className="text-[10px] text-gray-500">inscritos pagos</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
            
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-xl shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Eventos do Período</span>
                <h3 className="text-3xl font-extrabold mt-2">{formatCurrency(eventStats.receita_eventos)}</h3>
                <p className="text-xs text-indigo-200 mt-1">Receita consolidada de workshops e transmissões</p>
              </div>
              <div className="border-t border-indigo-800 pt-4 mt-6 flex justify-between items-center text-sm">
                <span>Inscrições Confirmadas</span>
                <span className="font-bold text-indigo-300">{eventStats.total_inscritos}</span>
              </div>
            </div>
          </div>
        )}

        {/* Retention and Top Pages Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Distribuição de Retenção</h2>
            <div className="h-72 flex items-center justify-center">
              {retentionData.length === 0 ? (
                <p className="text-gray-500">Nenhum dado de retenção disponível.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={retentionData}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {retentionData.map((entry, index) => {
                        const COLORS = ['#64748b', '#6366f1', '#10b981'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Page Views Ranking */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Tráfego de Usuários Reais (30 dias)</h2>
            <div className="h-72 overflow-y-auto pr-2 custom-scrollbar">
              {pageViewsData.length === 0 ? (
                <p className="text-gray-500 text-center mt-10">Aguardando tráfego qualificado de visitantes.</p>
              ) : (
                <div className="space-y-3">
                  {pageViewsData.map((page, index) => (
                    <div key={page.path} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                          {index + 1}º
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]" title={page.path}>
                            {page.path === '/' ? '/ (Home)' : page.path}
                          </p>
                          <p className="text-[10px] text-gray-500">{page.unique_sessions} sessões únicas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{page.views}</p>
                        <p className="text-[10px] text-gray-500">views</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

const StatCard = ({ title, value, icon, delta }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between"
  >
    <div className="flex items-center gap-4">
      <div className="p-3 bg-gray-50 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
    
    {delta !== undefined && delta !== null && (
      <div className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${
        delta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
      }`}>
        {delta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        <span>{delta >= 0 ? `+${delta}%` : `${delta}%`}</span>
      </div>
    )}
  </motion.div>
);

const StatCardMini = ({ title, value, icon }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
    <div className="p-2 bg-gray-50 rounded-lg flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-xs font-medium text-gray-400">{title}</p>
      <h4 className="text-base font-bold text-gray-900 mt-0.5">{value}</h4>
    </div>
  </div>
);

export default ManagementDashboardPage;
