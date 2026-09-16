import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, CheckCircle2, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AssessmentProgressBar from './AssessmentProgressBar';
import AssessmentQuestionCard from './AssessmentQuestionCard';
import AssessmentResultView from './AssessmentResultView';
import { calculateAssessmentResult } from '@/lib/assessmentEngine';
import analytics from '@/lib/analytics';

const AssessmentRunner = ({ assessment }) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [functionalImpactAnswer, setFunctionalImpactAnswer] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const questions = assessment?.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // Track start
  const handleStart = () => {
    setHasStarted(true);
    if (analytics && typeof analytics.trackEvent === 'function') {
      analytics.trackEvent('assessment_start', {
        assessment_id: assessment.id,
        assessment_title: assessment.title,
      });
    }
  };

  // Resposta de uma pergunta
  const handleSelectOption = (value) => {
    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: value,
    };
    setAnswers(updatedAnswers);

    if (analytics && typeof analytics.trackEvent === 'function') {
      analytics.trackEvent('assessment_question_answered', {
        assessment_id: assessment.id,
        question_id: currentQuestion.id,
        question_index: currentQuestionIndex + 1,
      });
    }

    // Avançar automaticamente para a próxima após breve delay para feedback visual
    setTimeout(() => {
      if (isLastQuestion) {
        // Se houver pergunta de impacto funcional e ela ainda não foi exibida
        if (assessment.functionalImpactQuestion && functionalImpactAnswer === null) {
          setCurrentQuestionIndex(totalQuestions); // Step especial para impacto funcional
        } else {
          finishAssessment(updatedAnswers);
        }
      } else {
        setCurrentQuestionIndex((prev) => prev + 1);
      }
    }, 180);
  };

  const handleFunctionalImpactSelect = (value) => {
    setFunctionalImpactAnswer(value);
    setTimeout(() => {
      finishAssessment(answers, value);
    }, 180);
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const finishAssessment = (finalAnswers = answers, funcImpact = functionalImpactAnswer) => {
    setIsCompleted(true);
    const result = calculateAssessmentResult(assessment, finalAnswers);

    if (analytics && typeof analytics.trackEvent === 'function') {
      analytics.trackEvent('assessment_completed', {
        assessment_id: assessment.id,
        score: result.score,
        severity: result.severity,
      });
    }

    // Rolar suavemente para o topo do resultado
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setHasStarted(false);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setFunctionalImpactAnswer(null);
    setIsCompleted(false);
  };

  // Se o teste foi concluído, renderizar a visualização do resultado
  if (isCompleted) {
    const result = calculateAssessmentResult(assessment, answers);
    return (
      <AssessmentResultView
        assessment={assessment}
        result={result}
        answers={answers}
        functionalImpact={functionalImpactAnswer}
        onReset={handleReset}
      />
    );
  }

  // Tela Inicial de Boas-Vindas
  if (!hasStarted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-10 md:p-12 text-center max-w-3xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 bg-emerald-50 text-[#2d8659] border border-emerald-200">
          <Sparkles className="w-3.5 h-3.5" />
          Autoavaliação Gratuita & Confidencial
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
          {assessment.title}
        </h1>

        <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-8 max-w-2xl mx-auto">
          {assessment.subtitle || assessment.description}
        </p>

        {/* Badges de confiança */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#2d8659] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-gray-900">Rápido e Simples</div>
              <div className="text-xs text-gray-500">Leva apenas ~{assessment.timeEstimate}</div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#2d8659] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-gray-900">Validação Científica</div>
              <div className="text-xs text-gray-500">Padrão clínico GAD-7</div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
            <Shield className="w-5 h-5 text-[#2d8659] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-gray-900">100% Confidencial</div>
              <div className="text-xs text-gray-500">Total sigilo e respeito</div>
            </div>
          </div>
        </div>

        <Button
          onClick={handleStart}
          className="w-full sm:w-auto bg-[#2d8659] hover:bg-[#236b46] text-white px-10 py-6 rounded-2xl font-bold text-base shadow-lg shadow-emerald-900/15 flex items-center justify-center gap-3 mx-auto transition-all group"
        >
          <span>Iniciar Autoavaliação</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>

        <p className="text-xs text-gray-600 mt-6 max-w-md mx-auto">
          Suas respostas são privadas e a visualização do score inicial é imediata.
        </p>
      </motion.div>
    );
  }

  // Se estiver no step especial da Pergunta de Impacto Funcional
  if (currentQuestionIndex === totalQuestions && assessment.functionalImpactQuestion) {
    const impactQ = assessment.functionalImpactQuestion;
    return (
      <div className="max-w-2xl mx-auto">
        <AssessmentProgressBar
          currentStep={totalQuestions}
          totalSteps={totalQuestions}
          timeEstimate={assessment.timeEstimate}
        />
        <AssessmentQuestionCard
          question={impactQ}
          options={impactQ.options}
          selectedValue={functionalImpactAnswer}
          onSelectOption={handleFunctionalImpactSelect}
          onPrev={handlePrev}
          canGoPrev={true}
          questionNumber={totalQuestions + 1}
          totalQuestions={totalQuestions + 1}
          instructions="Pergunta complementar sobre impacto na rotina:"
        />
      </div>
    );
  }

  // Execução normal das questões
  return (
    <div className="max-w-2xl mx-auto">
      <AssessmentProgressBar
        currentStep={currentQuestionIndex + 1}
        totalSteps={totalQuestions}
        timeEstimate={assessment.timeEstimate}
      />

      <AssessmentQuestionCard
        question={currentQuestion}
        options={assessment.options}
        selectedValue={answers[currentQuestion?.id]}
        onSelectOption={handleSelectOption}
        onPrev={handlePrev}
        canGoPrev={currentQuestionIndex > 0}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={totalQuestions}
        instructions={assessment.instructions}
      />
    </div>
  );
};

export default AssessmentRunner;
