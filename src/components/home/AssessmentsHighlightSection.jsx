import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Brain,
  Moon,
  Flame,
  Heart,
  Activity,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const featuredAssessments = [
  {
    slug: 'teste-ansiedade-gad7',
    title: 'Ansiedade (GAD-7)',
    category: 'Humor & Tensão',
    icon: Activity,
    time: '~2 min',
    badge: 'Mais Realizado',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Avalie seu nível de preocupação, tensão física e agitação mental nas últimas semanas.',
  },
  {
    slug: 'teste-tdah-adultos-asrs18',
    title: 'TDAH em Adultos (ASRS-18)',
    category: 'Foco & Atenção',
    icon: Brain,
    time: '~4 min',
    badge: 'Tendência',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'Rastreie sinais de desatenção, procrastinação mental, esquecimento e impulsividade.',
  },
  {
    slug: 'teste-qualidade-sono-insonia',
    title: 'Qualidade do Sono (ISI)',
    category: 'Sono & Restauração',
    icon: Moon,
    time: '~2 min',
    badge: 'Mais Buscado',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Identifique se a insônia ou despertares noturnos têm roubado sua energia diurna.',
  },
  {
    slug: 'teste-casamento-relacionamento-rdas',
    title: 'Ajuste Conjugal (RDAS)',
    category: 'Casais & Família',
    icon: Heart,
    time: '~3 min',
    badge: 'Terapia de Casal',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Avalie a qualidade do diálogo, alinhamento de valores e cumplicidade a dois.',
  },
  {
    slug: 'teste-burnout-esgotamento',
    title: 'Burnout & Sobrecarga',
    category: 'Trabalho & Esgotamento',
    icon: Flame,
    time: '~3 min',
    badge: 'Saúde Ocupacional',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Descubra se o estresse profissional atingiu o nível de exaustão e despersonalização.',
  },
  {
    slug: 'teste-culpa-perfeccionismo-espiritual',
    title: 'Saúde Espiritual & Graça',
    category: 'Fé & Emoções',
    icon: Sparkles,
    time: '~3 min',
    badge: 'Exclusivo Doxologos',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    description: 'Avalie se sua vivência de fé traz paz e descanso ou autocobrança e culpa tóxica.',
  },
];

const AssessmentsHighlightSection = () => {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-b from-emerald-50/50 via-white to-gray-50/70 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Cabeçalho da Seção */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#2d8659]/10 text-[#2d8659] border border-[#2d8659]/20 mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ferramentas Gratuitas e Confidenciais</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight mb-4">
            Como está a sua <span className="text-[#2d8659]">saúde emocional</span> hoje?
          </h2>

          <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
            Faça autoavaliações psicométricas validadas cientificamente e receba em minutos uma análise clara do seu momento com orientações práticas.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 text-xs sm:text-sm font-semibold text-gray-500">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-[#2d8659]" /> 100% Gratuito
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-[#2d8659]" /> Totalmente Confidencial
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <Clock className="w-4 h-4 text-[#2d8659]" /> Leva menos de 3 minutos
            </span>
          </div>
        </div>

        {/* Grade de Testes em Destaque */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
          {featuredAssessments.map((test, index) => {
            const Icon = test.icon;
            return (
              <motion.div
                key={test.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200/80 shadow-lg shadow-emerald-950/5 flex flex-col justify-between relative group hover:border-[#2d8659]/50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#2d8659] group-hover:bg-[#2d8659] group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${test.badgeColor}`}>
                      {test.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-[#2d8659] transition-colors">
                    {test.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">
                    {test.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {test.time}
                  </span>

                  <Link
                    to={`/ferramentas/${test.slug}`}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#2d8659] hover:text-[#1b3c37] transition-colors"
                  >
                    <span>Fazer Teste</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA para o Hub Completo */}
        <div className="text-center bg-white rounded-3xl p-8 sm:p-10 border border-emerald-200/80 shadow-xl shadow-emerald-900/5 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
              Explore todas as 8 autoavaliações clínicas
            </h3>
            <p className="text-sm text-gray-600">
              Ansiedade, Depressão, TDAH, Sono, Casamento, Burnout, Espiritualidade e Autoestima.
            </p>
          </div>

          <Link to="/ferramentas" className="shrink-0 w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-[#2d8659] hover:bg-[#236b46] text-white px-8 py-6 rounded-2xl font-bold text-sm shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 group">
              <span>Acessar Central de Testes</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AssessmentsHighlightSection;
