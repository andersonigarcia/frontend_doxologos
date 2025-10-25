import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  BarChart3,
  Zap,
  Eye,
  MousePointer,
  Timer,
  Wifi
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import analytics from '@/lib/analytics';
import webVitalsMonitor from '@/lib/webVitals';

const AnalyticsDashboard = ({ adminMode = false }) => {
  const [realTimeData, setRealTimeData] = useState({
    activeUsers: 0,
    pageViews: 0,
    events: 0,
    conversions: 0,
    errors: 0
  });

  const [performanceData, setPerformanceData] = useState({
    vitals: {},
    recommendations: [],
    score: 0
  });

  const [recentEvents, setRecentEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const intervalRef = useRef();

  useEffect(() => {
    // Simular conexão real-time (em produção, seria WebSocket ou Server-Sent Events)
    setIsConnected(true);
    
    // Atualizar dados a cada 30 segundos
    intervalRef.current = setInterval(updateDashboard, 30000);
    
    // Carregar dados iniciais
    updateDashboard();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const updateDashboard = async () => {
    try {
      // Obter snapshot de Web Vitals
      const vitalsSnapshot = webVitalsMonitor.getVitalsSnapshot();
      const report = webVitalsMonitor.generateReport();
      
      setPerformanceData({
        vitals: vitalsSnapshot,
        recommendations: report.recommendations || [],
        score: calculatePerformanceScore(vitalsSnapshot)
      });

      // Simular dados em tempo real (em produção, viria do GA4 Real-Time API)
      setRealTimeData(prev => ({
        activeUsers: Math.floor(Math.random() * 10) + 1,
        pageViews: prev.pageViews + Math.floor(Math.random() * 5),
        events: prev.events + Math.floor(Math.random() * 3),
        conversions: prev.conversions + (Math.random() > 0.8 ? 1 : 0),
        errors: prev.errors + (Math.random() > 0.9 ? 1 : 0)
      }));

      // Adicionar evento recente
      const eventTypes = ['page_view', 'form_start', 'video_play', 'booking_step', 'error'];
      const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      setRecentEvents(prev => [
        {
          id: Date.now(),
          type: randomEvent,
          timestamp: new Date(),
          data: { page: window.location.pathname }
        },
        ...prev.slice(0, 9) // Manter apenas os 10 mais recentes
      ]);

    } catch (error) {
      console.error('Erro ao atualizar dashboard:', error);
      setIsConnected(false);
    }
  };

  const calculatePerformanceScore = (vitals) => {
    if (!vitals || Object.keys(vitals).length === 0) return 0;
    
    let score = 100;
    
    // Penalizar métricas ruins
    if (vitals.LCP?.value > 2500) score -= 20;
    if (vitals.FID?.value > 100) score -= 20;
    if (vitals.CLS?.value > 0.1) score -= 20;
    if (vitals.FCP?.value > 1800) score -= 15;
    if (vitals.TTFB?.value > 800) score -= 15;
    
    return Math.max(0, score);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVitalStatus = (vital, value) => {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 }
    };
    
    const threshold = thresholds[vital];
    if (!threshold || value === undefined) return 'unknown';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const formatEventTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!adminMode) {
    // Versão simplificada para usuários normais
    return (
      <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border max-w-sm">
        <div className="flex items-center space-x-2 mb-2">
          <Activity className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
          <span className="text-sm font-medium">Status do Site</span>
        </div>
        <div className="text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Performance:</span>
            <span className={getScoreColor(performanceData.score)}>
              {performanceData.score}/100
            </span>
          </div>
          <div className="flex justify-between">
            <span>Conexão:</span>
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Monitoramento em tempo real - Doxologos</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      {/* Métricas em Tempo Real */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Usuários Ativos"
          value={realTimeData.activeUsers}
          icon={<Users className="w-6 h-6" />}
          color="blue"
          trend="+12%"
        />
        <MetricCard
          title="Visualizações"
          value={realTimeData.pageViews}
          icon={<Eye className="w-6 h-6" />}
          color="green"
          trend="+5%"
        />
        <MetricCard
          title="Eventos"
          value={realTimeData.events}
          icon={<MousePointer className="w-6 h-6" />}
          color="purple"
          trend="+8%"
        />
        <MetricCard
          title="Conversões"
          value={realTimeData.conversions}
          icon={<TrendingUp className="w-6 h-6" />}
          color="green"
          trend="+15%"
        />
        <MetricCard
          title="Erros"
          value={realTimeData.errors}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
          trend="-3%"
        />
      </div>

      {/* Web Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Web Vitals</span>
            </CardTitle>
            <CardDescription>
              Performance Score: 
              <span className={`ml-2 font-bold ${getScoreColor(performanceData.score)}`}>
                {performanceData.score}/100
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(performanceData.vitals).map(([vital, data]) => {
                const status = getVitalStatus(vital, data?.value);
                const statusColors = {
                  good: 'text-green-600 bg-green-100',
                  'needs-improvement': 'text-yellow-600 bg-yellow-100',
                  poor: 'text-red-600 bg-red-100',
                  unknown: 'text-gray-600 bg-gray-100'
                };

                return (
                  <div key={vital} className="flex items-center justify-between">
                    <span className="font-medium">{vital}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {data?.value ? Math.round(data.value) : 'N/A'}
                        {vital.includes('Time') || vital === 'LCP' || vital === 'FCP' || vital === 'TTFB' ? 'ms' : ''}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${statusColors[status]}`}>
                        {status === 'good' ? 'Bom' : status === 'needs-improvement' ? 'Melhorar' : status === 'poor' ? 'Ruim' : 'N/A'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Eventos Recentes</span>
            </CardTitle>
            <CardDescription>
              Últimas interações dos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm font-medium">{event.type}</span>
                  <span className="text-xs text-gray-500">
                    {formatEventTime(event.timestamp)}
                  </span>
                </motion.div>
              ))}
              {recentEvents.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  Aguardando eventos...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recomendações */}
      {performanceData.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Recomendações de Otimização</span>
            </CardTitle>
            <CardDescription>
              Sugestões baseadas nos dados coletados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {performanceData.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, icon, color, trend }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100',
    red: 'text-red-600 bg-red-100'
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          {trend && (
            <span className={`text-xs ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {trend}
            </span>
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-bold">{value}</h3>
          <p className="text-sm text-gray-600">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsDashboard;