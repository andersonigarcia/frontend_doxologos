import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getBookingById } from '@/services/bookingService';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Loader2, Video, AlertCircle, CheckCircle, Clock, Shield, Calendar, ArrowLeft, Star, Heart, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmbeddedConsultationRoom } from '@/components/telemedicina/EmbeddedConsultationRoom';

const SalaEsperaPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, userRole } = useAuth();
    
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Estado da Sala Embarcada (Fase 2)
    const [activeSession, setActiveSession] = useState(null);

    // Estado do Funil de Retenção Pós-Sessão
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [rating, setRating] = useState(5);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewSubmitted, setReviewSubmitted] = useState(false);
    
    // Atualiza o relógio a cada 15 segundos para recalcular a janela temporal
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 15000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!user || !id) return;
        
        const fetchBooking = async () => {
            try {
                const isStaffRole = userRole === 'professional' || userRole === 'admin';
                const data = await getBookingById(
                    id,
                    isStaffRole ? { includeRelations: true } : { userId: user.id }
                );

                const profObj = Array.isArray(data?.professional) ? data.professional[0] : data?.professional;
                const isOwnerProf = Boolean(user?.id && profObj?.user_id === user.id);
                const isPatientOwner = Boolean(user?.id && data?.user_id === user.id);

                if (!isOwnerProf && !isPatientOwner && userRole !== 'admin') {
                    throw new Error("Você não tem permissão para acessar esta sala de teleconsulta.");
                }

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

    // Manipula entrada na consulta com Circuit Breaker transparente
    const handleJoinConsultation = async () => {
        setJoining(true);
        try {
            const profObj = Array.isArray(booking?.professional) ? booking.professional[0] : booking?.professional;
            const isProfEntering = Boolean(user?.id && profObj?.user_id === user.id);

            if (isProfEntering && booking?.session_status !== 'in_progress') {
                await supabase
                    .from('bookings')
                    .update({ session_status: 'in_progress' })
                    .eq('id', id)
                    .catch((e) => console.warn("Aviso ao atualizar session_status:", e));
            }

            const { data, error: fnErr } = await supabase.functions.invoke('create-video-room', {
                body: { booking_id: id }
            });

            if (fnErr || !data) {
                throw fnErr || new Error("Falha ao inicializar sala virtual");
            }

            if (data.mode === 'embedded' && data.roomUrl) {
                // Modo Embarcado Nativo Daily.co (In-App)
                setActiveSession({
                    roomUrl: data.roomUrl,
                    token: data.token,
                    isOwner: data.isOwner,
                    durationMinutes: data.durationMinutes || 50
                });
            } else {
                // Modo de Contingência (Circuit Breaker / Fase 1)
                const fallbackLink = data.fallbackUrl || booking?.meeting_link || booking?.professional?.personal_meet_link;
                if (fallbackLink) {
                    window.open(fallbackLink, '_blank');
                } else {
                    alert("Link da reunião não encontrado. Por favor, contate o suporte.");
                }
            }
        } catch (joinErr) {
            console.warn("Fallback automático ativado devido a erro na API:", joinErr);
            const fallbackLink = booking?.meeting_link || booking?.professional?.personal_meet_link;
            if (fallbackLink) {
                window.open(fallbackLink, '_blank');
            } else {
                alert("Não foi possível acessar a sala de vídeo. Tente novamente em instantes.");
            }
        } finally {
            setJoining(false);
        }
    };

    const handleSendReview = async () => {
        setSubmittingReview(true);
        try {
            await supabase.from('reviews').insert([{
                booking_id: id,
                patient_id: user?.id,
                professional_id: booking?.professional_id,
                rating,
                comment: feedbackComment || null,
                is_approved: true,
            }]);
            setReviewSubmitted(true);
        } catch (e) {
            console.error("Erro ao salvar avaliação:", e);
            setReviewSubmitted(true);
        } finally {
            setSubmittingReview(false);
        }
    };
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" />
            </div>
        );
    }
    
    if (error || !booking) {
        const backPath = userRole === 'professional' ? '/profissional' : '/paciente';
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Ops!</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Button onClick={() => navigate(backPath)} className="w-full bg-[#2d8659] hover:bg-[#236b47]">
                        Voltar ao Painel
                    </Button>
                </div>
            </div>
        );
    }

    const professionalData = Array.isArray(booking.professional) ? booking.professional[0] : booking.professional;
    const isAssignedProfessional = Boolean(user?.id && professionalData?.user_id === user.id);
    const isStaffViewer = isAssignedProfessional || userRole === 'admin';

    // ── TELA DA TELECONSULTA EMBARCADA (FASE 2) ──
    if (activeSession) {
        return (
            <>
                <Helmet><title>Teleconsulta em Andamento - Doxologos</title></Helmet>
                <div className="min-h-screen bg-slate-950 py-6 px-4 flex flex-col items-center justify-center">
                    <div className="w-full max-w-5xl">
                        <EmbeddedConsultationRoom
                            roomUrl={activeSession.roomUrl}
                            token={activeSession.token}
                            durationMinutes={activeSession.durationMinutes}
                            isOwner={activeSession.isOwner}
                            participantName={
                                isAssignedProfessional
                                    ? (professionalData?.name || user?.user_metadata?.full_name || 'Psicólogo(a)')
                                    : (user?.user_metadata?.name || booking?.patient_name || 'Participante')
                            }
                            onSessionEnd={async () => {
                                setActiveSession(null);
                                try {
                                    await supabase.from('bookings').update({
                                        session_status: 'finished',
                                        session_ended_at: new Date().toISOString()
                                    }).eq('id', id);
                                } catch (e) {
                                    console.error('Erro ao atualizar status de encerramento:', e);
                                }
                                if (isStaffViewer) {
                                    navigate('/profissional');
                                } else {
                                    setShowReviewModal(true);
                                }
                            }}
                        />
                    </div>
                </div>
            </>
        );
    }
    
    const isReady = booking.session_status === 'in_progress';
    const isFinished = booking.session_status === 'finished';

    // ─── GATEKEEPER TEMPORAL (Anti-Desintermediação & Segurança) ───
    let isTooEarly = false;
    let isScheduledPast = false;
    let formattedDate = booking.booking_date;
    let formattedTime = booking.booking_time || '';
    let minutesUntilStart = 0;
    let nextWeekFormatted = '';

    if (booking.booking_date && booking.booking_time) {
        try {
            const timePart = booking.booking_time.slice(0, 5);
            const scheduledDateTime = new Date(`${booking.booking_date}T${timePart}:00`);
            const baseDate = new Date(booking.booking_date + 'T00:00:00');
            formattedDate = baseDate.toLocaleDateString('pt-BR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
            });

            // Cálculo para Reagendamento da Próxima Semana
            const nextWeekDate = new Date(baseDate);
            nextWeekDate.setDate(nextWeekDate.getDate() + 7);
            nextWeekFormatted = nextWeekDate.toLocaleDateString('pt-BR', {
                weekday: 'long', day: '2-digit', month: 'long'
            });

            const diffMs = scheduledDateTime.getTime() - currentTime.getTime();
            minutesUntilStart = Math.round(diffMs / 60000);
            
            // Liberado apenas a partir de T-10 minutos para pacientes (profissional entra a qualquer momento)
            if (minutesUntilStart > 10 && !isReady && !isStaffViewer) {
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
                                {!isStaffViewer && (
                                    <Button onClick={() => setShowReviewModal(true)} className="bg-[#2d8659] hover:bg-[#236b47] mr-3">
                                        Avaliar & Reagendar
                                    </Button>
                                )}
                                <Button
                                    onClick={() => navigate(isStaffViewer ? '/profissional' : '/paciente')}
                                    variant="outline"
                                    className="border-gray-300"
                                >
                                    Voltar ao Painel
                                </Button>
                            </motion.div>
                        ) : isStaffViewer ? (
                            /* Visão do Profissional (Anfitrião da Sala) */
                            <motion.div
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-emerald-50 rounded-xl p-8 border border-emerald-100"
                            >
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Video className="w-8 h-8" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                    Sala pronta para iniciar
                                </h2>
                                <p className="text-gray-600 mb-6 text-sm">
                                    Paciente: <strong>{booking.patient_name || 'Paciente'}</strong>. Ao clicar abaixo, você entrará como anfitrião e o paciente será liberado automaticamente na sala de espera.
                                </p>
                                <Button
                                    disabled={joining}
                                    className="w-full h-14 text-lg bg-[#2d8659] hover:bg-[#236b47] shadow-lg hover:shadow-xl transition-all"
                                    onClick={handleJoinConsultation}
                                >
                                    {joining ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Abrindo Sala Segura...
                                        </>
                                    ) : (
                                        "Iniciar Atendimento Agora"
                                    )}
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
                                <p className="text-gray-600 mb-8">Sua sala de teleconsulta já está pronta e liberada para entrada.</p>
                                
                                <Button 
                                    disabled={joining}
                                    className="w-full h-14 text-lg bg-[#2d8659] hover:bg-[#236b47] shadow-lg hover:shadow-xl transition-all"
                                    onClick={handleJoinConsultation}
                                >
                                    {joining ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Conectando à Sala Segura...
                                        </>
                                    ) : (
                                        "Entrar na Consulta Agora"
                                    )}
                                </Button>
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
                                            disabled={joining}
                                            className="text-[#2d8659] border-[#2d8659] hover:bg-emerald-50 text-sm h-10 px-6 font-medium"
                                            onClick={handleJoinConsultation}
                                        >
                                            {joining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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

            {/* ── MODAL DE RETENÇÃO & AVALIAÇÃO PÓS-CONSULTA (FASE 2) ── */}
            <AnimatePresence>
                {showReviewModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-gray-100"
                        >
                            {!reviewSubmitted ? (
                                <>
                                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Heart className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">Como foi seu atendimento?</h3>
                                    <p className="text-xs text-gray-500 mb-6">Sua avaliação é confidencial e nos ajuda a manter a excelência clínica.</p>

                                    {/* Estrelas */}
                                    <div className="flex justify-center gap-2 mb-6">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                className="p-1 transition-transform hover:scale-125 focus:outline-none"
                                            >
                                                <Star className={`w-8 h-8 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                                            </button>
                                        ))}
                                    </div>

                                    <textarea
                                        value={feedbackComment}
                                        onChange={(e) => setFeedbackComment(e.target.value)}
                                        placeholder="Deixe uma mensagem para o profissional ou sobre a experiência (opcional)..."
                                        className="w-full text-xs p-3 border border-gray-200 rounded-xl mb-6 focus:ring-2 focus:ring-[#2d8659] focus:outline-none resize-none"
                                        rows={3}
                                    />

                                    <Button
                                        onClick={handleSendReview}
                                        disabled={submittingReview}
                                        className="w-full bg-[#2d8659] hover:bg-[#236b47] h-11 text-sm font-semibold mb-3"
                                    >
                                        {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Enviar Avaliação"}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Obrigado pelo feedback!</h3>
                                    
                                    {/* Funil de Reagendamento 1-Clique */}
                                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4 my-6 text-left">
                                        <p className="text-xs font-semibold text-emerald-900 mb-1">🌱 Mantenha a continuidade do seu cuidado</p>
                                        <p className="text-xs text-emerald-700 mb-3">
                                            A psicoterapia semanal potencializa seus resultados. Deseja já reservar seu horário para a próxima semana?
                                        </p>
                                        <Button
                                            onClick={() => navigate(`/agendamento?professional=${booking.professional_id}`)}
                                            className="w-full bg-[#2d8659] hover:bg-[#236b47] text-xs h-10 font-medium flex items-center justify-center gap-1 shadow-sm"
                                        >
                                            <span>Agendar para {nextWeekFormatted}</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>

                                    <Button
                                        variant="outline"
                                        onClick={() => navigate('/paciente')}
                                        className="w-full text-xs h-10 border-gray-300"
                                    >
                                        Voltar à Área do Paciente
                                    </Button>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default SalaEsperaPage;
