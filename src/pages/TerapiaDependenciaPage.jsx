import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import HomeHeader from '@/components/home/HomeHeader';
import { Calendar, CheckCircle, Brain, Heart, ArrowRight } from 'lucide-react';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';
import SiteFooter from '@/components/common/SiteFooter';

const TerapiaDependenciaPage = () => {
  const { user, userRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Terapia para Dependência Emocional e Autoestima | Doxologos</title>
        <meta name="description" content="Preso em relações abusivas ou com dificuldade de impor limites? Aprenda a reconstruir sua autoestima e independência emocional com ajuda psicológica e princípios cristãos." />
        <link rel="canonical" href="https://doxologos.com.br/terapia/dependencia-emocional" />
        <meta property="og:title" content="Terapia para Dependência Emocional e Autoestima | Doxologos" />
        <meta property="og:description" content="Preso em relações abusivas ou com dificuldade de impor limites? Aprenda a reconstruir sua autoestima e independência emocional com ajuda psicológica e princípios cristãos." />
        <meta property="og:url" content="https://doxologos.com.br/terapia/dependencia-emocional" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            "name": "Terapia para Dependência Emocional e Autoestima",
            "description": "Tratamento focado na superação da dependência emocional, relações abusivas e fortalecimento da autoestima.",
            "provider": {
              "@type": "MedicalClinic",
              "name": "Doxologos"
            },
            "about": {
              "@type": "Thing",
              "name": "Dependência Emocional"
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
              Supere a Dependência Emocional e Resgate sua Identidade
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-[#f0ebe1] max-w-3xl mx-auto">
              Quebre o ciclo de relações tóxicas e aprenda a estabelecer limites com assertividade. Descubra o seu verdadeiro valor através da psicologia clínica e da fé cristã.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/agendamento" className="bg-[#2d8659] hover:bg-[#236b46] text-white px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center">
                <Calendar className="w-5 h-5 mr-2" />
                Agendar Consulta
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Por que você aceita menos do que merece?</h2>
              <p className="text-lg text-gray-700 mb-4">
                A dependência emocional faz com que o medo do abandono dite as suas escolhas. Isso leva a relações onde você se anula, tem dificuldade em dizer "não" e suporta comportamentos abusivos acreditando que é amor.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                Na tentativa de agradar a todos, você perde a si mesmo. A terapia oferece ferramentas práticas para que você pare de mendigar afeto e comece a nutrir uma autoestima sólida e inegociável.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Dificuldade crônica de estabelecer limites e dizer "não"</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Atração por parceiros indisponíveis ou narcisistas</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Insegurança profunda e medo irracional do abandono</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative">
              <div className="absolute -top-6 -right-6 bg-yellow-400 text-yellow-900 font-bold px-4 py-2 rounded-lg shadow-md transform rotate-3">
                Ame-se!
              </div>
              <h3 className="text-2xl font-bold text-[#1b3c37] mb-4">Sua Identidade em Deus</h3>
              <p className="text-gray-600 italic border-l-4 border-[#2d8659] pl-4 mb-4">
                "Pois vocês foram comprados por alto preço. Portanto, glorifiquem a Deus com o seu próprio corpo." <br/><span className="font-bold">- 1 Coríntios 6:20</span>
              </p>
              <p className="text-gray-700">
                Você tem um valor inestimável. A terapia te auxilia a deslocar a fonte da sua validação: do outro, para Cristo. Ensinamos como o amor próprio não é egoísmo, mas o cuidado responsável por aquilo que Deus criou.
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
                <h3 className="text-xl font-bold mb-3 text-gray-900">Compreensão de Padrões</h3>
                <p className="text-gray-600">
                  Identificamos padrões de apego formados na infância que estão se repetindo destrutivamente nos seus relacionamentos atuais.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Treinamento Assertivo</h3>
                <p className="text-gray-600">
                  Aprenda a comunicar suas necessidades de forma clara, sem agressividade, e desenvolva tolerância à frustração do outro.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Processo Seguro</h3>
                <p className="text-gray-600">
                  Se você estiver tentando sair de um relacionamento abusivo, o terapeuta será um ponto de ancoragem e suporte ao longo desse doloroso processo.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto bg-[#1b3c37] rounded-3xl p-10 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Você não precisa mendigar amor</h2>
              <p className="text-xl text-[#f0ebe1] mb-8">
                Agende sua sessão hoje e inicie o processo de autodescoberta e libertação emocional.
              </p>
              <Link to="/agendamento" className="inline-flex bg-yellow-500 hover:bg-yellow-400 text-yellow-950 px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 items-center">
                Ver Psicólogos Disponíveis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <FloatingWhatsAppButton phoneNumber="5531971982947" message="Olá! Gostaria de saber mais sobre a terapia para dependência emocional e autoestima." />
    </div>
  );
};

export default TerapiaDependenciaPage;
