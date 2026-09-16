import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowLeft, HelpCircle } from 'lucide-react';

const AssessmentQuestionCard = ({
  question,
  options = [],
  selectedValue,
  onSelectOption,
  onPrev,
  canGoPrev = false,
  questionNumber = 1,
  totalQuestions = 7,
  instructions = '',
}) => {
  if (!question) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 md:p-10"
      >
        {/* Top bar da questão */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-[#2d8659] text-sm font-bold">
              {questionNumber}
            </span>
            {question.category && (
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {question.category}
              </span>
            )}
          </div>

          {canGoPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-emerald-700 transition-colors p-1.5 rounded-lg hover:bg-gray-50"
              aria-label="Voltar para a pergunta anterior"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          )}
        </div>

        {/* Instrução de contexto (duas últimas semanas) */}
        {instructions && (
          <p className="text-xs sm:text-sm text-gray-700 mb-3 font-medium flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{instructions}</span>
          </p>
        )}

        {/* Texto da Pergunta */}
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-snug mb-8">
          "{question.text}"
        </h2>

        {/* Grid de Opções de Resposta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {options.map((option) => {
            const isSelected = selectedValue === option.value;

            return (
              <motion.button
                key={option.value}
                type="button"
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => onSelectOption(option.value)}
                className={`group relative flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 text-left transition-all min-h-[64px] ${
                  isSelected
                    ? 'border-[#2d8659] bg-emerald-50/70 shadow-md shadow-emerald-900/5 ring-2 ring-emerald-500/20'
                    : 'border-gray-200 hover:border-emerald-400 hover:bg-gray-50/80 bg-white'
                }`}
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-3.5 pr-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isSelected
                        ? 'bg-[#2d8659] text-white'
                        : 'bg-gray-100 text-gray-700 group-hover:bg-emerald-100 group-hover:text-emerald-800'
                    }`}
                  >
                    {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : option.value}
                  </div>
                  <div>
                    <div
                      className={`text-sm sm:text-base font-semibold ${
                        isSelected ? 'text-emerald-950 font-bold' : 'text-gray-800 group-hover:text-gray-900'
                      }`}
                    >
                      {option.label}
                    </div>
                  </div>
                </div>

                <div
                  className={`w-3 h-3 rounded-full shrink-0 border-2 transition-all ${
                    isSelected
                      ? 'border-[#2d8659] bg-[#2d8659]'
                      : 'border-gray-300 group-hover:border-emerald-500'
                  }`}
                />
              </motion.button>
            );
          })}
        </div>

        {/* Rodapé explicativo / navegação */}
        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
          <span>Dica: Escolha a opção que melhor reflete sua rotina recente.</span>
          <span className="hidden sm:inline">Resposta salva automaticamente</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AssessmentQuestionCard;
