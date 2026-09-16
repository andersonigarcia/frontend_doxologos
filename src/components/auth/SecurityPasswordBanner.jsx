import React, { useState } from 'react';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export function SecurityPasswordBanner({ onOpenChangePassword }) {
  const [dismissed, setDismissed] = useState(false);
  const { user } = useAuth();

  // Esconde o banner se o usuário já dispensou ou já atualizou a senha
  if (dismissed || user?.user_metadata?.has_strong_password) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 text-white p-4 rounded-2xl shadow-md border border-emerald-800/60 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-slate-100">
              Diretriz de Segurança LGPD / HIPAA (Padrão de Senhas 2026)
            </h4>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
              Recomendado
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            Se a sua conta foi criada com uma senha de 6 dígitos, recomendamos atualizá-la para o novo padrão corporativo (mínimo de 10 caracteres com letras, números e símbolos). Sua conta continua ativa e protegida.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          onClick={onOpenChangePassword}
          className="bg-[#2d8659] hover:bg-[#236b47] text-white font-bold text-xs shadow-sm flex items-center gap-1.5"
        >
          Atualizar Minha Senha
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Fechar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default SecurityPasswordBanner;
