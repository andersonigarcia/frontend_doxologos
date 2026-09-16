import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Clock, ArrowRight, ShieldCheck, CheckCircle2, Flame, Heart } from 'lucide-react';
import { getAllAssessments } from '@/data/assessments';
import DoxologosLogo from '@/components/brand/DoxologosLogo';
import { Button } from '@/components/ui/button';

const AssessmentHubPage = () => {
  const assessments = getAllAssessments();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-gray-50/60 text-gray-800">
      <Helmet>
        <title>Ferramentas de Autoavaliação Psicométrica | Doxologos Psicologia</title>
        <meta
          name="description"
          content="Faça autoavaliações clínicas gratuitas e confidenciais de ansiedade, estresse e bem-estar emocional baseadas em escalas científicas validadas."
        />
        <link rel="canonical" href="https://novo.doxologos.com.br/ferramentas" />
      </Helmet>

      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Voltar para a página inicial">
            <DoxologosLogo className="h-8 w-auto" />
          </Link>

          <Link
            to="/agendamento"
            className="bg-[#2d8659] hover:bg-[#236b46] text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            Agendar Consulta
          </Link>
        </div>
      </header>

      {/* Hero do Hub */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 bg-emerald-100/80 text-[#2d8659] border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            Central de Autoavaliação & Autocuidado
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            Instrumentos Clínicos para o seu Autoconhecimento
          </h1>

          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Ferramentas gratuitas, anônimas e baseadas em escalas científicas internacionais para ajudar você a identificar sintomas emocionais e encontrar o direcionamento certo.
          </p>
        </div>

        {/* Grid de Ferramentas Disponíveis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          {/* Card GAD-7 (Ativo) */}
          {assessments.map((item) => (
            <motion.div
              key={item.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200/80 shadow-xl shadow-emerald-900/5 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                Disponível Agora
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 mb-4">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{item.category}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  {item.title}
                </h2>

                <p className="text-sm text-gray-600 leading-relaxed mb-6">
                  {item.subtitle || item.description}
                </p>

                <div className="flex items-center gap-4 text-xs font-medium text-gray-500 mb-6">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#2d8659]" />
                    {item.estimatedTime || item.timeEstimate || '~3 min'}
                  </span>
                  <span>•</span>
                  <span>{item.questions?.length || item.questionsCount || 10} perguntas rápidas</span>
                  <span>•</span>
                  <span>100% Gratuito</span>
                </div>

              </div>

              <Link to={`/ferramentas/${item.slug}`}>
                <Button className="w-full bg-[#2d8659] hover:bg-[#236b46] text-white py-5 rounded-2xl font-bold text-sm shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 group">
                  <span>Iniciar Avaliação Gratuita</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          ))}

          {/* Card Próximo Instrumento: Estresse & Sobrecarga Diária (Em Breve) */}
          <div className="bg-white/70 rounded-3xl p-6 sm:p-8 border border-gray-200 border-dashed flex flex-col justify-between relative opacity-85">
            <div className="absolute top-0 right-0 bg-amber-500 text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
              Próximo Lançamento
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Estresse & Regulação</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Escala de Estresse Percebido (PSS-10)
              </h2>

              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Avalie o grau em que as situações da sua rotina têm sido imprevisíveis, incontroláveis e sobrecarregadas.
              </p>

              <div className="flex items-center gap-4 text-xs font-medium text-gray-400 mb-6">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  ~3 minutos
                </span>
                <span>•</span>
                <span>Em validação clínica</span>
              </div>
            </div>

            <Button
              disabled
              variant="outline"
              className="w-full py-5 rounded-2xl font-semibold text-sm border-gray-200 text-gray-400 cursor-not-allowed"
            >
              Em Breve
            </Button>
          </div>
        </div>





        {/* Faixa de Segurança e Ética */}
        <div className="mt-16 max-w-3xl mx-auto bg-emerald-50/60 rounded-3xl p-6 sm:p-8 border border-emerald-100 text-center space-y-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-[#2d8659]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-gray-900">
            Compromisso com o Rigor Científico e a Ética
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-xl mx-auto">
            Nossas ferramentas utilizam escalas psicométricas internacionais com validação para a população brasileira, servindo como instrumentos de triagem e psicoeducação.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 bg-white text-center text-xs text-gray-600">
        <div className="max-w-6xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-gray-600">
            <span>Doxologos Psicologia — Cuidado Integral da Mente e do Espírito</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </div>
          <p className="text-[11px] text-gray-600">
            Atendimento 100% online em conformidade com o Conselho Federal de Psicologia (CFP).
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AssessmentHubPage;
