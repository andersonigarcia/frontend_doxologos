import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import HomeHeader from '@/components/home/HomeHeader';
import { Calendar, CheckCircle, Brain, Heart, ArrowRight } from 'lucide-react';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';
import SiteFooter from '@/components/common/SiteFooter';

const TerapiaDepressaoPage = () => {
  const { user, userRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Terapia para Depressão Online | Psicologia Cristã | Doxologos</title>
        <meta name="description" content="Sente um vazio profundo e falta de energia? A depressão tem tratamento. Descubra como a psicologia clínica unida à fé cristã pode restaurar sua esperança." />
        <link rel="canonical" href="https://doxologos.com.br/terapia/depressao" />
        <meta property="og:title" content="Terapia para Depressão Online | Psicologia Cristã | Doxologos" />
        <meta property="og:description" content="Sente um vazio profundo e falta de energia? A depressão tem tratamento. Descubra como a psicologia clínica unida à fé cristã pode restaurar sua esperança." />
        <meta property="og:url" content="https://doxologos.com.br/terapia/depressao" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            "name": "Terapia para Depressão Online",
            "description": "Tratamento psicológico online para depressão com integração da fé cristã.",
            "provider": {
              "@type": "MedicalClinic",
              "name": "Doxologos"
            },
            "about": {
              "@type": "MedicalCondition",
              "name": "Depressão"
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
              Terapia para Depressão: Existe Esperança e Caminho
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-[#f0ebe1] max-w-3xl mx-auto">
              Quando a vida perde as cores, a terapia é uma ferramenta de Deus para ajudar a restaurar a sua mente, corpo e propósito.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/agendamento" className="bg-[#2d8659] hover:bg-[#236b46] text-white px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center">
                <Calendar className="w-5 h-5 mr-2" />
                Agendar Consulta
              </Link>
              <Link to="/teste-depressao" className="bg-white text-[#1b3c37] hover:bg-gray-100 px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center">
                Fazer Teste Grátis
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">O peso parece grande demais?</h2>
              <p className="text-lg text-gray-700 mb-4">
                Falta de energia, tristeza profunda, desânimo com coisas que você antes amava, e uma sensação constante de vazio. A depressão não é fraqueza espiritual, é um sofrimento profundo e real.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                Grandes homens de Deus, como Elias e Davi, vivenciaram angústias profundas. A boa notícia é que a depressão tem tratamento clínico altamente eficaz.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Acolhimento sem julgamentos religiosos</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Recuperação gradual da energia e vitalidade</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Redescoberta do significado e alegria de viver</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative">
              <div className="absolute -top-6 -right-6 bg-yellow-400 text-yellow-900 font-bold px-4 py-2 rounded-lg shadow-md transform rotate-3">
                Há esperança!
              </div>
              <h3 className="text-2xl font-bold text-[#1b3c37] mb-4">A Bíblia e a Angústia</h3>
              <p className="text-gray-600 italic border-l-4 border-[#2d8659] pl-4 mb-4">
                "O Senhor está perto dos que têm o coração quebrantado e salva os de espírito abatido." <br/><span className="font-bold">- Salmos 34:18</span>
              </p>
              <p className="text-gray-700">
                A terapia oferece um espaço seguro para cuidar de suas feridas invisíveis. Nós ajudamos você a reconstruir sua vida com base científica e amparo na Graça.
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
                <h3 className="text-xl font-bold mb-3 text-gray-900">Manejo Clínico</h3>
                <p className="text-gray-600">
                  Uso de técnicas comprovadas para intervir em pensamentos autocríticos e reativar comportamentos saudáveis de forma gentil e no seu tempo.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Integração Cristã</h3>
                <p className="text-gray-600">
                  Respeitamos sua jornada de fé e a utilizamos como um pilar de resiliência, sem transformar o consultório em um púlpito.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Ambiente Seguro</h3>
                <p className="text-gray-600">
                  Terapia online que permite que você se expresse com vulnerabilidade no conforto da sua casa.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto bg-[#1b3c37] rounded-3xl p-10 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Não adie mais o seu cuidado</h2>
              <p className="text-xl text-[#f0ebe1] mb-8">
                Temos profissionais especializados e capacitados para andar com você nessa jornada de restauração emocional.
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

      <FloatingWhatsAppButton phoneNumber="5531971982947" message="Olá! Gostaria de saber mais sobre a terapia online para depressão." />
    </div>
  );
};

export default TerapiaDepressaoPage;
