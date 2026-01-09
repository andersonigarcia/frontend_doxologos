import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CheckCircle, Heart, Calendar, Shield, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import emailService from '@/lib/emailService';
import { useLeadTracking } from '@/hooks/useLeadTracking';
import { generateChecklistEmail } from '@/lib/emailTemplates/checklistEmail';
import HomeHeader from '@/components/home/HomeHeader';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const anxietyVideos = [
    {
        id: 3,
        videoId: 'yfht3LsQkbY',
        title: 'Superando Ansiedade com Propósito',
        description: 'Estratégias cristãs para lidar com a ansiedade'
    }
];

const anxietyFaqs = [
    {
        question: 'A ansiedade é pecado?',
        answer: 'Não, ansiedade não é pecado. É uma resposta natural do corpo a situações de estresse. A Bíblia reconhece a ansiedade humana e nos convida a entregar nossas preocupações a Deus (Filipenses 4:6-7). A terapia ajuda você a desenvolver ferramentas práticas para lidar com a ansiedade de forma saudável.'
    },
    {
        question: 'Como a terapia cristã pode ajudar com ansiedade?',
        answer: 'A terapia cristã combina técnicas comprovadas da psicologia (como TCC) com princípios bíblicos. Você aprenderá estratégias práticas para controlar pensamentos ansiosos, enquanto fortalece sua fé e confiança em Deus. É um cuidado integral: corpo, mente e espírito.'
    },
    {
        question: 'Quanto tempo leva para ver resultados?',
        answer: 'Muitos pacientes relatam melhora já nas primeiras sessões. Técnicas de respiração e reestruturação cognitiva podem trazer alívio imediato. Para mudanças mais profundas e duradouras, geralmente recomendamos um processo de 8-12 sessões, mas cada pessoa é única.'
    },
    {
        question: 'Preciso tomar medicação?',
        answer: 'Não necessariamente. Muitos casos de ansiedade respondem bem apenas à terapia. Se necessário, o psicólogo pode sugerir avaliação com psiquiatra para medicação complementar. Na Doxologos, focamos primeiro em técnicas terapêuticas e mudanças de estilo de vida.'
    }
];

