import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getBookingById } from '@/services/bookingService';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Loader2, Video, AlertCircle, CheckCircle, Clock, Shield, Calendar, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const SalaEsperaPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Atualiza o relógio a cada 15 segundos para recalcular a janela temporal
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 15000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!user || !id) return;
        
        const fetchBooking = async () => {
            try {
                const data = await getBookingById(id, { userId: user.id });
                setBooking(data);
            } catch (err) {
                console.error("Erro ao carregar agendamento", err);
                setError(err.message || "Não foi possível carregar as informações da sala.");
            } finally {
                setLoading(false);
            }
        };
        
        fetchBooking();
        
        // Inscrever-se no Supabase Realtime para escutar as mudanças de status da sala (in_progress)
        const subscription = supabase
            .channel(`booking-${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'bookings',
                    filter: `id=eq.${id}`
                },
                (payload) => {
                    console.log('Realtime update recebido:', payload);
                    if (payload.new && payload.new.session_status) {
                        setBooking(prev => ({
                            ...prev,
                            session_status: payload.new.session_status
                        }));
                    }
                }
            )
            .subscribe();
            
        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user, id]);
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" />
            </div>
        );
    }
    
    if (error || !booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Ops!</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Button onClick={() => navigate('/paciente')} className="w-full bg-[#2d8659] hover:bg-[#236b47]">
                        Voltar ao Painel
                    </Button>
                </div>
            </div>
        );
    }
    
    const isReady = booking.session_status === 'in_progress';
    const isFinished = booking.session_status === 'finished';
    const actualMeetingLink = booking?.meeting_link || booking?.professional?.personal_meet_link || (Array.isArray(booking?.professional) ? booking.professional[0]?.personal_meet_link : null);

    // ─── GATEKEEPER TEMPORAL (Anti-Desintermediação & Segurança) ───
    let isTooEarly = false;
    let isScheduledPast = false;
    let formattedDate = booking.booking_date;
    let formattedTime = booking.booking_time || '';
    let minutesUntilStart = 0;

    if (booking.booking_date && booking.booking_time) {
        try {
            const timePart = booking.booking_time.slice(0, 5);
            const scheduledDateTime = new Date(`${booking.booking_date}T${timePart}:00`);
            formattedDate = new Date(booking.booking_date + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
            });
            const diffMs = scheduledDateTime.getTime() - currentTime.getTime();
            minutesUntilStart = Math.round(diffMs / 60000);
            
            // Liberado apenas a partir de T-10 minutos
            if (minutesUntilStart > 10 && !isReady) {
                isTooEarly = true;
            }
            if (diffMs <= 0) {
                isScheduledPast = true;
            }
        } catch (e) {
            console.warn("Erro ao calcular janela temporal:", e);
        }
    }
    
    return (
        <>
            <Helmet><title>Sala de Espera - Doxologos</title></Helmet>
            <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="bg-[#2d8659] p-8 text-center text-white">
                        <Video className="w-12 h-12 mx-auto mb-4 opacity-80" />
                        <h1 className="text-3xl font-bold mb-2">Sala de Espera Virtual</h1>
                        <p className="text-emerald-100">Ambiente seguro e protegido de teleconsulta Doxologos</p>
                    </div>
                    
                    <div className="p-8 text-center">
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Sua sessão com</h3>
                            <p className="text-2xl font-bold text-gray-800">
                                {booking.professional?.[0]?.name || booking.professional?.name || 'Seu Psicólogo'}
                            </p>
                            <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mt-2">
                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#2d8659]" /> {formattedDate}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#2d8659]" /> {formattedTime}</span>
                            </div>
                        </div>
                        
                        {isFinished ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8">
                                <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-gray-800 mb-2">Sessão Finalizada</h2>
                                <p className="text-gray-600 mb-6">Esta consulta já foi encerrada na plataforma.</p>
                                <Button onClick={() => navigate('/paciente')} variant="outline" className="border-[#2d8659] text-[#2d8659]">
                                    Voltar ao Painel
                                </Button>
                            </motion.div>
                        ) : isTooEarly ? (
                            /* Gatekeeper: Muito cedo para entrar */
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-6">
                                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clock className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Antecipado</h2>
                                <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm leading-relaxed">
                                    Por segurança e privacidade, a sala de espera é liberada <strong>10 minutos antes</strong> do horário agendado (em {minutesUntilStart} minutos).
                                </p>
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 mb-6 text-left max-w-md mx-auto space-y-1">
                                    <p className="font-semibold">💡 Dicas de preparação:</p>
                                    <ul className="list-disc list-inside space-y-1 text-amber-700">
                                        <li>Escolha um local privativo, tranquilo e silencioso</li>
                                        <li>Conecte seus fones de ouvido para melhor sigilo</li>
                                        <li>Retorne a esta página 5 minutos antes do início</li>
                                    </ul>
                                </div>
                                <Button onClick={() => navigate('/paciente')} variant="outline" className="border-gray-300 text-gray-700">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar à Área do Paciente
                                </Button>
                            </motion.div>
                        ) : isReady ? (
                            /* Sessão pronta / iniciada pelo profissional */
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                transition={{ type: "spring" }}
                                className="bg-emerald-50 rounded-xl p-8 border border-emerald-100"
                            >
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                    <Video className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">O profissional está te chamando!</h2>
                                <p className="text-gray-600 mb-8">Sua sala já está pronta e liberada para entrada.</p>
                                
                                <Button 
                                    className="w-full h-14 text-lg bg-[#2d8659] hover:bg-[#236b47] shadow-lg hover:shadow-xl transition-all"
                                    onClick={() => {
                                        if (actualMeetingLink) {
                                            window.open(actualMeetingLink, '_blank');
                                        } else {
                                            alert("Link da reunião não encontrado.");
                                        }
                                    }}
                                >
                                    Entrar na Consulta Agora
                                </Button>
                                
                                {booking.meeting_password && (
                                    <p className="mt-4 text-sm text-gray-500">
                                        Senha de acesso: <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded">{booking.meeting_password}</span>
                                    </p>
                                )}
                            </motion.div>
                        ) : (
                            /* Dentro da janela temporal (T-10m até T+60m), aguardando chamada */
                            <div className="py-6">
                                <div className="relative w-20 h-20 mx-auto mb-6">
                                    <svg className="animate-spin w-full h-full text-[#2d8659]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                                
                                <h2 className="text-xl font-bold text-gray-800 mb-2">Aguardando o Profissional</h2>
                                <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm">
                                    Por favor, permaneça nesta página. O botão de entrada aparecerá automaticamente assim que o psicólogo iniciar a sessão.
                                </p>
                                
                                <div className="bg-slate-50 p-4 rounded-xl text-xs text-gray-500 border border-slate-100 italic mb-6 max-w-md mx-auto">
                                    "Aproveite este momento para respirar fundo, procurar um local silencioso e focar no seu bem-estar."
                                </div>
                                
                                {isScheduledPast && (
                                    <div className="mt-6 border-t border-gray-100 pt-6">
                                        <p className="text-xs text-gray-500 mb-3">O horário agendado já começou e o botão automático ainda não apareceu?</p>
                                        <Button 
                                            variant="outline" 
                                            className="text-[#2d8659] border-[#2d8659] hover:bg-emerald-50 text-sm h-10 px-6 font-medium"
                                            onClick={() => {
                                                if (actualMeetingLink) {
                                                    window.open(actualMeetingLink, '_blank');
                                                } else {
                                                    alert("Link da reunião não disponível.");
                                                }
                                            }}
                                        >
                                            Entrar na Sala Virtual
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] text-gray-400">
                            <Shield className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Atendimento protegido Doxologos · Em conformidade com o CFP</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SalaEsperaPage;
