import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { usePageTracking, useEventTracking } from '@/hooks/useAnalytics';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import HomeHeader from '@/components/home/HomeHeader';
import { Calendar, CheckCircle, Brain, Heart, ArrowRight } from 'lucide-react';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';
import SiteFooter from '@/components/common/SiteFooter';

const TerapiaCasalPage = () => {
  const { user, userRole, signOut } = useAuth();
  usePageTracking('/terapia/casal', 'Terapia de Casal | Doxologos');
  const trackEvent = useEventTracking();

  const handleCtaClick = () => {
    trackEvent('generate_lead', {
      event_category: 'Conversion',
      event_label: 'agendar_consulta',
      traffic_type: 'seo_landing',
      service_type: 'terapia_casal'
    });
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Terapia de Casal Online | Psicologia Cristã | Doxologos</title>
        <meta name="description" content="Crises no casamento, dificuldades na comunicação ou esfriamento? A terapia de casal baseada na psicologia e princípios cristãos pode restaurar sua aliança." />
        <link rel="canonical" href="https://doxologos.com.br/terapia/casal" />
        <meta property="og:title" content="Terapia de Casal Online | Psicologia Cristã | Doxologos" />
        <meta property="og:description" content="Crises no casamento, dificuldades na comunicação ou esfriamento? A terapia de casal baseada na psicologia e princípios cristãos pode restaurar sua aliança." />
        <meta property="og:url" content="https://doxologos.com.br/terapia/casal" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            "name": "Terapia de Casal Online",
            "description": "Atendimento psicológico online para casais e restauração de relacionamentos.",
            "provider": {
              "@type": "MedicalClinic",
              "name": "Doxologos"
            },
            "about": {
              "@type": "Thing",
              "name": "Terapia de Casal e Terapia Relacional"
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
              Terapia de Casal: Restaure Sua Aliança
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-[#f0ebe1] max-w-3xl mx-auto">
              Volte a se conectar com quem você ama através de mediação profissional, ferramentas de comunicação e o alicerce sólido da fé cristã.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/agendamento" onClick={handleCtaClick} className="bg-[#2d8659] hover:bg-[#236b46] text-white px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center">
                <Calendar className="w-5 h-5 mr-2" />
                Agendar Consulta
              </Link>
              <Link to="/teste-casamento" className="bg-white text-[#1b3c37] hover:bg-gray-100 px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center">
                Teste de Conexão Conjugal
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Vocês se sentem distantes ou vivem brigando?</h2>
              <p className="text-lg text-gray-700 mb-4">
                O casamento é maravilhoso, mas pode ser extremamente desafiador. Falhas na comunicação, diferenças na criação dos filhos, rotina exaustiva, crises financeiras ou intimidade prejudicada podem afastar gradativamente o casal.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                Na Doxologos, acreditamos que o divórcio não precisa ser a primeira opção. Oferecemos intervenções psicológicas conjugais que promovem a escuta mútua, sem transformar o consultório em um "tribunal".
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Mediação neutra e sem apontamentos morais julgadores</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Ferramentas de reestruturação da comunicação efetiva</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Resgate da intimidade física e emocional</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative">
              <div className="absolute -top-6 -right-6 bg-yellow-400 text-yellow-900 font-bold px-4 py-2 rounded-lg shadow-md transform rotate-3">
                Invista na Aliança!
              </div>
              <h3 className="text-2xl font-bold text-[#1b3c37] mb-4">O Cordão de Três Dobras</h3>
              <p className="text-gray-600 italic border-l-4 border-[#2d8659] pl-4 mb-4">
                "Um homem sozinho pode ser vencido, mas dois conseguem defender-se. Um cordão de três dobras não se rompe com facilidade." <br/><span className="font-bold">- Eclesiastes 4:12</span>
              </p>
              <p className="text-gray-700">
                A terapia fornece as ferramentas práticas para que vocês possam se reaproximar, mas é o amor ancorado em Cristo que sustenta o perdão e o recomeço. Nós ajudamos vocês a ajustarem o foco de volta à essência do casamento.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#f0ebe1] py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-[#1b3c37] mb-12">Como a Terapia Funciona</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Treinamento de Habilidades</h3>
                <p className="text-gray-600">
                  Exercícios práticos para aprender a ouvir sem interromper, expressar necessidades sem acusar e negociar impasses.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Visão Bíblica Restauradora</h3>
                <p className="text-gray-600">
                  Nossa perspectiva sobre o casamento defende a complementaridade e o amor sacrificial, ancorando o trabalho clínico nos ensinos de Jesus.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Sessões Online</h3>
                <p className="text-gray-600">
                  Atendimento conjunto por vídeo. Em alguns momentos pontuais do tratamento, poderão haver breves encontros individuais estruturados.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto bg-[#1b3c37] rounded-3xl p-10 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Reconstruam sua história hoje</h2>
              <p className="text-xl text-[#f0ebe1] mb-8">
                Nunca é tarde para buscar ajuda e resgatar o amor que uniu vocês.
              </p>
              <Link to="/agendamento" onClick={handleCtaClick} className="inline-flex bg-yellow-500 hover:bg-yellow-400 text-yellow-950 px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 items-center">
                Ver Psicólogos de Casal
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

      <FloatingWhatsAppButton phoneNumber="5531971982947" message="Olá! Gostaria de saber mais sobre a terapia de casal." />
    </div>
  );
};

export default TerapiaCasalPage;
