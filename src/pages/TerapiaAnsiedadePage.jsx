import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { usePageTracking, useEventTracking } from '@/hooks/useAnalytics';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import HomeHeader from '@/components/home/HomeHeader';
import { Calendar, CheckCircle, Brain, Heart, ArrowRight } from 'lucide-react';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';
import SiteFooter from '@/components/common/SiteFooter';

const TerapiaAnsiedadePage = () => {
  const { user, userRole, signOut } = useAuth();
  usePageTracking('/terapia/ansiedade', 'Terapia para Ansiedade | Doxologos');
  const trackEvent = useEventTracking();

  const handleCtaClick = () => {
    trackEvent('generate_lead', {
      event_category: 'Conversion',
      event_label: 'agendar_consulta',
      traffic_type: 'seo_landing',
      service_type: 'terapia_ansiedade'
    });
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Terapia para Ansiedade Online | Psicologia Cristã | Doxologos</title>
        <meta name="description" content="Sente ansiedade constante? Descubra como a terapia online baseada na psicologia clínica e nos princípios cristãos pode te ajudar a encontrar paz. Agende agora." />
        <link rel="canonical" href="https://doxologos.com.br/terapia/ansiedade" />
        <meta property="og:title" content="Terapia para Ansiedade Online | Psicologia Cristã | Doxologos" />
        <meta property="og:description" content="Sente ansiedade constante? Descubra como a terapia online baseada na psicologia clínica e nos princípios cristãos pode te ajudar a encontrar paz." />
        <meta property="og:url" content="https://doxologos.com.br/terapia/ansiedade" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            "name": "Terapia para Ansiedade Online",
            "description": "Tratamento psicológico online para ansiedade com integração da fé cristã.",
            "provider": {
              "@type": "MedicalClinic",
              "name": "Doxologos"
            },
            "about": {
              "@type": "MedicalCondition",
              "name": "Ansiedade"
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
        {/* Hero Section */}
        <section className="bg-[#1b3c37] text-white py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 leading-tight">
              Terapia para Ansiedade: Encontre a Paz que Você Procura
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-[#f0ebe1] max-w-3xl mx-auto">
              Aprenda a lidar com a ansiedade integrando ciência psicológica de ponta com a sabedoria e acolhimento da fé cristã.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/agendamento" onClick={handleCtaClick} className="bg-[#2d8659] hover:bg-[#236b46] text-white px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center">
                <Calendar className="w-5 h-5 mr-2" />
                Agendar Consulta
              </Link>
              <Link to="/teste-ansiedade" className="bg-white text-[#1b3c37] hover:bg-gray-100 px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center">
                Fazer Teste Grátis de Ansiedade
              </Link>
            </div>
          </div>
        </section>

        {/* Problema Section */}
        <section className="py-16 px-4 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">A ansiedade está roubando sua paz?</h2>
              <p className="text-lg text-gray-700 mb-4">
                Preocupações constantes, coração acelerado, medo do futuro e noites sem dormir. A ansiedade pode paralisar sua vida e te afastar do propósito de Deus para você.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                Muitos cristãos sofrem em silêncio, achando que sentir ansiedade é falta de fé. Mas a ansiedade é uma condição real que afeta o corpo, a mente e o espírito.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Dificuldade de focar no presente</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Sensação de esgotamento emocional</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Preocupação excessiva e medos irracionais</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative">
              <div className="absolute -top-6 -right-6 bg-yellow-400 text-yellow-900 font-bold px-4 py-2 rounded-lg shadow-md transform rotate-3">
                Não lute sozinho!
              </div>
              <h3 className="text-2xl font-bold text-[#1b3c37] mb-4">A Bíblia e a Ansiedade</h3>
              <p className="text-gray-600 italic border-l-4 border-[#2d8659] pl-4 mb-4">
                "Não andem ansiosos por coisa alguma, mas em tudo, pela oração e súplicas, e com ação de graças, apresentem seus pedidos a Deus." <br/><span className="font-bold">- Filipenses 4:6</span>
              </p>
              <p className="text-gray-700">
                Deus nos convida a entregar nossas ansiedades a Ele. A terapia é um instrumento de cuidado divino para te ajudar a processar essas emoções e encontrar ferramentas práticas para o dia a dia.
              </p>
            </div>
          </div>
        </section>

        {/* Como Ajudamos */}
        <section className="bg-[#f0ebe1] py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-[#1b3c37] mb-12">Como a Terapia Doxologos Funciona</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Abordagem Científica</h3>
                <p className="text-gray-600">
                  Utilizamos ferramentas baseadas em evidências, como a Terapia Cognitivo-Comportamental (TCC), para identificar gatilhos e mudar padrões de pensamento.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Visão Cristã</h3>
                <p className="text-gray-600">
                  O tratamento respeita e integra sua fé. Compreendemos o ser humano de forma integral: corpo, alma e espírito.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Online e Seguro</h3>
                <p className="text-gray-600">
                  Faça terapia no conforto da sua casa, através de uma plataforma segura e sigilosa, de qualquer lugar do Brasil ou do mundo.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action Final */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto bg-[#1b3c37] rounded-3xl p-10 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Dê o primeiro passo para retomar o controle</h2>
              <p className="text-xl text-[#f0ebe1] mb-8">
                Nossos psicólogos especialistas estão prontos para te acolher. Escolha o melhor horário e comece sua jornada de cura.
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

      <FloatingWhatsAppButton phoneNumber="5531971982947" message="Olá! Gostaria de saber mais sobre a terapia online para ansiedade." />
    </div>
  );
};

export default TerapiaAnsiedadePage;
