import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Heart,
  Calendar,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  Share2,
  BookOpen,
  Printer,
  HelpCircle,
  BarChart3,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AssessmentGauge from './AssessmentGauge';
import LeadCaptureSection from './LeadCaptureSection';
import { getSeverityTheme } from '@/lib/assessmentEngine';

const AssessmentResultView = ({
  assessment,
  result,
  answers = {},
  functionalImpact = null,
  onReset,
}) => {
  const {
    score,
    maxScore,
    range,
    severity,
    dimensions = [],
    therapyQuestions = [],
    psychoeducation,
  } = result;
  const theme = getSeverityTheme(range?.badgeColor);

  const clinicPhone = '5531971982947';
  const whatsappText = encodeURIComponent(
    `Olá! Fiz a autoavaliação de ${assessment.title} no site da Doxologos e obtive o resultado de "${range?.label || 'Avaliação'}" (Score: ${score}/${maxScore}). Gostaria de tirar dúvidas e conversar com um psicólogo.`
  );
  const whatsappUrl = `https://wa.me/${clinicPhone}?text=${whatsappText}`;

  const handleShare = () => {
    const shareData = {
      title: assessment.title,
      text: `Fiz a autoavaliação de ${assessment.title} na Doxologos. Faça você também gratuitamente:`,
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 print:space-y-4"
    >
      {/* Card Principal de Resultado e Gauge */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-6 sm:p-8 md:p-10 overflow-hidden relative print:shadow-none print:border-none print:p-0">
        {/* Faixa decorativa superior */}
        <div className={`absolute top-0 left-0 right-0 h-2.5 bg-gradient-to-r ${theme.gradient} print:hidden`} />

        <div className="text-center max-w-2xl mx-auto mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-3 bg-gray-100 text-gray-700">
            <Sparkles className="w-3.5 h-3.5 text-[#2d8659]" />
            Dossiê de Autoavaliação & Psicoeducação
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            {assessment.shortTitle || assessment.title}
          </h2>
        </div>

        {/* Gauge e Classificação */}
        <div className="flex flex-col items-center justify-center mb-8">
          <AssessmentGauge score={score} maxScore={maxScore} severity={severity} />

          <div className="mt-4 text-center">
            <span
              className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm ${theme.badgeBg}`}
            >
              {range?.label}
            </span>
            <p className="text-sm sm:text-base text-gray-600 font-medium mt-3 max-w-lg mx-auto">
              {range?.summary}
            </p>
          </div>
        </div>

        {/* Diagnóstico Educativo & Recomendações */}
        <div className="border-t border-gray-100 pt-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2d8659]" />
              O que este resultado significa?
            </h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              {range?.clinicalInsight || range?.description || range?.summary}
            </p>
          </div>

          {/* Recomendações Práticas */}
          {Array.isArray(range?.recommendations) && range.recommendations.length > 0 && (
            <div className={`p-5 rounded-2xl ${theme.bgLight} border ${theme.border}`}>
              <h4 className={`text-sm font-bold ${theme.textDark} mb-3 flex items-center gap-2`}>
                <CheckCircle className="w-4 h-4" />
                Orientações Recomendadas para o seu Momento:
              </h4>
              <ul className="space-y-2">
                {range.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs sm:text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-[#2d8659] font-bold shrink-0">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ponte Espiritual & Acolhimento */}
          {range?.spiritualBridge && (
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-gray-700 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2d8659] uppercase tracking-wider">
                <Heart className="w-3.5 h-3.5" />
                <span>Perspectiva de Fé e Esperança</span>
              </div>
              <p className="text-xs sm:text-sm italic leading-relaxed text-gray-700">
                "{range.spiritualBridge}"
              </p>
            </div>
          )}

          {/* CTAs de Ação */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 print:hidden">
            <Link
              to={range?.ctaLink || '/agendamento'}
              className="w-full sm:flex-1"
            >
              <Button
                className="w-full bg-[#2d8659] hover:bg-[#236b46] text-white py-4 sm:py-6 rounded-2xl font-bold text-base shadow-lg shadow-emerald-900/15 flex items-center justify-center gap-2 group transition-all"
              >
                <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>{range?.ctaText || 'Agendar Consulta com Especialista'}</span>
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto px-5 py-4 sm:py-6 rounded-2xl border-emerald-300 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 flex items-center justify-center gap-2 font-semibold"
              >
                <span>Falar no WhatsApp</span>
              </Button>
            </a>

            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="w-full sm:w-auto px-4 py-4 sm:py-6 rounded-2xl border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleShare}
              className="w-full sm:w-auto px-4 py-4 sm:py-6 rounded-2xl border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
              title="Compartilhar teste"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

      </div>

      {/* Captura de Lead para Relatório Completo via E-mail / WhatsApp */}
      <div className="print:hidden">
        <LeadCaptureSection
          assessmentId={assessment.id}
          assessmentTitle={assessment.title}
          score={score}
          maxScore={maxScore}
          severity={severity}
          severityLabel={range?.label}
          severitySummary={range?.summary}
          recommendations={range?.recommendations}
          spiritualBridge={range?.spiritualBridge}
          dimensions={dimensions}
          therapyQuestions={therapyQuestions}
          psychoeducation={psychoeducation}
          answers={answers}
          functionalImpact={functionalImpact}
        />
      </div>

      {/* Disclaimer Regulatório do Conselho Federal de Psicologia (CFP) */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200/80 p-5 text-gray-600 text-xs leading-relaxed space-y-2">
        <div className="flex items-center gap-2 font-bold text-gray-700">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Aviso Legal & Regulatório (Conselho Federal de Psicologia)</span>
        </div>
        <p>
          Esta autoavaliação é um instrumento de rastreamento com finalidade exclusivamente educativa e de conscientização em saúde mental. <strong>Ela não constitui nem substitui um diagnóstico clínico</strong>, avaliação médica ou psicológica formal. Se você está em sofrimento intenso ou crise, busque atendimento de emergência ou ligue para o CVV (188).
        </p>
        <p className="text-[11px] text-gray-600 pt-1">
          Base científica: {assessment.scientificBasis || assessment.scientificReference || 'Escalas validadas'}
        </p>
      </div>

      {/* Botões secundários: Refazer ou Ver Outros Recursos */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 print:hidden">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-emerald-700 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refazer Autoavaliação</span>
        </button>

        <Link
          to="/artigos"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2d8659] hover:underline"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Explorar artigos de saúde mental no Blog</span>
        </Link>
      </div>
    </motion.div>
  );
};

export default AssessmentResultView;

