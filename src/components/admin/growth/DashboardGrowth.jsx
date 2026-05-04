import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, TrendingUp, Presentation, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

export function DashboardGrowth() {
    const [metrics, setMetrics] = useState({
        newPatientsMonth: 0,
        recurrenceRate: 0,
        averageLTV: 0,
        loading: true
    });

    useEffect(() => {
        async function fetchGrowthData() {
            try {
                // 1. Calcular Novos Pacientes (Cadastros no mês atual vs agendamentos do mês)
                // Vamos usar os agendamentos recentes do mês atual para identificar novos usuários pagantes
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

                // Pegar todos os agendamentos confirmados/pagos de todos os tempos
                const { data: allBookings, error: bookingsError } = await supabase
                    .from('bookings')
                    .select('patient_name, patient_email, booking_date, status, valor_consulta')
                    .in('status', ['confirmed', 'paid', 'completed']);

                if (bookingsError) throw bookingsError;

                if (!allBookings || allBookings.length === 0) {
                    setMetrics({ newPatientsMonth: 0, recurrenceRate: 0, averageLTV: 0, loading: false });
                    return;
                }

                // Agrupar por paciente (usando email como identificador único)
                const patientStats = {};
                allBookings.forEach(b => {
                    const email = b.patient_email?.toLowerCase() || b.patient_name?.toLowerCase();
                    if (!email) return;

                    if (!patientStats[email]) {
                        patientStats[email] = {
                            totalSpent: 0,
                            bookingCount: 0,
                            firstBookingDate: b.booking_date
                        };
                    }

                    patientStats[email].totalSpent += Number(b.valor_consulta || 0);
                    patientStats[email].bookingCount += 1;

                    if (b.booking_date < patientStats[email].firstBookingDate) {
                        patientStats[email].firstBookingDate = b.booking_date;
                    }
                });

                let newPatientsThisMonth = 0;
                let recurringPatientsCount = 0;
                let totalLTV = 0;
                const totalPatients = Object.keys(patientStats).length;

                Object.values(patientStats).forEach(stat => {
                    totalLTV += stat.totalSpent;

                    if (stat.bookingCount > 1) {
                        recurringPatientsCount++;
                    }

                    if (stat.firstBookingDate >= startOfMonth.split('T')[0]) {
                        newPatientsThisMonth++;
                    }
                });

                const recurrenceRate = totalPatients > 0 ? (recurringPatientsCount / totalPatients) * 100 : 0;
                const averageLTV = totalPatients > 0 ? totalLTV / totalPatients : 0;

                setMetrics({
                    newPatientsMonth: newPatientsThisMonth,
                    recurrenceRate: recurrenceRate.toFixed(1),
                    averageLTV: averageLTV,
                    loading: false
                });

            } catch (error) {
                console.error("Erro ao carregar dados de Growth:", error);
                setMetrics(prev => ({ ...prev, loading: false }));
            }
        }

        fetchGrowthData();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold flex items-center text-gray-800">
                    <TrendingUp className="w-6 h-6 mr-2 text-[#2d8659]" />
                    Growth & Marketing Dashboard
                </h2>
                <p className="text-gray-600 mt-1">
                    Monitore a saúde do crescimento da clínica, métricas de novos pacientes e retenção de longo prazo.
                </p>
            </div>

            {/* Top Cards: Native Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-[#2d8659]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
                            Novos Pacientes (Mês Atual)
                            <Users className="w-4 h-4 text-[#2d8659]" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.loading ? (
                            <div className="h-8 bg-gray-100 animate-pulse rounded w-1/2"></div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{metrics.newPatientsMonth}</div>
                                <p className="text-xs text-gray-500 mt-1">Primeira consulta agendada neste mês</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
                            Taxa de Recorrência (Fidelização)
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.loading ? (
                            <div className="h-8 bg-gray-100 animate-pulse rounded w-1/2"></div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{metrics.recurrenceRate}%</div>
                                <p className="text-xs text-gray-500 mt-1">Pacientes com 2 ou mais consultas pagas</p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center justify-between">
                            LTV Médio (Lifetime Value)
                            <AlertCircle className="w-4 h-4 text-purple-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.loading ? (
                            <div className="h-8 bg-gray-100 animate-pulse rounded w-1/2"></div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.averageLTV)}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Gasto médio histórico por paciente ativo</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Looker Studio iFrame Placeholder */}
            <Card className="mt-8 border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center text-lg text-gray-800">
                                <Presentation className="w-5 h-5 mr-2 text-blue-600" />
                                Google Analytics & Tráfego (GA4)
                            </CardTitle>
                            <CardDescription>
                                Visualização de Origem de Acessos, Dispositivos e Rejeição
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="bg-gray-100 flex flex-col items-center justify-center text-center p-12 min-h-[500px]">
                        <Presentation className="w-16 h-16 text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">Painel de Tráfego do Google Looker Studio</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">
                            Para visualizar os acessos do site (GA4) em tempo real, cole a URL de Incorporação (Embed URL) do relatório do Google Looker Studio no código fonte deste componente (`DashboardGrowth.jsx`), ou solicite sua ativação ao especialista de tráfego.
                        </p>
                        <div className="bg-white p-4 rounded-lg border text-sm text-left max-w-lg shadow-sm w-full">
                            <strong>Como habilitar:</strong>
                            <ol className="list-decimal ml-5 mt-2 space-y-1 text-gray-600">
                                <li>Acesse <a href="https://lookerstudio.google.com/" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">lookerstudio.google.com</a></li>
                                <li>Conecte sua conta do <strong>Google Analytics 4 (GA4)</strong>.</li>
                                <li>Clique em <em>Arquivo &gt; Incorporar Relatório</em>.</li>
                                <li>Pegue o link e substitua este bloco por um `&lt;iframe src="..." /&gt;`.</li>
                            </ol>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Growth Strategy Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                    <h3 className="font-semibold text-green-900 mb-2 text-lg">💡 Estratégia de Aquisição (Novos)</h3>
                    <ul className="space-y-2 text-green-800 text-sm">
                        <li>• Manter o <strong>Meta Pixel</strong> ativo via API de Conversões.</li>
                        <li>• Escalar campanhas Google Ads para "Psicóloga Online Valor".</li>
                        <li>• Se a meta de Novos Pacientes cair, avaliar urgência na redução do Custo Por Clique (CPC).</li>
                    </ul>
                </div>

                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <h3 className="font-semibold text-blue-900 mb-2 text-lg">❤️ Estratégia de Retenção (LTV)</h3>
                    <ul className="space-y-2 text-blue-800 text-sm">
                        <li>• Disparar <strong>Pesquisa de NPS</strong> no dia seguinte à 1ª sessão para prever abandonos.</li>
                        <li>• Contatar via CRM pacientes inativos há mais de 30 dias com mensagens de acolhimento.</li>
                        <li>• Oferecer planos contínuos para pacientes com mais de 3 sessões avulsas finalizadas.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
