import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, Settings, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

/**
 * Banner de Consentimento de Cookies LGPD (Doxologos Saúde Mental)
 * Oferece transparência total e controle sobre cookies funcionais e de analytics.
 */
const LgpdCookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    const savedConsent = localStorage.getItem('doxologos_cookie_consent');
    if (!savedConsent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const consent = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('doxologos_cookie_consent', JSON.stringify(consent));
    setIsVisible(false);
  };

  const handleAcceptEssential = () => {
    const consent = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('doxologos_cookie_consent', JSON.stringify(consent));
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    const consent = {
      ...preferences,
      essential: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('doxologos_cookie_consent', JSON.stringify(consent));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Gestão de Consentimento de Cookies LGPD"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-slate-900/95 backdrop-blur-md text-white border-t border-slate-800 shadow-2xl transition-all duration-300 animate-in slide-in-from-bottom"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Ícone e Texto Informativo */}
        <div className="flex items-start space-x-3 max-w-3xl">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg shrink-0 mt-1 md:mt-0">
            <Cookie className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="text-sm text-slate-300">
            <p className="font-semibold text-white text-base mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Sua Privacidade & Proteção de Dados (LGPD)
            </p>
            <p>
              Utilizamos cookies essenciais para garantir o funcionamento seguro do agendamento de consultas e telepsicologia. 
              Também usamos cookies de analytics para aprimorar sua experiência. Saiba mais em nossa{' '}
              <Link to="/privacidade" className="text-indigo-400 underline hover:text-indigo-300 transition-colors">
                Política de Privacidade
              </Link>.
            </p>

            {/* Painel de Preferências Detalhadas */}
            {showDetails && (
              <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="flex items-center space-x-2 cursor-not-allowed opacity-80">
                  <input type="checkbox" checked disabled className="rounded text-indigo-600" />
                  <span>Essenciais (Obrigatório)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences((p) => ({ ...p, analytics: e.target.checked }))}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Desempenho & Analytics</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences((p) => ({ ...p, marketing: e.target.checked }))}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Comunicação & Lembretes</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
          >
            <Settings className="w-3.5 h-3.5 mr-1" />
            {showDetails ? 'Ocultar Opções' : 'Personalizar'}
          </Button>

          {showDetails ? (
            <Button
              size="sm"
              onClick={handleSavePreferences}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs"
            >
              Salvar Preferências
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAcceptEssential}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs"
              >
                Apenas Essenciais
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Aceitar Todos
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LgpdCookieBanner;
