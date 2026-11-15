import React from 'react';
import { motion } from 'framer-motion';

const AssessmentGauge = ({ score = 0, maxScore = 21, severity = 'minimal' }) => {
  // Ângulo de -90 graus (esquerda) até +90 graus (direita)
  const percentage = maxScore > 0 ? Math.min(100, Math.max(0, (score / maxScore) * 100)) : 0;
  // Map 0-100% to -90 to +90 degrees
  const needleRotation = -90 + (percentage / 100) * 180;

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[280px] mx-auto my-2">
      <svg viewBox="0 0 200 115" className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />    {/* Verde / Mínimo */}
            <stop offset="35%" stopColor="#0284c7" />   {/* Azul / Leve */}
            <stop offset="68%" stopColor="#f59e0b" />   {/* Laranja / Moderado */}
            <stop offset="100%" stopColor="#e11d48" />  {/* Vermelho / Severo */}
          </linearGradient>
          <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Arco de fundo (trilha cinza) */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Arco colorido com gradiente */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="16"
          strokeLinecap="round"
          filter="url(#gaugeShadow)"
        />

        {/* Pontos de demarcação sutis */}
        <circle cx="20" cy="100" r="3" fill="#10b981" />
        <circle cx="68" cy="38" r="3" fill="#0284c7" />
        <circle cx="132" cy="38" r="3" fill="#f59e0b" />
        <circle cx="180" cy="100" r="3" fill="#e11d48" />

        {/* Agulha / Indicador */}
        <g transform="translate(100, 100)">
          <motion.g
            initial={{ rotate: -90 }}
            animate={{ rotate: needleRotation }}
            transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Ponteiro estilizado */}
            <polygon points="-3,-5 0,-76 3,-5" fill="#1e293b" />
            <circle cx="0" cy="0" r="8" fill="#1e293b" />
            <circle cx="0" cy="0" r="3" fill="#ffffff" />
          </motion.g>
        </g>

        {/* Rótulos dos limites */}
        <text x="18" y="114" fontSize="9" fill="#64748b" fontWeight="600" textAnchor="middle">0</text>
        <text x="68" y="24" fontSize="9" fill="#0284c7" fontWeight="600" textAnchor="middle">Leve</text>
        <text x="132" y="24" fontSize="9" fill="#d97706" fontWeight="600" textAnchor="middle">Mod</text>
        <text x="182" y="114" fontSize="9" fill="#e11d48" fontWeight="600" textAnchor="middle">{maxScore}</text>
      </svg>

      {/* Pontuação em Destaque no Centro */}
      <div className="mt-1 text-center">
        <div className="text-3xl font-extrabold tracking-tight text-gray-900">
          {score} <span className="text-base font-normal text-gray-500">/ {maxScore}</span>
        </div>
        <div className="text-xs uppercase font-bold tracking-wider text-gray-600 mt-0.5">
          Pontuação Total
        </div>
      </div>
    </div>
  );
};

export default AssessmentGauge;
