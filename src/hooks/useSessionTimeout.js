/**
 * Hook de Controle de Sessão e Inatividade com Sincronização Cross-Tab
 * Implementa logout automático por inatividade e expiração de sessão absoluta (máx 6h)
 * Suporta parametrização via painel de administração (useSystemSettings).
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useSystemSettings } from '@/hooks/useSystemSettings';

const WARNING_BEFORE_LOGOUT = 2 * 60 * 1000; // Avisar 2 minutos antes
const STORAGE_KEY_ACTIVITY = 'doxologos_last_activity';
const STORAGE_KEY_SESSION_START = 'doxologos_session_start';

export const useSessionTimeout = (options = {}) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { settings } = useSystemSettings();

  // Calcular limites dinâmicos com base em configurações (fallback: 15 min inatividade, 6h sessão max)
  const idleTimeoutMs = options.idleTimeout ?? ((settings?.session_idle_timeout_minutes ?? 15) * 60 * 1000);
  const sessionTimeoutMs = options.sessionTimeout ?? ((settings?.session_max_duration_hours ?? 6) * 60 * 60 * 1000);
  const warningTimeMs = options.warningTime ?? WARNING_BEFORE_LOGOUT;
  const enabled = options.enabled ?? true;
  const onTimeout = options.onTimeout || null;
  const onWarning = options.onWarning || null;

  const lastActivityRef = useRef(Date.now());
  const sessionStartRef = useRef(Date.now());
  const warningShownRef = useRef(false);
  const checkIntervalRef = useRef(null);

  // Sincronizar atividade entre abas via LocalStorage
  const syncActivityToStorage = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    warningShownRef.current = false;
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVITY, now.toString());
    } catch (e) {
      // Ignorar erros de quota/private browsing se ocorrerem
    }
  }, []);

  // Fazer logout por timeout
  const handleTimeout = useCallback(async (reason = 'inatividade') => {
    console.log(`🔒 Logout automático disparado (${reason})`);
    
    // Limpar marcadores cross-tab
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVITY);
      localStorage.removeItem(STORAGE_KEY_SESSION_START);
    } catch (e) {}

    const isHardTimeout = reason.includes('máximo');

    toast({
      variant: 'destructive',
      title: isHardTimeout ? '⏰ Sessão Encerrada (Limite 6h)' : '🔒 Sessão Expirada por Inatividade',
      description: isHardTimeout 
        ? 'Sessão encerrada por atingir o limite máximo contínuo. Por favor, faça login novamente para sua segurança.'
        : 'Você foi desconectado por inatividade. Por favor, faça login novamente.',
      duration: 7000,
    });

    if (onTimeout) {
      onTimeout(reason);
    }

    await signOut();
  }, [signOut, toast, onTimeout]);

  // Mostrar aviso prévio antes do logout
  const showWarning = useCallback((timeRemainingMs, type = 'inatividade') => {
    if (warningShownRef.current) return;
    
    warningShownRef.current = true;
    const minutes = Math.ceil(timeRemainingMs / 60000);
    
    toast({
      title: '⏰ Sua sessão está prestes a expirar',
      description: type === 'sessao'
        ? `Sua sessão atingirá o limite máximo em ${minutes} minuto${minutes > 1 ? 's' : ''}. Salve seu trabalho.`
        : `Você será desconectado em ${minutes} minuto${minutes > 1 ? 's' : ''} por inatividade. Mova o mouse ou pressione uma tecla para continuar.`,
      duration: 10000,
    });

    if (onWarning) {
      onWarning(timeRemainingMs);
    }
  }, [toast, onWarning]);

  // Checar condições de timeout considerando a hora mais recente entre todas as abas
  const checkTimeout = useCallback(() => {
    if (!user || !enabled) return;

    const now = Date.now();

    // Ler atividade cross-tab mais recente
    let storedLastActivity = lastActivityRef.current;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ACTIVITY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > storedLastActivity) {
          storedLastActivity = parsed;
          lastActivityRef.current = parsed;
        }
      }
    } catch (e) {}

    // Ler início da sessão cross-tab
    let storedSessionStart = sessionStartRef.current;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSION_START);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) {
          storedSessionStart = parsed;
          sessionStartRef.current = parsed;
        }
      }
    } catch (e) {}

    const idleTime = now - storedLastActivity;
    const sessionTime = now - storedSessionStart;

    // 1. Timeout de sessão total (Hard Timeout - Máx 6h)
    if (sessionTime >= sessionTimeoutMs) {
      handleTimeout('tempo máximo de sessão');
      return;
    }

    // 2. Timeout de inatividade (Idle Timeout)
    if (idleTime >= idleTimeoutMs) {
      handleTimeout('inatividade');
      return;
    }

    // 3. Aviso prévio de inatividade
    const timeUntilIdle = idleTimeoutMs - idleTime;
    if (timeUntilIdle <= warningTimeMs && !warningShownRef.current) {
      showWarning(timeUntilIdle, 'inatividade');
    }

    // 4. Aviso prévio de hard timeout
    const timeUntilSession = sessionTimeoutMs - sessionTime;
    if (timeUntilSession <= warningTimeMs && !warningShownRef.current) {
      showWarning(timeUntilSession, 'sessao');
    }
  }, [user, enabled, idleTimeoutMs, sessionTimeoutMs, warningTimeMs, handleTimeout, showWarning]);

  // Efeito principal de escuta e ciclo de vida da sessão
  useEffect(() => {
    if (!user || !enabled) return;

    // Inicializar timestamp da sessão em localStorage se não existir
    const now = Date.now();
    try {
      const existingSessionStart = localStorage.getItem(STORAGE_KEY_SESSION_START);
      if (!existingSessionStart) {
        localStorage.setItem(STORAGE_KEY_SESSION_START, now.toString());
        sessionStartRef.current = now;
      } else {
        sessionStartRef.current = parseInt(existingSessionStart, 10) || now;
      }

      const existingActivity = localStorage.getItem(STORAGE_KEY_ACTIVITY);
      if (!existingActivity) {
        localStorage.setItem(STORAGE_KEY_ACTIVITY, now.toString());
        lastActivityRef.current = now;
      } else {
        lastActivityRef.current = parseInt(existingActivity, 10) || now;
      }
    } catch (e) {}

    console.log('🔐 Controle de sessão ativo (Cross-Tab Sync)', {
      idleTimeoutMinutes: idleTimeoutMs / 60000,
      maxSessionHours: sessionTimeoutMs / (60 * 60 * 1000),
      warningMinutes: warningTimeMs / 60000
    });

    // Escutar eventos de atividade na aba atual
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    let throttleTimeout = null;
    const throttledUpdate = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          syncActivityToStorage();
          throttleTimeout = null;
        }, 2000); // Atualiza no máximo 1x a cada 2 segundos por performance
      }
    };

    events.forEach(ev => window.addEventListener(ev, throttledUpdate, { passive: true }));

    // Escutar sincronização de outras abas (storage event)
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY_ACTIVITY && e.newValue) {
        const val = parseInt(e.newValue, 10);
        if (!isNaN(val) && val > lastActivityRef.current) {
          lastActivityRef.current = val;
          warningShownRef.current = false;
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Intervalo de verificação de expiração (a cada 15s)
    checkIntervalRef.current = setInterval(checkTimeout, 15000);

    // Checagem imediata
    checkTimeout();

    return () => {
      events.forEach(ev => window.removeEventListener(ev, throttledUpdate));
      window.removeEventListener('storage', handleStorageChange);

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [user, enabled, idleTimeoutMs, sessionTimeoutMs, warningTimeMs, syncActivityToStorage, checkTimeout]);

  return {
    updateActivity: syncActivityToStorage,
    getRemainingIdleTime: () => Math.max(0, idleTimeoutMs - (Date.now() - lastActivityRef.current)),
    getRemainingSessionTime: () => Math.max(0, sessionTimeoutMs - (Date.now() - sessionStartRef.current)),
  };
};

export default useSessionTimeout;
