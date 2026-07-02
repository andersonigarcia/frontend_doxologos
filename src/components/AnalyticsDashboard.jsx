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
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import analytics from '@/lib/analytics';
import webVitalsMonitor from '@/lib/webVitals';

const AnalyticsDashboard = ({ adminMode = false }) => {
  // NOTA: dados de tempo real (usuários ativos, conversões) requerem integração
  // com GA4 Real-Time API. Não são simulados para evitar false positives.
  const realTimeData = null; // integração GA4 pendente

  const [performanceData, setPerformanceData] = useState({
    vitals: {},
    recommendations: [],
    score: 0
  });

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
      // Atualizar apenas dados reais: Web Vitals coletados pelo webVitals.js
      const vitalsSnapshot = webVitalsMonitor.getVitalsSnapshot();
      const report = webVitalsMonitor.generateReport();
      
      setPerformanceData({
        vitals: vitalsSnapshot,
        recommendations: report.recommendations || [],
        score: calculatePerformanceScore(vitalsSnapshot)
      });

      // Dados de tempo real (usuários ativos, eventos) requerem GA4 Real-Time API.
      // Não são simulados — métricas falsas causam decisões incorretas.

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

      {/* Métricas em Tempo Real — requer integração GA4 Real-Time API */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Dados de tempo real não disponíveis</p>
          <p className="text-xs text-amber-700 mt-1">
            Métricas como usuários ativos, eventos e conversões em tempo real requerem integração com a GA4 Real-Time API.
            Os dados abaixo (Web Vitals) são coletados diretamente pelo navegador e são reais.
          </p>
        </div>
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
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <Activity className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-500 font-medium">Integração GA4 pendente</p>
              <p className="text-xs text-gray-400">
                Eventos em tempo real estarão disponíveis após configuração da GA4 Real-Time API.
              </p>
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