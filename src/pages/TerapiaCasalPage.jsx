import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CheckCircle, Heart, Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import emailService from '@/lib/emailService';
import { useLeadTracking } from '@/hooks/useLeadTracking';
import HomeHeader from '@/components/home/HomeHeader';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const TerapiaCasalPage = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { toast } = useToast();
    const { user, userRole, signOut } = useAuth();
    const { trackLandingPageView, trackLandingPageCTA, trackLeadMagnetSubmit } = useLeadTracking();

    useEffect(() => {
        trackLandingPageView('terapia_casal');
    }, [trackLandingPageView]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await trackLeadMagnetSubmit('couple_therapy_landing', { email, name });

            await emailService.sendEmail({
                to: email,
                subject: '💑 Guia: Relacionamentos Saudáveis à Luz da Fé',
                html: `<p>Olá ${name}, seu guia está a caminho!</p>`,
                type: 'lead_magnet'
            });

            setSuccess(true);
            toast({ title: '✅ Guia enviado!', description: 'Verifique seu email.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Tente novamente.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Helmet>
                <title>Terapia de Casal Cristã Online | Doxologos</title>
                <meta name="description" content="Fortaleça seu relacionamento com terapia de casal cristã online. Psicólogos especializados em relacionamentos. Atendimento 100% online." />
                <link rel="canonical" href="https://doxologos.com.br/terapia-de-casal" />
            </Helmet>

            <HomeHeader user={user} userRole={userRole} onLogout={signOut} activeEventsCount={0} mobileMenuOpen={false} onToggleMenu={() => { }} />

            <main className="pt-20">
                {/* Hero */}
                <section className="bg-gradient-to-br from-pink-50 via-white to-purple-50 py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6 leading-tight">
                                    Fortaleça Seu Relacionamento com <span className="text-[#2d8659]">Terapia de Casal Cristã</span>
                                </h1>
                                <p className="text-xl text-gray-600 mb-8">
                                    Psicólogos especializados que ajudam casais a construir relacionamentos saudáveis baseados em amor, respeito e fé.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Button asChild size="lg" className="bg-[#2d8659] hover:bg-[#236b47] text-white font-semibold px-8 py-6 rounded-full">
                                        <Link to="/agendamento"><Calendar className="w-5 h-5 mr-2" />Agendar Consulta</Link>
                                    </Button>
                                </div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                                <img src="https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80" alt="Casal feliz" className="rounded-2xl shadow-2xl" />
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Content */}
                <section className="py-16 bg-white">
                    <div className="container mx-auto px-4 max-w-4xl">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">Como a Terapia de Casal Pode Ajudar</h2>
                        <p className="text-gray-700 mb-8">
                            A terapia de casal oferece um espaço seguro para vocês trabalharem juntos os desafios do relacionamento,
                            melhorarem a comunicação e fortalecerem o vínculo emocional e espiritual.
                        </p>

                        <div className="grid md:grid-cols-2 gap-6 mb-12">
                            {[
                                { icon: Users, title: 'Comunicação Efetiva', desc: 'Aprenda a se expressar e ouvir com empatia' },
                                { icon: Heart, title: 'Resolução de Conflitos', desc: 'Técnicas para lidar com desacordos de forma saudável' },
                                { icon: CheckCircle, title: 'Fortalecimento do Vínculo', desc: 'Reconecte-se emocionalmente e espiritualmente' },
                                { icon: Calendar, title: 'Planejamento Conjunto', desc: 'Alinhem objetivos e sonhos para o futuro' }
                            ].map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <div key={i} className="bg-gray-50 p-6 rounded-lg">
                                        <Icon className="w-10 h-10 text-[#2d8659] mb-3" />
                                        <h3 className="font-bold text-gray-800 mb-2">{item.title}</h3>
                                        <p className="text-gray-600 text-sm">{item.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Lead Form */}
                <section className="py-16 bg-gradient-to-br from-pink-50 to-purple-50">
                    <div className="container mx-auto px-4 max-w-2xl">
                        <div className="bg-white rounded-2xl shadow-2xl p-8">
                            {!success ? (
                                <>
                                    <div className="text-center mb-8">
                                        <Heart className="w-16 h-16 text-[#2d8659] mx-auto mb-4" />
                                        <h2 className="text-3xl font-bold text-gray-800 mb-4">Receba Nosso Guia Gratuito</h2>
                                        <p className="text-gray-600">E-book: Relacionamentos Saudáveis à Luz da Fé</p>
                                    </div>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
                                        <Input type="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                        <Button type="submit" disabled={loading} className="w-full bg-[#2d8659] hover:bg-[#236b47] py-6">
                                            {loading ? 'Enviando...' : 'Receber Guia Gratuito'}
                                        </Button>
                                    </form>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold mb-2">Guia Enviado! ✅</h3>
                                    <Button asChild className="bg-[#2d8659] mt-4"><Link to="/agendamento">Agendar Consulta</Link></Button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
};

export default TerapiaCasalPage;
