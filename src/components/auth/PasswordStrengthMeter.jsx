import React from 'react';
import { Check, X, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

export function checkPasswordRequirements(password = '') {
  return {
    minLength: password.length >= 10,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

export function isPasswordValid(password = '') {
  const reqs = checkPasswordRequirements(password);
  return Object.values(reqs).every(Boolean);
}

export function PasswordStrengthMeter({ password = '' }) {
  const reqs = checkPasswordRequirements(password);

  const score = Object.values(reqs).filter(Boolean).length;

  let strengthLabel = 'Fraca';
  let strengthColor = 'bg-red-500';
  let textColor = 'text-red-600';
  let icon = <ShieldAlert className="w-4 h-4 text-red-500" />;

  if (score === 5) {
    strengthLabel = 'Excelente (Muito Forte)';
    strengthColor = 'bg-emerald-600';
    textColor = 'text-emerald-700';
    icon = <ShieldCheck className="w-4 h-4 text-emerald-600" />;
  } else if (score >= 3) {
    strengthLabel = 'Média';
    strengthColor = 'bg-amber-500';
    textColor = 'text-amber-600';
    icon = <Shield className="w-4 h-4 text-amber-500" />;
  } else if (score >= 1) {
    strengthLabel = 'Fraca';
    strengthColor = 'bg-orange-500';
    textColor = 'text-orange-600';
  }

  const percentage = (score / 5) * 100;

  return (
    <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
      {/* Barra de Progresso de Força */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
          <span className="text-slate-600 flex items-center gap-1.5">
            {icon}
            Força da Senha:
          </span>
          <span className={`font-bold ${textColor}`}>{strengthLabel}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${strengthColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Requisitos Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
        <RequirementItem
          met={reqs.minLength}
          label="Mínimo de 10 caracteres"
        />
        <RequirementItem
          met={reqs.hasUpper}
          label="1 Letra maiúscula (A-Z)"
        />
        <RequirementItem
          met={reqs.hasLower}
          label="1 Letra minúscula (a-z)"
        />
        <RequirementItem
          met={reqs.hasNumber}
          label="1 Número (0-9)"
        />
        <RequirementItem
          met={reqs.hasSpecial}
          label="1 Caractere especial (!@#$...)"
        />
      </div>
    </div>
  );
}

function RequirementItem({ met, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
          met ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'
        }`}
      >
        {met ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <X className="w-2.5 h-2.5 stroke-[2]" />}
      </div>
      <span className={met ? 'text-emerald-800 font-semibold' : 'text-slate-500'}>
        {label}
      </span>
    </div>
  );
}

export default PasswordStrengthMeter;
