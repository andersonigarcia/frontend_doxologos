import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

const AssessmentProgressBar = ({ currentStep, totalSteps, timeEstimate = '2 min' }) => {
  const percentage = Math.min(100, Math.round((currentStep / totalSteps) * 100));

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 transition-all">
      <div className="flex items-center justify-between text-xs sm:text-sm font-medium text-gray-500 mb-2">
        <span className="flex items-center gap-1.5 text-emerald-800 font-semibold">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Pergunta {currentStep} de {totalSteps}
        </span>
        <span className="flex items-center gap-1 text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          Tempo estimado: ~{timeEstimate}
        </span>
      </div>

      {/* Track bar */}
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-[#2d8659] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        />
      </div>

      <div className="flex justify-between items-center text-[11px] text-gray-400 mt-1.5 px-0.5">
        <span>Início</span>
        <span>{percentage}% concluído</span>
        <span>Resultado</span>
      </div>
    </div>
  );
};

export default AssessmentProgressBar;
