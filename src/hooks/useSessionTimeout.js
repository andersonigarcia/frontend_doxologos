/**
 * Hook de Controle de Sessão e Inatividade
 * Implementa logout automático por inatividade e expiração de sessão
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';

// Configurações padrão (em milissegundos)
const DEFAULT_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutos de inatividade
const DEFAULT_SESSION_TIMEOUT = 4 * 60 * 60 * 1000; // 4 horas de sessão total
const WARNING_BEFORE_LOGOUT = 2 * 60 * 1000; // Avisar 2 minutos antes

export const useSessionTimeout = (options = {}) => {
  const {
    idleTimeout = DEFAULT_IDLE_TIMEOUT,
    sessionTimeout = DEFAULT_SESSION_TIMEOUT,
    warningTime = WARNING_BEFORE_LOGOUT,
    enabled = true,
    onTimeout = null,
    onWarning = null
  } = options;

  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const lastActivityRef = useRef(Date.now());
  const sessionStartRef = useRef(Date.now());
  const warningShownRef = useRef(false);
  const timeoutIdRef = useRef(null);
  const checkIntervalRef = useRef(null);

  // Atualizar último momento de atividade
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  // Fazer logout por timeout
  const handleTimeout = useCallback(async (reason = 'inatividade') => {
    console.log(`🔒 Logout automático por ${reason}`);
    
    toast({
      variant: 'destructive',
      title: 'Sessão Expirada',
      description: `Você foi desconectado por ${reason}. Por favor, faça login novamente.`,
      duration: 5000,
    });

    if (onTimeout) {
      onTimeout(reason);
    }

    await signOut();
  }, [signOut, toast, onTimeout]);

  // Mostrar aviso antes do logout
  const showWarning = useCallback((timeRemaining) => {
    if (warningShownRef.current) return;
    
    warningShownRef.current = true;
    const minutes = Math.ceil(timeRemaining / 60000);
    
    toast({
      title: '⏰ Sua sessão está prestes a expirar',
      description: `Você será desconectado em ${minutes} minuto${minutes > 1 ? 's' : ''} por inatividade. Mova o mouse ou pressione uma tecla para continuar.`,
      duration: 10000,
    });

    if (onWarning) {
      onWarning(timeRemaining);
    }
  }, [toast, onWarning]);

  // Verificar timeout de inatividade e sessão
  const checkTimeout = useCallback(() => {
    if (!user || !enabled) return;

    const now = Date.now();
    const idleTime = now - lastActivityRef.current;
    const sessionTime = now - sessionStartRef.current;

    // Verificar timeout de sessão total (mais prioritário)
    if (sessionTime >= sessionTimeout) {
      handleTimeout('tempo máximo de sessão');
      return;
    }

    // Verificar timeout de inatividade
    if (idleTime >= idleTimeout) {
      handleTimeout('inatividade');
      return;
    }

    // Mostrar aviso se está próximo do timeout de inatividade
    const timeUntilIdle = idleTimeout - idleTime;
    if (timeUntilIdle <= warningTime && !warningShownRef.current) {
      showWarning(timeUntilIdle);
    }

    // Mostrar aviso se está próximo do timeout de sessão
    const timeUntilSession = sessionTimeout - sessionTime;
    if (timeUntilSession <= warningTime && !warningShownRef.current) {
      showWarning(timeUntilSession);
    }
  }, [user, enabled, idleTimeout, sessionTimeout, warningTime, handleTimeout, showWarning]);

  // Configurar listeners de atividade
  useEffect(() => {
    if (!user || !enabled) return;

    console.log('🔐 Controle de sessão ativado', {
      idleTimeout: `${idleTimeout / 60000} minutos`,
      sessionTimeout: `${sessionTimeout / 60000} minutos`,
      warningTime: `${warningTime / 60000} minutos`
    });

    // Resetar contadores quando usuário logar
    sessionStartRef.current = Date.now();
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    // Eventos que indicam atividade do usuário
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Throttle para não atualizar a cada movimento
    let throttleTimeout = null;
    const throttledUpdate = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          updateActivity();
          throttleTimeout = null;
        }, 1000); // Atualiza no máximo a cada 1 segundo
      }
    };

    // Adicionar listeners
    events.forEach(event => {
      window.addEventListener(event, throttledUpdate);
    });

    // Verificar timeout periodicamente (a cada 30 segundos)
    checkIntervalRef.current = setInterval(checkTimeout, 30000);

    // Verificação inicial
    checkTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, throttledUpdate);
      });
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [user, enabled, updateActivity, checkTimeout]);

  // Retornar funções úteis
  return {
    updateActivity,
    getRemainingIdleTime: () => idleTimeout - (Date.now() - lastActivityRef.current),
    getRemainingSessionTime: () => sessionTimeout - (Date.now() - sessionStartRef.current),
    resetSession: () => {
      sessionStartRef.current = Date.now();
      lastActivityRef.current = Date.now();
      warningShownRef.current = false;
    }
  };
};

export default useSessionTimeout;
