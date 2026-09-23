import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { usePageTracking, useEventTracking } from '@/hooks/useAnalytics';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import HomeHeader from '@/components/home/HomeHeader';
import { Calendar, CheckCircle, Brain, Heart, ArrowRight } from 'lucide-react';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';
import SiteFooter from '@/components/common/SiteFooter';

const TerapiaAbusoEspiritualPage = () => {
  const { user, userRole, signOut } = useAuth();
  usePageTracking('/terapia/abuso-espiritual', 'Terapia para Abuso Espiritual | Doxologos');
  const trackEvent = useEventTracking();

  const handleCtaClick = () => {
    trackEvent('generate_lead', {
      event_category: 'Conversion',
      event_label: 'agendar_consulta',
      traffic_type: 'seo_landing',
      service_type: 'terapia_abuso_espiritual'
    });
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Terapia para Violência Eclesiástica e Abuso Espiritual | Doxologos</title>
        <meta name="description" content="Sofreu feridas em ambientes religiosos? Oferecemos um espaço seguro para processar a dor do abuso espiritual e reconstruir sua fé e saúde mental sem julgamentos." />
        <link rel="canonical" href="https://doxologos.com.br/terapia/abuso-espiritual" />
        <meta property="og:title" content="Terapia para Abuso Espiritual | Doxologos" />
        <meta property="og:description" content="Sofreu feridas em ambientes religiosos? Oferecemos um espaço seguro para processar a dor do abuso espiritual e reconstruir sua saúde mental sem julgamentos." />
        <meta property="og:url" content="https://doxologos.com.br/terapia/abuso-espiritual" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            "name": "Terapia para Violência Eclesiástica e Abuso Espiritual",
            "description": "Tratamento focado na superação de traumas religiosos, violência eclesiástica e abuso espiritual.",
            "provider": {
              "@type": "MedicalClinic",
              "name": "Doxologos"
            },
            "about": {
              "@type": "Thing",
              "name": "Abuso Espiritual e Trauma Religioso"
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
              Curando Feridas Causadas pela Religião
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-[#f0ebe1] max-w-3xl mx-auto">
              O abuso espiritual deixa marcas profundas. Na Doxologos, oferecemos um refúgio seguro e ético para processar suas dores sem que a sua experiência seja invalidada ou justificada com "versículos".
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/agendamento" onClick={handleCtaClick} className="bg-[#2d8659] hover:bg-[#236b46] text-white px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center">
                <Calendar className="w-5 h-5 mr-2" />
                Agendar Consulta Segura
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">A Igreja feriu você?</h2>
              <p className="text-lg text-gray-700 mb-4">
                Quando a fonte de dor vem do lugar que deveria ser o seu maior porto seguro, o trauma é devastador. Manipulação através da culpa, controle coercitivo da sua vida pessoal e lideranças narcisistas adoecem a alma.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                Buscar terapia secular após um trauma religioso pode ser difícil se o profissional enxergar a sua fé em si como o problema. Nós compreendemos a complexidade de separar a "instituição tóxica" da sua fé em Deus.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Traumas devido à disciplina eclesiástica abusiva ou ostracismo</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Dificuldade em confiar em autoridades ou ler a Bíblia sem gatilhos</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Sentimento crônico de culpa manipulada religiosamente</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative">
              <div className="absolute -top-6 -right-6 bg-yellow-400 text-yellow-900 font-bold px-4 py-2 rounded-lg shadow-md transform rotate-3">
                Não foi sua culpa
              </div>
              <h3 className="text-2xl font-bold text-[#1b3c37] mb-4">O Bom Pastor</h3>
              <p className="text-gray-600 italic border-l-4 border-[#2d8659] pl-4 mb-4">
                "Ai dos pastores de Israel que só cuidam de si mesmos! [...] Vocês não fortaleceram a fraca nem curaram a doente, nem enfaixaram a ferida." <br/><span className="font-bold">- Ezequiel 34:2,4</span>
              </p>
              <p className="text-gray-700">
                Deus repudia o abuso cometido em Seu nome. Nosso objetivo não é forçar um retorno precipitado a comunidades ou encobrir erros de lideranças, mas ajudar você a organizar os fragmentos da sua psique e reencontrar a paz.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#f0ebe1] py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-[#1b3c37] mb-12">Por que somos o lugar certo para isso?</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Abordagem de Trauma</h3>
                <p className="text-gray-600">
                  Validação completa da sua dor. Trabalhamos os sintomas de TEPT (Transtorno de Estresse Pós-Traumático) frequentemente associados ao abuso eclesiástico crônico.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Ética e Limites</h3>
                <p className="text-gray-600">
                  Na terapia, VOCÊ está no controle. Nós não somos líderes religiosos ditando o que você deve fazer. Somos profissionais de saúde guiando sua autonomia e restauração.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Desconstrução Saudável</h3>
                <p className="text-gray-600">
                  Ajudamos a separar as distorções patológicas ensinadas por instituições abusivas daquilo que é a genuína mensagem de graça e amor de Cristo.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto bg-[#1b3c37] rounded-3xl p-10 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Encontre cura num ambiente seguro</h2>
              <p className="text-xl text-[#f0ebe1] mb-8">
                Temos profissionais habilitados para lidar com a dor do trauma religioso sem invalidar sua espiritualidade.
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
      <FloatingWhatsAppButton phoneNumber="5531971982947" message="Olá! Gostaria de saber mais sobre a terapia para vítimas de abuso espiritual." />
    </div>
  );
};

export default TerapiaAbusoEspiritualPage;
