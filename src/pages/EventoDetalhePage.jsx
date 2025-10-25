
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, User, Mail, Smartphone, ArrowLeft, Check, AlertTriangle, Heart } from 'lucide-react';

const EventoDetalhePage = () => {
    const { slug } = useParams();
    const { user, signIn } = useAuth();
    const { toast } = useToast();

    const [event, setEvent] = useState(null);
    const [inscricoesCount, setInscricoesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUserRegistered, setIsUserRegistered] = useState(false);
    
    const [step, setStep] = useState(1);
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [patientData, setPatientData] = useState({ name: '', email: '', phone: '' });

    useEffect(() => {
        const fetchEvent = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('eventos')
                .select('*')
                .eq('link_slug', slug)
                .single();

            if (error || !data) {
                setError('Evento não encontrado.');
                toast({ variant: 'destructive', title: 'Erro', description: 'Este evento não existe ou não está mais disponível.' });
            } else {
                // Buscar profissional separadamente se existe professional_id
                if (data.professional_id) {
                    const { data: professionalData } = await supabase
                        .from('professionals')
                        .select('name, specialty, image_url')
                        .eq('id', data.professional_id)
                        .single();
                    
                    data.professional = professionalData;
                }

                // Buscar contagem de inscrições
                const { count } = await supabase
                    .from('inscricoes_eventos')
                    .select('*', { count: 'exact' })
                    .eq('evento_id', data.id);

                setEvent(data);
                setInscricoesCount(count || 0);
            }
            setLoading(false);
        };
        fetchEvent();
    }, [slug, toast]);

    useEffect(() => {
        if (user && event) {
            setPatientData({ name: user.user_metadata?.name || '', email: user.email, phone: '' });
            const checkRegistration = async () => {
                const { data, error } = await supabase
                    .from('inscricoes_eventos')
                    .select('id')
                    .eq('evento_id', event.id)
                    .eq('user_id', user.id)
                    .single();
                
                if (data) {
                    setIsUserRegistered(true);
                }
            };
            checkRegistration();
        }
    }, [user, event]);
    
    const handleRegistration = async () => {
        if (!user) {
            toast({ variant: "destructive", title: "Faça login para se inscrever." });
            setStep(2); // Vai para a etapa de login/cadastro
            return;
        }

        const { data, error } = await supabase.from('inscricoes_eventos').insert([
            { evento_id: event.id, user_id: user.id, patient_name: patientData.name, patient_email: patientData.email, status_pagamento: 'pendente' }
        ]);

        if (error) {
            toast({ variant: "destructive", title: "Erro na inscrição", description: error.message });
        } else {
            setStep(3); // Vai para a confirmação
        }
    };

    if (loading) return <div className="flex justify-center items-center min-h-screen">Carregando evento...</div>;
    if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>;
    if (!event) return null;

    const vagasRestantes = event.limite_participantes - inscricoesCount;
    const isSoldOut = vagasRestantes <= 0;
    const isPastDeadline = new Date(event.data_limite_inscricao) < new Date();

    const renderContent = () => {
        if (step === 3) { // Confirmação
            return (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                    <Check className="w-16 h-16 mx-auto text-green-500 bg-green-100 rounded-full p-3 mb-4" />
                    <h2 className="text-3xl font-bold mb-4">Inscrição Recebida!</h2>
                    <p className="text-gray-600 mb-6">Sua inscrição está pendente de pagamento. Você receberá um e-mail com as instruções para confirmar sua vaga.</p>
                    <Link to="/"><Button className="bg-[#2d8659] hover:bg-[#236b47]">Voltar para a Página Inicial</Button></Link>
                </motion.div>
            );
        }

        if (step === 2 && !user) { // Formulário de Login
            return(
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h2 className="text-2xl font-bold mb-4">Faça login para continuar</h2>
                    <form onSubmit={async (e) => { e.preventDefault(); await signIn(loginData.email, loginData.password); }} className="space-y-4">
                        <input type="email" placeholder="Seu email" value={loginData.email} onChange={e => setLoginData({...loginData, email: e.target.value})} className="w-full input" required />
                        <input type="password" placeholder="Sua senha" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} className="w-full input" required />
                        <Button type="submit" className="w-full bg-[#2d8659] hover:bg-[#236b47]">Entrar</Button>
                        <p className="text-sm text-center">Não tem conta? <Button variant="link" onClick={() => toast({title: 'Função de cadastro em breve!'})}>Cadastre-se</Button></p>
                    </form>
                </motion.div>
            );
        }
        
        // Formulário de Inscrição (principal)
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="text-2xl font-bold mb-6">Confirme seus dados para inscrição</h2>
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium mb-1">Nome</label><div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg"><User className="w-5 h-5 text-gray-500"/><p>{patientData.name}</p></div></div>
                    <div><label className="block text-sm font-medium mb-1">Email</label><div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg"><Mail className="w-5 h-5 text-gray-500"/><p>{patientData.email}</p></div></div>
                </div>
                <div className="mt-8">
                    {isUserRegistered ? (
                         <div className="text-center p-4 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center gap-2"><Check className="w-5 h-5"/> Você já está inscrito neste evento.</div>
                    ) : isSoldOut || isPastDeadline ? (
                        <div className="text-center p-4 bg-red-100 text-red-800 rounded-lg flex items-center justify-center gap-2"><AlertTriangle className="w-5 h-5"/> Inscrições encerradas.</div>
                    ) : (
                        <Button onClick={handleRegistration} className="w-full bg-[#2d8659] hover:bg-[#236b47] text-lg py-6">Confirmar Inscrição e Ir para Pagamento</Button>
                    )}
                </div>
            </motion.div>
        );
    };

    return (
        <>
            <Helmet>
                <title>{event.titulo} - Doxologos</title>
                <meta name="description" content={event.descricao} />
            </Helmet>
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow-sm sticky top-0 z-20">
                    <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
                        <Link to="/" className="flex items-center space-x-2"><Heart className="w-8 h-8 text-[#2d8659]" /><span className="text-2xl font-bold gradient-text">Doxologos</span></Link>
                        <Link to="/"><Button variant="outline" className="border-[#2d8659] text-[#2d8659]"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button></Link>
                    </nav>
                </header>
                <main className="py-12 md:py-20">
                    <div className="container mx-auto px-4 max-w-6xl">
                        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
                            <div className="lg:col-span-3">
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                                    <span className="inline-block bg-[#2d8659]/10 text-[#2d8659] font-semibold px-3 py-1 rounded-full text-sm mb-4">{event.tipo_evento}</span>
                                    <h1 className="text-4xl md:text-5xl font-bold mb-6">{event.titulo}</h1>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-gray-600 mb-6">
                                        <div className="flex items-center"><Calendar className="w-5 h-5 mr-2 text-[#2d8659]" /> {new Date(event.data_inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                                        <div className="flex items-center"><Clock className="w-5 h-5 mr-2 text-[#2d8659]" /> {new Date(event.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(event.data_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                                        <div className="flex items-center"><Users className="w-5 h-5 mr-2 text-[#2d8659]" /> {vagasRestantes > 0 ? `${vagasRestantes} vagas restantes` : 'Vagas esgotadas'}</div>
                                    </div>
                                    <div className="prose max-w-none text-gray-700">
                                        <p>{event.descricao}</p>
                                    </div>

                                    {event.professional && (
                                        <div className="mt-10 pt-8 border-t">
                                            <h3 className="text-2xl font-bold mb-4">Ministrado por</h3>
                                            <div className="flex items-center gap-4">
                                                <img 
                                                    className="w-20 h-20 rounded-full object-cover" 
                                                    alt={`Foto de ${event.professional.name}`} 
                                                    src={event.professional.image_url || "https://images.unsplash.com/photo-1560439450-6b5a38bc9dd5?w=400&h=400&fit=crop&crop=face"} 
                                                />
                                                <div>
                                                    <h4 className="text-xl font-bold">{event.professional.name}</h4>
                                                    <p className="text-[#2d8659] font-semibold">{event.professional.specialty}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                            <div className="lg:col-span-2">
                                <div className="sticky top-28 bg-white rounded-xl shadow-lg p-8">
                                    {renderContent()}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default EventoDetalhePage;
