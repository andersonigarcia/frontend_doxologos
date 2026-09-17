import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Loader2, Video, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const SalaEsperaPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        if (!user || !id) return;
        
        const fetchBooking = async () => {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id, 
                    booking_date, 
                    booking_time, 
                    session_status,
                    meeting_link,
                    meeting_password,
                    professional:professionals(name, specialty, avatar_url)
                `)
                .eq('id', id)
                .eq('user_id', user.id)
                .single();
                
            if (error) {
                console.error("Erro ao carregar agendamento", error);
                setError("Não foi possível carregar as informações da sala.");
            } else if (!data) {
                setError("Agendamento não encontrado.");
            } else {
                setBooking(data);
            }
            setLoading(false);
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
    
    return (
        <>
            <Helmet><title>Sala de Espera - Doxologos</title></Helmet>
            <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center">
                <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="bg-[#2d8659] p-8 text-center text-white">
                        <Video className="w-12 h-12 mx-auto mb-4 opacity-80" />
                        <h1 className="text-3xl font-bold mb-2">Sala de Espera Virtual</h1>
                        <p className="text-emerald-100">Seu ambiente seguro para cuidado e transformação</p>
                    </div>
                    
                    <div className="p-8 text-center">
                        <div className="mb-8">
                            <h3 className="text-lg font-medium text-gray-500 mb-1">Sua sessão com</h3>
                            <p className="text-2xl font-bold text-gray-800">
                                {booking.professional?.[0]?.name || booking.professional?.name || 'Seu Psicólogo'}
                            </p>
                        </div>
                        
                        {isFinished ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8">
                                <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-gray-800 mb-2">Sessão Finalizada</h2>
                                <p className="text-gray-600 mb-6">Esta consulta já foi encerrada pelo profissional.</p>
                                <Button onClick={() => navigate('/paciente')} variant="outline" className="border-[#2d8659] text-[#2d8659]">
                                    Voltar ao Painel
                                </Button>
                            </motion.div>
                        ) : isReady ? (
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
                                        if (booking.meeting_link) {
                                            window.open(booking.meeting_link, '_blank');
                                        } else {
                                            alert("Link da reunião não encontrado.");
                                        }
                                    }}
                                >
                                    Entrar na Sala Agora
                                </Button>
                                
                                {booking.meeting_password && (
                                    <p className="mt-4 text-sm text-gray-500">
                                        Senha da sala: <span className="font-mono font-bold bg-gray-100 px-2 py-1 rounded">{booking.meeting_password}</span>
                                    </p>
                                )}
                            </motion.div>
                        ) : (
                            <div className="py-8">
                                <div className="relative w-24 h-24 mx-auto mb-6">
                                    {/* Spinner tailwind custom */}
                                    <svg className="animate-spin w-full h-full text-[#2d8659]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                                
                                <h2 className="text-xl font-bold text-gray-800 mb-3">Aguardando o Profissional</h2>
                                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                                    Por favor, aguarde nesta página. O botão de entrada aparecerá automaticamente assim que o psicólogo iniciar a sessão.
                                </p>
                                
                                <div className="bg-slate-50 p-4 rounded-lg text-sm text-gray-500 border border-slate-100 italic mb-8">
                                    "Aproveite este momento para respirar fundo, procurar um local silencioso e focar no seu bem-estar."
                                </div>
                                
                                <div className="mt-10 border-t border-gray-100 pt-6">
                                    <p className="text-xs text-gray-400 mb-2">O profissional passou mais de 5 minutos do horário e o botão não apareceu?</p>
                                    <Button 
                                        variant="ghost" 
                                        className="text-[#2d8659] hover:bg-emerald-50 text-sm h-8"
                                        onClick={() => {
                                            if (booking.meeting_link) {
                                                window.open(booking.meeting_link, '_blank');
                                            } else {
                                                alert("Link da reunião não disponível.");
                                            }
                                        }}
                                    >
                                        Forçar entrada na sala (Fallback)
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SalaEsperaPage;
