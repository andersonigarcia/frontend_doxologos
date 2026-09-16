import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import HomeHeader from '@/components/home/HomeHeader';
import { Calendar, CheckCircle, Brain, Heart, ArrowRight } from 'lucide-react';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';
import SiteFooter from '@/components/common/SiteFooter';

const TerapiaBurnoutPage = () => {
  const { user, userRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Terapia para Burnout e Esgotamento | Psicologia Cristã Online</title>
        <meta name="description" content="Sofrendo com esgotamento físico, mental ou ministerial? Descubra como a terapia para Burnout pode restaurar sua saúde emocional e seu propósito de vida." />
        <link rel="canonical" href="https://doxologos.com.br/terapia/burnout" />
        <meta property="og:title" content="Terapia para Burnout e Esgotamento | Psicologia Cristã Online" />
        <meta property="og:description" content="Sofrendo com esgotamento físico, mental ou ministerial? Descubra como a terapia pode restaurar sua saúde emocional e seu propósito." />
        <meta property="og:url" content="https://doxologos.com.br/terapia/burnout" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            "name": "Terapia para Burnout e Esgotamento",
            "description": "Tratamento psicológico para Síndrome de Burnout, estresse crônico e sobrecarga emocional.",
            "provider": {
              "@type": "MedicalClinic",
              "name": "Doxologos"
            },
            "about": {
              "@type": "MedicalCondition",
              "name": "Síndrome de Burnout"
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
              Terapia para Burnout: Resgate sua Saúde Emocional
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-[#f0ebe1] max-w-3xl mx-auto">
              Quando a produtividade cobra o preço da sua paz. Encontre ajuda clínica e acolhimento ético para lidar com o esgotamento profissional ou ministerial.
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
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Exausto, cínico e sem energia?</h2>
              <p className="text-lg text-gray-700 mb-4">
                O Burnout não é apenas "cansaço", é uma síndrome de esgotamento crônico que afeta sua capacidade de trabalhar, de se relacionar e até de orar.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                Na sociedade atual, muitas vezes glorificamos o excesso de trabalho. No ambiente cristão, a sobrecarga ministerial frequentemente leva líderes ao limite, mascarada sob a "dedicação exclusiva".
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Dificuldade em impor limites saudáveis</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Sentimento de despersonalização e irritabilidade</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Queda brusca na sensação de realização pessoal</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative">
              <div className="absolute -top-6 -right-6 bg-yellow-400 text-yellow-900 font-bold px-4 py-2 rounded-lg shadow-md transform rotate-3">
                Descanso é divino!
              </div>
              <h3 className="text-2xl font-bold text-[#1b3c37] mb-4">O Princípio do Sabbath</h3>
              <p className="text-gray-600 italic border-l-4 border-[#2d8659] pl-4 mb-4">
                "Venham a mim, todos os que estão cansados e sobrecarregados, e eu darei descanso a vocês." <br/><span className="font-bold">- Mateus 11:28</span>
              </p>
              <p className="text-gray-700">
                O Deus que trabalha é também o Deus que descansa. A terapia te ajuda a quebrar o ciclo da culpa por não ser "produtivo o tempo todo" e estabelece rotinas que honram os limites do seu corpo e da sua mente.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#f0ebe1] py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-[#1b3c37] mb-12">Como a Terapia Doxologos Funciona</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Reestruturação Cognitiva</h3>
                <p className="text-gray-600">
                  Desconstrução de crenças centrais sobre performance, autoexigência e necessidade excessiva de controle e aprovação.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Regulação Emocional</h3>
                <p className="text-gray-600">
                  Técnicas de manejo de estresse crônico para baixar os níveis de cortisol e devolver a capacidade de sentir prazer na rotina.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Online e Sigiloso</h3>
                <p className="text-gray-600">
                  Acolhimento absoluto e sem julgamentos, feito de onde você estiver, respeitando o seu tempo de recuperação.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto bg-[#1b3c37] rounded-3xl p-10 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Chegou a hora de cuidar de quem cuida</h2>
              <p className="text-xl text-[#f0ebe1] mb-8">
                Agende sua consulta e inicie um processo de restauração sustentável para a sua vida e ministério.
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
      <FloatingWhatsAppButton phoneNumber="5531971982947" message="Olá! Gostaria de saber mais sobre a terapia para Burnout e Sobrecarga Emocional." />
    </div>
  );
};

export default TerapiaBurnoutPage;
