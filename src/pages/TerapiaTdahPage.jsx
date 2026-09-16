import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { usePageTracking, useEventTracking } from '@/hooks/useAnalytics';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import HomeHeader from '@/components/home/HomeHeader';
import { Calendar, CheckCircle, Brain, Heart, ArrowRight } from 'lucide-react';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';
import SiteFooter from '@/components/common/SiteFooter';

const TerapiaTdahPage = () => {
  const { user, userRole, signOut } = useAuth();
  usePageTracking('/terapia/tdah', 'Terapia para TDAH | Doxologos');
  const trackEvent = useEventTracking();

  const handleCtaClick = () => {
    trackEvent('generate_lead', {
      event_category: 'Conversion',
      event_label: 'agendar_consulta',
      traffic_type: 'seo_landing',
      service_type: 'terapia_tdah'
    });
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Terapia para TDAH em Adultos | Psicologia Cristã Online | Doxologos</title>
        <meta name="description" content="Descubra estratégias práticas e acolhimento clínico para lidar com TDAH na vida adulta. Psicólogos cristãos especialistas para te ajudar." />
        <link rel="canonical" href="https://doxologos.com.br/terapia/tdah" />
        <meta property="og:title" content="Terapia para TDAH em Adultos | Psicologia Cristã | Doxologos" />
        <meta property="og:description" content="Descubra estratégias práticas e acolhimento clínico para lidar com TDAH na vida adulta. Psicólogos cristãos especialistas para te ajudar." />
        <meta property="og:url" content="https://doxologos.com.br/terapia/tdah" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            "name": "Terapia para TDAH em Adultos",
            "description": "Tratamento psicológico e estratégias comportamentais para TDAH.",
            "provider": {
              "@type": "MedicalClinic",
              "name": "Doxologos"
            },
            "about": {
              "@type": "MedicalCondition",
              "name": "Transtorno do Déficit de Atenção com Hiperatividade"
            }
          })}
        </script>
      </Helmet>

      <HomeHeader
        activeEventsCount={0}
        user={user}
        userRole={userRole}
        onLogout={() => {
          signOut();
          setMobileMenuOpen(false);
        }}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      <main className="flex-grow pt-24 pb-16">
        <section className="bg-[#1b3c37] text-white py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 leading-tight">
              Terapia Especializada para TDAH em Adultos
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-[#f0ebe1] max-w-3xl mx-auto">
              Pare de lutar contra a sua mente. Aprenda ferramentas clínicas eficientes para organizar sua vida, ter mais foco e lidar com a neurodivergência através da Graça.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/agendamento" className="bg-[#2d8659] hover:bg-[#236b46] text-white px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center">
                <Calendar className="w-5 h-5 mr-2" />
                Agendar Consulta
              </Link>
              <Link to="/teste-tdah" className="bg-white text-[#1b3c37] hover:bg-gray-100 px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center">
                Avaliação de Sintomas (ASRS-18)
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Mente inquieta, dificuldade de foco e culpa?</h2>
              <p className="text-lg text-gray-700 mb-4">
                O TDAH na vida adulta geralmente se traduz em dificuldade crônica de manter o foco em tarefas não estimulantes, procrastinação intensa, impulsividade e desorganização.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                Muitas vezes isso gera um profundo sentimento de culpa e inadequação, inclusive na vida espiritual. Você não é "preguiçoso" ou "menos disciplinado", você funciona diferente.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Entenda a neurobiologia por trás dos sintomas</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Desenvolva habilidades executivas (organização, planejamento)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Aprenda a lidar com a paralisia e a procrastinação</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative">
              <div className="absolute -top-6 -right-6 bg-yellow-400 text-yellow-900 font-bold px-4 py-2 rounded-lg shadow-md transform rotate-3">
                Sem culpa!
              </div>
              <h3 className="text-2xl font-bold text-[#1b3c37] mb-4">Cuidado e Adaptação</h3>
              <p className="text-gray-600 italic border-l-4 border-[#2d8659] pl-4 mb-4">
                Deus nos criou com diversidade. Quando entendemos como nossa mente funciona, paramos de lutar contra nós mesmos e começamos a focar naquilo que fomos chamados para fazer.
              </p>
              <p className="text-gray-700">
                A terapia para o TDAH é altamente pragmática. Nós o ajudamos a construir as "próteses mentais" que facilitarão a sua rotina, o seu trabalho e a sua organização familiar e devocional.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#f0ebe1] py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-[#1b3c37] mb-12">Nossa Abordagem</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Ferramentas Práticas</h3>
                <p className="text-gray-600">
                  Uso da TCC e treinamento de funções executivas para ajudar você a dominar seu calendário, prazos e responsabilidades, reduzindo a ansiedade atrelada.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Acolhimento da Culpa</h3>
                <p className="text-gray-600">
                  Trabalhamos as feridas de anos sentindo-se inadequado, reestruturando a sua autoimagem baseada em Cristo, e não no seu desempenho funcional.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Orientação Contínua</h3>
                <p className="text-gray-600">
                  Um espaço de prestação de contas (accountability) com o terapeuta para auxiliar na manutenção dos seus objetivos de longo prazo.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto bg-[#1b3c37] rounded-3xl p-10 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Mude sua forma de agir no mundo</h2>
              <p className="text-xl text-[#f0ebe1] mb-8">
                Agende com um psicólogo especialista e dê o primeiro passo para uma mente mais organizada e pacífica.
              </p>
              <Link to="/agendamento" onClick={handleCtaClick} className="inline-flex bg-yellow-500 hover:bg-yellow-400 text-yellow-950 px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 items-center">
                Ver Psicólogos Disponíveis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <FloatingWhatsAppButton phoneNumber="5531971982947" message="Olá! Gostaria de saber mais sobre a terapia para TDAH em adultos." />
    </div>
  );
};

export default TerapiaTdahPage;
