
import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft, Target, Eye, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const QuemSomosPage = () => {
  return (
    <>
      <Helmet>
        <title>Quem Somos - Doxologos Clínica Online</title>
        <meta name="description" content="Conheça a Doxologos, nossa missão, visão e valores. Atendimento psicológico com ética cristã e acolhimento integral." />
      </Helmet>

      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Heart className="w-8 h-8 text-[#2d8659]" />
              <span className="text-2xl font-bold gradient-text">Doxologos</span>
            </Link>
            <Link to="/">
              <Button variant="outline" className="border-[#2d8659] text-[#2d8659]">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <div className="min-h-screen bg-gray-50">
        {/* Hero */}
        <section className="hero-gradient py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Quem <span className="gradient-text">Somos</span>
              </h1>
              <p className="text-xl text-gray-700">
                Uma clínica dedicada ao cuidado integral da saúde mental, fundamentada em valores cristãos e excelência profissional.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Nossa História */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl font-bold mb-6">Nossa História</h2>
                <p className="text-gray-700 mb-4">
                  A Doxologos nasceu do desejo de oferecer atendimento psicológico de qualidade, aliando a ciência da psicologia aos princípios cristãos de amor, acolhimento e restauração.
                </p>
                <p className="text-gray-700 mb-4">
                  Acreditamos que cada pessoa é única e merece ser tratada com dignidade, respeito e compaixão. Nossa equipe é formada por profissionais altamente qualificados, comprometidos com a ética e o desenvolvimento integral de cada paciente.
                </p>
                <p className="text-gray-700">
                  Através do atendimento online, conseguimos alcançar pessoas em todo o Brasil, oferecendo suporte terapêutico de qualidade no conforto e segurança de suas casas.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <img className="rounded-2xl shadow-xl w-full" alt="Equipe Doxologos" src="https://images.unsplash.com/photo-1675270714610-11a5cadcc7b3" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Missão, Visão e Valores */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-8 shadow-lg"
              >
                <div className="w-16 h-16 bg-[#2d8659]/10 rounded-full flex items-center justify-center mb-6">
                  <Target className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Nossa Missão</h3>
                <p className="text-gray-700">
                  Promover saúde mental e bem-estar emocional através de atendimento psicológico de excelência, fundamentado em valores cristãos, oferecendo acolhimento, respeito e cuidado integral a cada pessoa.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-8 shadow-lg"
              >
                <div className="w-16 h-16 bg-[#2d8659]/10 rounded-full flex items-center justify-center mb-6">
                  <Eye className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Nossa Visão</h3>
                <p className="text-gray-700">
                  Ser referência nacional em atendimento psicológico online com ética cristã, reconhecida pela excelência profissional, acolhimento humanizado e transformação de vidas.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-8 shadow-lg"
              >
                <div className="w-16 h-16 bg-[#2d8659]/10 rounded-full flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-[#2d8659]" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Nossos Valores</h3>
                <ul className="text-gray-700 space-y-2">
                  <li>• Ética e Profissionalismo</li>
                  <li>• Amor e Compaixão</li>
                  <li>• Respeito à Dignidade Humana</li>
                  <li>• Excelência no Atendimento</li>
                  <li>• Confidencialidade</li>
                  <li>• Fé e Ciência em Harmonia</li>
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Diferenciais */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold mb-4">Nossos Diferenciais</h2>
              <p className="text-xl text-gray-600">O que nos torna únicos</p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  title: 'Abordagem Integral',
                  description: 'Cuidamos do ser humano em sua totalidade: mente, emoções e espiritualidade.'
                },
                {
                  title: 'Profissionais Qualificados',
                  description: 'Equipe com formação acadêmica sólida e experiência em atendimento clínico.'
                },
                {
                  title: 'Ética Cristã',
                  description: 'Valores cristãos que norteiam nosso trabalho, sempre respeitando a individualidade de cada pessoa.'
                },
                {
                  title: 'Atendimento Online',
                  description: 'Flexibilidade e comodidade para você cuidar da sua saúde mental de onde estiver.'
                },
                {
                  title: 'Sigilo Profissional',
                  description: 'Garantia absoluta de confidencialidade em todos os atendimentos.'
                },
                {
                  title: 'Acolhimento Humanizado',
                  description: 'Ambiente seguro e acolhedor para você se expressar livremente.'
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gray-50 p-6 rounded-xl"
                >
                  <h3 className="text-xl font-bold mb-3 text-[#2d8659]">{item.title}</h3>
                  <p className="text-gray-700">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 hero-gradient">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold mb-6">Pronto para Começar?</h2>
              <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
                Dê o primeiro passo em direção ao seu bem-estar emocional. Estamos aqui para caminhar com você.
              </p>
              <Link to="/agendamento">
                <Button size="lg" className="bg-[#2d8659] hover:bg-[#236b47] text-lg px-8">
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
  