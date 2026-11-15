
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Target, Eye, Users, BookOpen, Shield, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DoxologosLogo from '@/components/brand/DoxologosLogo';
import AenderBorbaSeal from '@/components/brand/AenderBorbaSeal';

const QuemSomosPage = () => {
  return (
    <>
      <Helmet>
        <title>Quem Somos - Doxologos Clínica Online</title>
        <meta name="description" content="Conheça a Doxologos, nossa missão, visão, valores e a união entre conhecimento científico, cuidado humano e transcendência." />
        <link rel="canonical" href="https://doxologos.com.br/quem-somos" />
        <meta property="og:title" content="Quem Somos - Doxologos Clínica Online" />
        <meta property="og:description" content="Conheça a Doxologos, nossa missão, visão e valores. Atendimento psicológico com ética cristã e acolhimento integral." />
        <meta property="og:url" content="https://doxologos.com.br/quem-somos" />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="bg-[#f8f6f0] border-b border-[#e4ded5] shadow-xs">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <DoxologosLogo className="h-9 w-auto" />
            </Link>
            <Link to="/">
              <Button variant="outline" className="border-[#1b3c37] text-[#1b3c37] hover:bg-[#1b3c37] hover:text-[#f0ebe1]">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <div className="min-h-screen bg-[#f8f6f0] text-[#262624]">
        {/* Hero */}
        <section className="hero-gradient py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="font-serif text-5xl md:text-6xl font-bold mb-6 text-[#1b3c37]">
                Quem <span className="gradient-text">Somos</span>
              </h1>
              <p className="text-xl text-[#262624]/85 leading-relaxed">
                Um Instituto dedicado ao cuidado integral da saúde mental, unindo **conhecimento, cuidado e transcendência** em perfeita sintonia.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Nossa História e Identidade */}
        <section className="py-20 bg-white border-y border-[#e4ded5]">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="font-serif text-4xl font-bold mb-6 text-[#1b3c37]">Nossa Identidade & Essência</h2>
                <p className="text-[#262624]/90 mb-4 leading-relaxed">
                  O logotipo da **DOXOLOGOS — Instituto de Cuidado Integral** representa a união harmônica entre conhecimento científico, sensibilidade humana e fé.
                </p>
                <p className="text-[#262624]/90 mb-4 leading-relaxed">
                  O símbolo em formato de **escudo** transmite segurança, confiança e proteção. Em seu centro, **três formas interligadas** representam a integralidade da pessoa humana (mente, corpo e espírito), reforçando a visão de que cada dimensão deve ser compreendida de forma conectada.
                </p>
                <p className="text-[#262624]/90 leading-relaxed">
                  Na base, o **livro aberto** simboliza o fundamento, estudo e rigor científico, conectando o saber acadêmico à sabedoria ética que norteia nossos atendimentos.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-[#f4efe6] p-8 rounded-2xl border border-[#e4ded5] flex flex-col items-center justify-center text-center shadow-sm"
              >
                <DoxologosLogo variant="horizontal" className="h-24 w-auto mb-6" />
                <p className="text-sm text-[#262624]/80 italic max-w-md">
                  "Equilibrando a tradição, o rigor científico e a sensibilidade humana necessária para a restauração de vidas."
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Missão, Visão e Valores */}
        <section className="py-20 bg-[#f8f6f0]">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-[#e4ded5]"
              >
                <div className="w-14 h-14 bg-[#1b3c37]/10 rounded-xl flex items-center justify-center mb-6">
                  <Target className="w-7 h-7 text-[#1b3c37]" />
                </div>
                <h3 className="font-serif text-2xl font-bold mb-4 text-[#1b3c37]">Nossa Missão</h3>
                <p className="text-[#262624]/80 leading-relaxed">
                  Promover saúde mental e bem-estar emocional através de atendimento psicológico de excelência, fundamentado em valores cristãos, oferecendo acolhimento, respeito e cuidado integral a cada pessoa.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-[#e4ded5]"
              >
                <div className="w-14 h-14 bg-[#1b3c37]/10 rounded-xl flex items-center justify-center mb-6">
                  <Eye className="w-7 h-7 text-[#1b3c37]" />
                </div>
                <h3 className="font-serif text-2xl font-bold mb-4 text-[#1b3c37]">Nossa Visão</h3>
                <p className="text-[#262624]/80 leading-relaxed">
                  Ser referência nacional em atendimento psicológico online com ética cristã, reconhecida pela excelência profissional, acolhimento humanizado e transformação de vidas.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-[#e4ded5]"
              >
                <div className="w-14 h-14 bg-[#1b3c37]/10 rounded-xl flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-[#1b3c37]" />
                </div>
                <h3 className="font-serif text-2xl font-bold mb-4 text-[#1b3c37]">Nossos Valores</h3>
                <ul className="text-[#262624]/80 space-y-2">
                  <li>• Ética e Rigor Científico</li>
                  <li>• Sensibilidade e Humanidade</li>
                  <li>• Respeito à Dignidade Humana</li>
                  <li>• Excelência no Atendimento</li>
                  <li>• Confidencialidade e Sigilo</li>
                  <li>• Harmonia entre Fé e Ciência</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Assinatura de Autoridade - Selo Aender Borba */}
        <section className="py-16 bg-[#1b3c37] text-[#f0ebe1]">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="flex flex-col items-center"
            >
              <AenderBorbaSeal className="h-24 md:h-28 w-auto mb-6 drop-shadow-md" />
              <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4 text-[#f0ebe1]">
                Compromisso com a Autoridade & Rigor Ético
              </h2>
              <p className="text-lg text-[#f0ebe1]/90 max-w-2xl leading-relaxed">
                Desenvolvido como uma assinatura de autoridade conectada ao universo visual da DOXOLOGOS, o selo **Aender Borba** reforça o vínculo institucional, a seriedade técnica e a dedicação ao cuidado de cada vida.
              </p>
            </motion.div>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-20 hero-gradient">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-serif text-4xl font-bold mb-6 text-[#1b3c37]">Pronto para Começar?</h2>
              <p className="text-xl text-[#262624]/85 mb-8 max-w-2xl mx-auto">
                Dê o primeiro passo em direção ao seu bem-estar emocional. Estamos aqui para caminhar com você.
              </p>
              <Link to="/agendamento">
                <Button size="lg" className="bg-[#1b3c37] hover:bg-[#132d29] text-[#f0ebe1] text-lg px-8 py-4 shadow-md">
                  Agendar Consulta
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default QuemSomosPage;
  