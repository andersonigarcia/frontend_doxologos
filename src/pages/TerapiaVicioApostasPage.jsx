import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import HomeHeader from '@/components/home/HomeHeader';
import { Calendar, CheckCircle, Brain, Heart, ArrowRight } from 'lucide-react';
import FloatingWhatsAppButton from '@/components/FloatingWhatsAppButton';
import SiteFooter from '@/components/common/SiteFooter';

const TerapiaVicioApostasPage = () => {
  const { user, userRole, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>Terapia para Vício em Jogos e Apostas | Doxologos</title>
        <meta name="description" content="Perdendo o controle financeiro e familiar para os jogos e apostas online? Há esperança. Oferecemos tratamento especializado para superar o vício em Bets." />
        <link rel="canonical" href="https://doxologos.com.br/terapia/vicio-apostas" />
        <meta property="og:title" content="Terapia para Vício em Jogos e Apostas | Doxologos" />
        <meta property="og:description" content="Perdendo o controle financeiro e familiar para os jogos e apostas online? Há esperança e tratamento clínico sigiloso." />
        <meta property="og:url" content="https://doxologos.com.br/terapia/vicio-apostas" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MedicalWebPage",
            "name": "Terapia para Vício em Jogos e Apostas",
            "description": "Tratamento psicológico para o transtorno de jogos e apostas (Bets, cassinos online, tigrinho).",
            "provider": {
              "@type": "MedicalClinic",
              "name": "Doxologos"
            },
            "about": {
              "@type": "MedicalCondition",
              "name": "Transtorno de Jogo"
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
              Libertação do Vício em Jogos e Apostas
            </h1>
            <p className="text-xl sm:text-2xl mb-8 text-[#f0ebe1] max-w-3xl mx-auto">
              Retome o controle da sua vida financeira, familiar e espiritual. Tratamento clínico, ético e sigiloso para a dependência em apostas online.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/agendamento" className="bg-[#2d8659] hover:bg-[#236b46] text-white px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center">
                <Calendar className="w-5 h-5 mr-2" />
                Agendar Consulta Sigilosa
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">As apostas roubaram a sua paz e as suas economias?</h2>
              <p className="text-lg text-gray-700 mb-4">
                O que começou como uma "brincadeira" ou uma tentativa desesperada de pagar as contas rapidamente se tornou uma prisão. O vício em apostas online ativa as mesmas áreas cerebrais que as drogas químicas.
              </p>
              <p className="text-lg text-gray-700 mb-6">
                Não é falta de caráter. A vergonha frequentemente faz com que os cristãos sofram em silêncio, acumulando dívidas enormes e mentindo para a própria família. Existe saída, e começa quebrando o segredo em um ambiente terapêutico.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Necessidade compulsiva de apostar valores cada vez maiores</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Irritabilidade quando tenta parar ou diminuir</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-[#2d8659] mt-1 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">Mentiras para encobrir a extensão do envolvimento com o jogo</span>
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative">
              <div className="absolute -top-6 -right-6 bg-yellow-400 text-yellow-900 font-bold px-4 py-2 rounded-lg shadow-md transform rotate-3">
                Não tenha vergonha
              </div>
              <h3 className="text-2xl font-bold text-[#1b3c37] mb-4">Trazendo para a Luz</h3>
              <p className="text-gray-600 italic border-l-4 border-[#2d8659] pl-4 mb-4">
                "Mas tudo o que é exposto pela luz torna-se visível, pois a luz torna visíveis todas as coisas." <br/><span className="font-bold">- Efésios 5:13</span>
              </p>
              <p className="text-gray-700">
                O vício se alimenta da mentira e das sombras. Na Doxologos, nossos psicólogos estão preparados para receber a sua confissão com graça, sigilo absoluto e protocolos clínicos rígidos para o desmame dopaminérgico.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#f0ebe1] py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-[#1b3c37] mb-12">Nossa Abordagem de Intervenção</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Manejo de Impulsos</h3>
                <p className="text-gray-600">
                  Uso da TCC para identificar os "gatilhos" (tédio, ansiedade, ilusão de ganho) e treinar o cérebro a resistir ao impulso imediato de apostar.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Tratamento da Raiz</h3>
                <p className="text-gray-600">
                  O vício quase sempre mascara uma dor emocional subjacente. Tratamos a ansiedade ou depressão que pode estar sendo medicada através do jogo.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <div className="bg-[#e6f4ea] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Envolvimento Familiar</h3>
                <p className="text-gray-600">
                  Quando necessário, auxiliamos no estabelecimento de controles financeiros (bloqueadores) e mediamos a conversa de restauração de confiança com o cônjuge.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto bg-[#1b3c37] rounded-3xl p-10 text-center text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Quebre o silêncio hoje mesmo</h2>
              <p className="text-xl text-[#f0ebe1] mb-8">
                O próximo clique não vai resolver os seus problemas, mas o clique para agendar a sua consulta será o início da sua recuperação.
              </p>
              <Link to="/agendamento" className="inline-flex bg-yellow-500 hover:bg-yellow-400 text-yellow-950 px-8 py-4 rounded-full font-bold text-lg transition-transform hover:scale-105 items-center">
                Buscar Ajuda Agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <FloatingWhatsAppButton phoneNumber="5531971982947" message="Olá! Preciso de ajuda urgente e sigilosa sobre vício em apostas/jogos." />
    </div>
  );
};

export default TerapiaVicioApostasPage;
