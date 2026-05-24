import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Calendar, TrendingUp, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

export const ManagementDashboardPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [temporalData, setTemporalData] = useState([]);
  const [workloadData, setWorkloadData] = useState([]);
  const [retentionData, setRetentionData] = useState([]);
  const [pageViewsData, setPageViewsData] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Summary
      const { data: summaryData, error: summaryError } = await supabase.rpc('get_dashboard_summary');
      if (summaryError) throw summaryError;
      setSummary(summaryData);

      // 2. Fetch Temporal
      const { data: temporalDataRes, error: temporalError } = await supabase.rpc('get_bookings_temporal', { days_limit: 30 });
      if (temporalError) throw temporalError;
      
      // Format dates for the chart
      const formattedTemporal = (temporalDataRes || []).map(item => {
        const dateObj = new Date(item.date);
        return {
          ...item,
          formattedDate: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        };
      });
      setTemporalData(formattedTemporal);

      // 3. Fetch Workload
      const { data: workloadDataRes, error: workloadError } = await supabase.rpc('get_professional_workload');
      if (workloadError) throw workloadError;
      setWorkloadData(workloadDataRes || []);

      // 4. Fetch Retention
      const { data: retentionDataRes, error: retentionError } = await supabase.rpc('get_patient_retention');
      if (retentionError) throw retentionError;
      setRetentionData(retentionDataRes || []);

      // 5. Fetch Page Views
      const { data: pageViewsRes, error: pageViewsError } = await supabase.rpc('get_page_views_stats', { days_limit: 30 });
      if (pageViewsError) throw pageViewsError;
      setPageViewsData(pageViewsRes || []);

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
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Dashboard Gerencial | Doxologos</title>
      </Helmet>

      {/* Header */}
      <header className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
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
            <p className="text-sm text-gray-500">Visão geral operacional exclusiva para Administradores</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-6">
        
        {/* KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total de Agendamentos" 
            value={summary?.total_bookings || 0} 
            icon={<Calendar className="w-5 h-5 text-blue-500" />} 
          />
          <StatCard 
            title="Pacientes Únicos" 
            value={summary?.unique_patients || 0} 
            icon={<Users className="w-5 h-5 text-green-500" />} 
          />
          <StatCard 
            title="Profissionais Ativos" 
            value={summary?.total_professionals || 0} 
            icon={<Users className="w-5 h-5 text-purple-500" />} 
          />
          <StatCard 
            title="Receita Estimada" 
            value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.total_revenue || 0)} 
            icon={<TrendingUp className="w-5 h-5 text-yellow-500" />} 
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Temporal Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
            className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Agendamentos (Últimos 30 dias)</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={temporalData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="formattedDate" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="count" name="Agendamentos" stroke="#2d8659" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Workload Ranking */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Ranking de Profissionais</h2>
            <div className="h-72 overflow-y-auto pr-2 custom-scrollbar">
              {workloadData.length === 0 ? (
                <p className="text-gray-500 text-center mt-10">Nenhum dado disponível.</p>
              ) : (
                <div className="space-y-4">
                  {workloadData.map((prof, index) => (
                    <div key={prof.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {index + 1}º
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{prof.name}</p>
                          <p className="text-xs text-gray-500">{prof.completed_appointments} concluídos</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{prof.total_appointments}</p>
                        <p className="text-xs text-gray-500">total</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* Retention Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
          >
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Retenção e Recorrência de Pacientes</h2>
            <div className="h-72 flex items-center justify-center">
              {retentionData.length === 0 ? (
                <p className="text-gray-500">Nenhum dado disponível.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={retentionData}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {retentionData.map((entry, index) => {
                        const COLORS = ['#94a3b8', '#3b82f6', '#22c55e'];
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
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Páginas Mais Acessadas (30 dias)</h2>
            <div className="h-72 overflow-y-auto pr-2 custom-scrollbar">
              {pageViewsData.length === 0 ? (
                <p className="text-gray-500 text-center mt-10">Nenhum dado de acesso disponível ainda.</p>
              ) : (
                <div className="space-y-4">
                  {pageViewsData.map((page, index) => (
                    <div key={page.path} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {index + 1}º
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px]" title={page.path}>
                            {page.path === '/' ? '/ (Home)' : page.path}
                          </p>
                          <p className="text-xs text-gray-500">{page.unique_sessions} sessões únicas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{page.views}</p>
                        <p className="text-xs text-gray-500">views</p>
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

const StatCard = ({ title, value, icon }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"
  >
    <div className="p-3 bg-gray-50 rounded-lg">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
  </motion.div>
);

export default ManagementDashboardPage;