const AnsiedadePage = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { toast } = useToast();
    const { user, userRole, signOut } = useAuth();
    const { trackLandingPageView, trackLandingPageCTA, trackLeadMagnetSubmit } = useLeadTracking();

    useEffect(() => {
        trackLandingPageView('ansiedade');
    }, [trackLandingPageView]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await trackLeadMagnetSubmit('anxiety_guide_landing', { email, name });

            const emailHtml = generateChecklistEmail(name);
            await emailService.sendEmail({
                to: email,
                subject: '🎁 Seu Guia: Como Controlar a Ansiedade',
                html: emailHtml,
                type: 'lead_magnet'
            });

            setSuccess(true);
            toast({
                title: '✅ Guia enviado!',
                description: 'Verifique seu email.'
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Erro ao enviar',
                description: 'Tente novamente.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCTAClick = (ctaType) => {
        trackLandingPageCTA(ctaType, 'ansiedade');
    };

    return (
        <>
            <Helmet>
                <title>Terapia para Ansiedade Online | Psicólogo Cristão | Doxologos</title>
                <meta
                    name="description"
                    content="Supere a ansiedade com terapia online cristã. Psicólogos qualificados que integram fé e ciência. Atendimento 100% online. Agende sua primeira consulta."
                />
                <meta name="keywords" content="terapia ansiedade, psicólogo cristão ansiedade, terapia online ansiedade, tratamento ansiedade cristão" />
                <link rel="canonical" href="https://doxologos.com.br/ansiedade" />

                {/* Open Graph */}
                <meta property="og:title" content="Terapia para Ansiedade Online | Psicólogo Cristão" />
                <meta property="og:description" content="Supere a ansiedade com terapia online cristã. Atendimento 100% online com psicólogos qualificados." />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://doxologos.com.br/ansiedade" />

                {/* Schema Markup */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'MedicalWebPage',
                        name: 'Terapia para Ansiedade Online',
                        description: 'Tratamento para ansiedade com psicólogos cristãos online',
                        specialty: 'Psychology',
                        about: {
                            '@type': 'MedicalCondition',
                            name: 'Anxiety Disorder'
                        }
                    })}
                </script>
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'FAQPage',
                        mainEntity: anxietyFaqs.map(faq => ({
                            '@type': 'Question',
                            name: faq.question,
                            acceptedAnswer: {
                                '@type': 'Answer',
                                text: faq.answer
                            }
                        }))
                    })}
                </script>
            </Helmet>

            <HomeHeader
                activeEventsCount={0}
                user={user}
                userRole={userRole}
                onLogout={signOut}
                mobileMenuOpen={false}
                onToggleMenu={() => { }}
            />

            <main className="pt-20">
                {/* Hero Section */}
                <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 py-16 md:py-24">
                    <div className="container mx-auto px-4">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6 }}
                            >
                                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6 leading-tight">
                                    Ansiedade Roubando Sua Paz? <span className="text-[#2d8659]">Encontre Alívio</span> com Terapia Cristã Online
                                </h1>
                                <p className="text-xl text-gray-600 mb-8">
                                    Psicólogos qualificados que integram fé e ciência para ajudar você a superar a ansiedade e recuperar sua tranquilidade.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                    <Button
                                        asChild
                                        size="lg"
                                        className="bg-[#2d8659] hover:bg-[#236b47] text-white font-semibold px-8 py-6 text-lg rounded-full shadow-lg"
                                        onClick={() => handleCTAClick('primary_cta')}
                                    >
                                        <Link to="/agendamento">
                                            <Calendar className="w-5 h-5 mr-2" />
                                            Agendar Primeira Consulta
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="border-2 border-[#2d8659] text-[#2d8659] hover:bg-green-50 font-semibold px-8 py-6 text-lg rounded-full"
                                        onClick={() => {
                                            handleCTAClick('guide_cta');
                                            document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                    >
                                        <Heart className="w-5 h-5 mr-2" />
                                        Baixar Guia Gratuito
                                    </Button>
                                </div>

                                {/* Trust Indicators */}
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-[#2d8659]">100%</div>
                                        <div className="text-sm text-gray-600">Online</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-[#2d8659]">CRP</div>
                                        <div className="text-sm text-gray-600">Registrados</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-[#2d8659]">500+</div>
                                        <div className="text-sm text-gray-600">Atendimentos</div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                                className="relative"
                            >
                                <img
                                    src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80"
                                    alt="Pessoa em paz após terapia para ansiedade"
                                    className="rounded-2xl shadow-2xl"
                                />
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Video Section */}
                {anxietyVideos.length > 0 && (
                    <section className="py-16 bg-white">
                        <div className="container mx-auto px-4">
                            <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
                                Vídeo: Superando a Ansiedade
                            </h2>
                            <div className="max-w-4xl mx-auto aspect-video rounded-xl overflow-hidden shadow-2xl">
                                <iframe
                                    src={`https://www.youtube.com/embed/${anxietyVideos[0].videoId}`}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    title={anxietyVideos[0].title}
                                />
                            </div>
                        </div>
                    </section>
                )}

                {/* Content Section */}
                <section className="py-16 bg-gray-50">
                    <div className="container mx-auto px-4 max-w-4xl">
                        <article className="prose prose-lg max-w-none">
                            <h2 className="text-3xl font-bold text-gray-800 mb-6">O Que É Ansiedade?</h2>
                            <p className="text-gray-700 leading-relaxed mb-6">
                                A ansiedade é uma resposta natural do corpo a situações de estresse ou perigo. No entanto, quando se torna excessiva,
                                persistente e interfere nas atividades diárias, pode se transformar em um transtorno que requer atenção profissional.
                            </p>

                            <h3 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Sintomas Comuns de Ansiedade</h3>
                            <ul className="space-y-3 mb-8">
                                {[
                                    'Preocupação excessiva e constante',
                                    'Dificuldade para relaxar ou desligar a mente',
                                    'Tensão muscular e dores no corpo',
                                    'Problemas para dormir (insônia ou sono agitado)',
                                    'Irritabilidade e impaciência',
                                    'Dificuldade de concentração',
                                    'Sintomas físicos: palpitações, sudorese, tremores',
                                    'Evitação de situações sociais ou profissionais'
                                ].map((symptom, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <CheckCircle className="w-6 h-6 text-[#2d8659] flex-shrink-0 mt-1" />
                                        <span className="text-gray-700">{symptom}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 my-8 rounded">
                                <p className="text-blue-900 font-medium">
                                    💡 <strong>Você sabia?</strong> Segundo a OMS, o Brasil é o país mais ansioso do mundo,
                                    com 9,3% da população sofrendo com transtornos de ansiedade.
                                </p>
                            </div>

                            <h3 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Como a Terapia Pode Ajudar</h3>
                            <p className="text-gray-700 leading-relaxed mb-6">
                                A terapia para ansiedade, especialmente a Terapia Cognitivo-Comportamental (TCC), é altamente eficaz.
                                Estudos mostram que 60-80% dos pacientes apresentam melhora significativa. Durante as sessões, você aprenderá:
                            </p>

                            <div className="grid md:grid-cols-2 gap-6 my-8">
                                {[
                                    { icon: Shield, title: 'Técnicas de Relaxamento', desc: 'Respiração, mindfulness e meditação cristã' },
                                    { icon: Users, title: 'Reestruturação Cognitiva', desc: 'Identificar e modificar pensamentos ansiosos' },
                                    { icon: Heart, title: 'Fortalecimento da Fé', desc: 'Integrar princípios bíblicos no processo terapêutico' },
                                    { icon: Clock, title: 'Gestão do Tempo', desc: 'Organizar prioridades e reduzir sobrecarga' }
                                ].map((item, index) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                                            <Icon className="w-10 h-10 text-[#2d8659] mb-3" />
                                            <h4 className="font-bold text-gray-800 mb-2">{item.title}</h4>
                                            <p className="text-gray-600 text-sm">{item.desc}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <h3 className="text-2xl font-bold text-gray-800 mb-4 mt-8">O Diferencial da Abordagem Cristã</h3>
                            <p className="text-gray-700 leading-relaxed mb-6">
                                Na Doxologos, nossos psicólogos cristãos oferecem um cuidado integral que respeita sua espiritualidade.
                                Combinamos técnicas científicas comprovadas com princípios bíblicos de confiança, esperança e paz em Deus.
                            </p>

                            <blockquote className="border-l-4 border-[#2d8659] pl-6 py-4 my-8 bg-green-50 rounded-r-lg">
                                <p className="text-gray-700 italic mb-2">
                                    "Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas, diante de Deus,
                                    as vossas petições, pela oração e pela súplica, com ações de graças."
                                </p>
                                <cite className="text-gray-600 text-sm">— Filipenses 4:6-7</cite>
                            </blockquote>
                        </article>

                        {/* CTA Mid-Content */}
                        <div className="bg-gradient-to-br from-[#2d8659] to-[#1f5d3d] rounded-2xl p-8 text-center text-white my-12">
                            <h3 className="text-2xl font-bold mb-4">Pronto para Dar o Primeiro Passo?</h3>
                            <p className="mb-6 text-green-50">
                                Agende sua primeira consulta e comece sua jornada rumo à paz interior
                            </p>
                            <Button
                                asChild
                                size="lg"
                                className="bg-white text-[#2d8659] hover:bg-gray-100 font-semibold px-8 py-6 text-lg rounded-full"
                                onClick={() => handleCTAClick('mid_content_cta')}
                            >
                                <Link to="/agendamento">Agendar Agora</Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="py-16 bg-white">
                    <div className="container mx-auto px-4 max-w-4xl">
                        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Perguntas Frequentes</h2>
                        <div className="space-y-6">
                            {anxietyFaqs.map((faq, index) => (
                                <details key={index} className="bg-gray-50 rounded-lg p-6 group">
                                    <summary className="font-bold text-gray-800 cursor-pointer list-none flex justify-between items-center">
                                        {faq.question}
                                        <span className="text-[#2d8659] group-open:rotate-180 transition-transform">▼</span>
                                    </summary>
                                    <p className="text-gray-700 mt-4 leading-relaxed">{faq.answer}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Lead Form Section */}
                <section id="lead-form" className="py-16 bg-gradient-to-br from-green-50 to-blue-50">
                    <div className="container mx-auto px-4 max-w-2xl">
                        <div className="bg-white rounded-2xl shadow-2xl p-8">
                            {!success ? (
                                <>
                                    <div className="text-center mb-8">
                                        <Heart className="w-16 h-16 text-[#2d8659] mx-auto mb-4" />
                                        <h2 className="text-3xl font-bold text-gray-800 mb-4">
                                            Baixe Nosso Guia Gratuito
                                        </h2>
                                        <p className="text-gray-600">
                                            Receba por email técnicas práticas para controlar a ansiedade hoje mesmo
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <Input
                                            placeholder="Seu primeiro nome"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            className="bg-gray-50"
                                        />
                                        <Input
                                            type="email"
                                            placeholder="Seu melhor email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="bg-gray-50"
                                        />
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full bg-[#2d8659] hover:bg-[#236b47] text-white font-semibold py-6 text-lg"
                                        >
                                            {loading ? 'Enviando...' : 'Receber Guia Gratuito'}
                                        </Button>
                                    </form>
                                    <p className="text-xs text-center text-gray-400 mt-4">
                                        🔒 Seus dados estão seguros. Nada de spam.
                                    </p>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Guia Enviado! ✅</h3>
                                    <p className="text-gray-600 mb-6">Verifique seu email</p>
                                    <Button asChild className="bg-[#2d8659] hover:bg-[#236b47]">
                                        <Link to="/agendamento">Agendar Consulta</Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Testimonials */}
                <TestimonialsSection
                    testimonials={[]}
                    isLoading={false}
                    onLeaveTestimonial={() => { }}
                />
            </main>
        </>
    );
};

export default AnsiedadePage;
