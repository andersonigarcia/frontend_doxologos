
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { loginRateLimiter, passwordResetRateLimiter, RateLimiter } from '@/lib/rateLimiter';
import { auditLogger, AuditAction } from '@/lib/auditLogger';
import { reportOperationalError } from '@/lib/observability/sentry';
import { clearSessionTimeoutStorage } from '@/hooks/useSessionTimeout';

const AuthContext = createContext(null);

export const ACTIVE_ROLE_STORAGE_KEY = 'doxologos_preferred_active_role';

/**
 * Resolve todos os papéis elegíveis para o usuário autenticado.
 * Todo usuário autenticado tem direito ao perfil de 'patient'.
 * Se possuir role 'professional' ou 'admin', tem direito aos respectivos papéis.
 * Admin também tem acesso a 'professional' e 'patient'.
 * 
 * @param {Object} currentUser - Objeto do usuário Supabase Auth
 * @returns {string[]} Lista de roles elegíveis normalizadas
 */
export function resolveAvailableRoles(currentUser) {
  if (!currentUser) return [];

  const roles = new Set();
  
  // 1. Todo usuário é elegível ao perfil de Paciente
  roles.add('patient');

  // 2. Extrai role do servidor (app_metadata tem prioridade, fallback em user_metadata)
  const serverRole = (currentUser.app_metadata?.role ?? currentUser.user_metadata?.role ?? '').toLowerCase();

  // 3. Extrai roles múltiplas caso existam no app_metadata.roles
  const serverRolesList = Array.isArray(currentUser.app_metadata?.roles) 
    ? currentUser.app_metadata.roles.map(r => String(r).toLowerCase())
    : [];

  serverRolesList.forEach(r => {
    if (['admin', 'professional', 'patient', 'user'].includes(r)) {
      roles.add(r === 'user' ? 'patient' : r);
    }
  });

  if (serverRole === 'admin') {
    roles.add('admin');
    roles.add('professional');
    roles.add('patient');
  } else if (serverRole === 'professional') {
    roles.add('professional');
    roles.add('patient');
  } else if (serverRole === 'patient' || serverRole === 'user') {
    roles.add('patient');
  }

  return Array.from(roles);
}

/**
 * Determina o activeRole inicial considerando persistência no localStorage e prioridade de privilégio.
 * @param {string[]} availableRoles 
 * @returns {string|null} activeRole selecionado
 */
export function resolveInitialActiveRole(availableRoles) {
  if (!availableRoles || availableRoles.length === 0) return null;

  try {
    const savedRole = localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY);
    if (savedRole && availableRoles.includes(savedRole)) {
      return savedRole;
    }
  } catch (e) {
    // LocalStorage indisponível em SSR ou storage bloqueado
  }

  // Ordem de prioridade padrão: admin > professional > patient
  if (availableRoles.includes('admin')) return 'admin';
  if (availableRoles.includes('professional')) return 'professional';
  return 'patient';
}

export function classifyResetPasswordError(error) {
  let errorTitle = "Erro ao enviar email";
  let errorMessage = "Não foi possível enviar o email de recuperação. Tente novamente.";

  const errorCode = error?.message?.toLowerCase() || '';
  const errorStatus = error?.status || 0;

  if (errorStatus === 429 || errorCode.includes('over_email_send_rate_limit')) {
    const match = error?.message?.match(/after (\d+) seconds/);
    const waitSeconds = match ? parseInt(match[1], 10) : 3600;
    const waitMinutes = Math.ceil(waitSeconds / 60);
    const waitHours = Math.floor(waitMinutes / 60);

    errorTitle = "⏰ Limite de segurança atingido";

    if (waitHours > 0) {
      errorMessage = `Por segurança, você só pode solicitar recuperação de senha novamente após ${waitHours} hora${waitHours > 1 ? 's' : ''}. Verifique se o email anterior já foi enviado ou entre em contato com o suporte.`;
    } else {
      errorMessage = `Por segurança, você só pode solicitar recuperação de senha novamente após ${waitMinutes} minuto${waitMinutes > 1 ? 's' : ''}. Verifique se o email anterior já foi enviado.`;
    }
  } else if (errorStatus >= 500 || errorCode.includes('unexpected_failure')) {
    errorTitle = "Serviço de email temporariamente indisponível";
    errorMessage = "Não foi possível enviar o email de recuperação no momento. Tente novamente em alguns instantes ou entre em contato com o suporte.";
  } else if (errorCode.includes('not found') || errorCode.includes('user not found')) {
    errorTitle = "Email não encontrado";
    errorMessage = "Não existe uma conta com este email. Verifique o email digitado.";
  } else if (errorCode.includes('rate limit')) {
    errorTitle = "Muitas tentativas";
    errorMessage = "Você fez muitas solicitações. Aguarde alguns minutos e tente novamente.";
  } else if (errorCode.includes('network')) {
    errorTitle = "Erro de conexão";
    errorMessage = "Verifique sua conexão com a internet e tente novamente.";
  }

  return { errorTitle, errorMessage };
}

export function AuthProvider({ children }) {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Processar sessão de forma flexível e resiliente
  const handleSession = (session) => {
    console.log('🔐 Processando sessão:', session ? 'ativa' : 'nula');

    setSession(session);
    const currentUser = session?.user ?? null;
    setUser(currentUser);

    if (currentUser) {
      const available = resolveAvailableRoles(currentUser);
      setAvailableRoles(available);
      const initialActive = resolveInitialActiveRole(available);
      setActiveRole(initialActive);
      setUserRole(initialActive);
      console.log('👤 Usuário autenticado | roles disponíveis:', available, '| perfil ativo:', initialActive);
    } else {
      setAvailableRoles([]);
      setActiveRole(null);
      setUserRole(null);
      console.log('👤 Usuário deslogado');
    }

    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    // Inicializar autenticação de forma robusta
    const initializeAuth = async () => {
      try {
        console.log('🚀 Inicializando autenticação...');

        if (!mounted) return;

        // Tentar obter sessão atual
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('❌ Erro ao obter sessão:', error);
          handleSession(null);
        } else {
          console.log('✅ Sessão inicial obtida');
          let currentSession = data.session;
          if (currentSession?.user) {
            const userMetaRole = (currentSession.user.user_metadata?.role || '').toLowerCase();
            const appMetaRole = (currentSession.user.app_metadata?.role || '').toLowerCase();
            if (userMetaRole === 'admin' && appMetaRole !== 'admin') {
              try {
                console.log('🔄 Sincronizando permissões de administrador (refreshSession)...');
                const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
                if (!refreshError && refreshedData?.session) {
                  currentSession = refreshedData.session;
                }
              } catch (refErr) {
                console.warn('Erro ao atualizar sessão:', refErr);
              }
            }
          }
          handleSession(currentSession);
        }
      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        if (mounted) {
          handleSession(null);
        }
      }
    };

    initializeAuth();

    // Listener para mudanças de estado
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearSessionTimeoutStorage();
      }
      if (mounted) {
        console.log('🔄 Mudança de estado auth:', event);
        handleSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email, password, options) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options,
    });

    if (error) {
      // Melhorar mensagens de erro de cadastro
      let errorTitle = "Erro ao criar conta";
      let errorMessage = "Não foi possível criar sua conta. Tente novamente.";

      const errorCode = error.message?.toLowerCase() || '';

      if (errorCode.includes('already registered') || errorCode.includes('already exists')) {
        errorTitle = "Email já cadastrado";
        errorMessage = "Já existe uma conta com este email. Faça login ou use outro email.";
      } else if (errorCode.includes('password')) {
        errorTitle = "Senha inválida";
        errorMessage = "A senha deve ter no mínimo 6 caracteres.";
      } else if (errorCode.includes('email')) {
        errorTitle = "Email inválido";
        errorMessage = "Por favor, insira um endereço de email válido.";
      }

      reportOperationalError({
        service: 'auth_signup',
        flow: 'auth',
        severity: error.status >= 500 ? 'critical' : 'warning',
        message: `Falha ao criar conta: ${error.message || errorTitle}`,
        errorCode: String(error.status || error.code || error.error_code || 'signup_error'),
        context: { errorTitle },
      });

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
    }

    return { error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    // Verificar rate limiting antes de tentar fazer login
    const rateLimitCheck = loginRateLimiter.canAttempt(email);

    if (!rateLimitCheck.allowed) {
      toast({
        variant: "destructive",
        title: "Muitas tentativas",
        description: `Você excedeu o limite de tentativas de login. Aguarde ${RateLimiter.formatWaitTime(rateLimitCheck.waitTime)} antes de tentar novamente.`,
      });
      return { error: new Error('Rate limit exceeded') };
    }

    // Registrar tentativa
    loginRateLimiter.recordAttempt(email);

    // Limpar timestamps de sessão/inatividade anteriores antes de autenticar,
    // pois onAuthStateChange dispara durante signInWithPassword e o useSessionTimeout
    // avaliaria timestamps antigos imediatamente após o login.
    clearSessionTimeoutStorage();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Melhorar mensagens de erro para o usuário
      let errorTitle = "Erro ao fazer login";
      let errorMessage = "Não foi possível realizar o login. Tente novamente.";

      // Identificar tipos específicos de erro
      const errorCode = error.message?.toLowerCase() || '';

      if (errorCode.includes('invalid login credentials') ||
        errorCode.includes('invalid') ||
        errorCode.includes('credentials')) {
        errorTitle = "Credenciais inválidas";
        errorMessage = `Email ou senha incorretos. Você tem ${rateLimitCheck.remainingAttempts} tentativa${rateLimitCheck.remainingAttempts !== 1 ? 's' : ''} restante${rateLimitCheck.remainingAttempts !== 1 ? 's' : ''}.`;
      } else if (errorCode.includes('email not confirmed')) {
        errorTitle = "Email não confirmado";
        errorMessage = "Por favor, confirme seu email antes de fazer login.";
      } else if (errorCode.includes('user not found')) {
        errorTitle = "Usuário não encontrado";
        errorMessage = "Não existe uma conta com este email. Verifique o email digitado.";
      } else if (errorCode.includes('too many requests')) {
        errorTitle = "Muitas tentativas";
        errorMessage = "Você fez muitas tentativas de login. Aguarde alguns minutos e tente novamente.";
      } else if (errorCode.includes('network')) {
        errorTitle = "Erro de conexão";
        errorMessage = "Verifique sua conexão com a internet e tente novamente.";
      }

      reportOperationalError({
        service: 'auth_login',
        flow: 'auth',
        severity: error.status >= 500 ? 'critical' : 'warning',
        message: `Falha ao fazer login: ${error.message || errorTitle}`,
        errorCode: String(error.status || error.code || error.error_code || 'login_error'),
        context: { errorTitle },
      });

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
    } else {
      // Login bem-sucedido - resetar rate limiter
      loginRateLimiter.reset(email);

      // Registrar login no audit log
      auditLogger.info(AuditAction.LOGIN, {
        details: { email, method: 'password' }
      });

      toast({
        title: "✅ Login realizado com sucesso!",
        description: "Bem-vindo(a) de volta ao Doxologos."
      });
    }

    return { error };
  }, [toast]);

  const signInWithMagicLink = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar link de acesso',
        description: 'Não foi possível enviar o link. Verifique o email e tente novamente.'
      });
    } else {
      toast({
        title: '📧 Verifique seu email',
        description: 'Enviamos um link mágico para você fazer login sem senha.'
      });
    }
    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    try {
      // Tentar fazer logout no servidor
      const { error } = await supabase.auth.signOut();

      try {
        localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
      } catch (e) {}
      clearSessionTimeoutStorage();

      // Limpar estado local mesmo se houver erro (session_not_found é aceitável)
      handleSession(null);

      if (error) {
        // Se é erro de sessão não encontrada, ainda consideramos sucesso localmente
        if (error.message?.includes('session_not_found') || error.message?.includes('Session')) {
          console.log('✅ Sessão já estava inválida, mas logout local realizado');
          toast({
            title: "👋 Até logo!",
            description: "Você foi desconectado com sucesso.",
          });
        } else {
          console.error('❌ Erro ao fazer logout:', error);
          toast({
            variant: "destructive",
            title: "Erro ao sair",
            description: "Houve um problema ao desconectar. Tente novamente.",
          });
        }
      } else {
        // Registrar logout no audit log
        auditLogger.info(AuditAction.LOGOUT);

        toast({
          title: "👋 Até logo!",
          description: "Você foi desconectado com sucesso.",
        });
      }

      return { error };
    } catch (err) {
      console.error('❌ Erro ao fazer logout:', err);
      // Em caso de erro, ainda limpar o estado local
      handleSession(null);
      toast({
        title: "👋 Até logo!",
        description: "Você foi desconectado.",
      });
      return { error: err };
    }
  }, [toast]);

  const resetPassword = useCallback(async (email) => {
    // Verificar rate limiting
    const rateLimitCheck = passwordResetRateLimiter.canAttempt(email);

    if (!rateLimitCheck.allowed) {
      toast({
        variant: "destructive",
        title: "Muitas tentativas",
        description: `Você excedeu o limite de solicitações de recuperação de senha. Aguarde ${RateLimiter.formatWaitTime(rateLimitCheck.waitTime)} antes de tentar novamente.`,
      });
      return { error: new Error('Rate limit exceeded') };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    if (error) {
      // Só consome cota local se o servidor respondeu com 429; falhas 5xx de infra não devem bloquear o usuário por 1h
      if (error.status === 429 || error.message?.toLowerCase().includes('over_email_send_rate_limit')) {
        passwordResetRateLimiter.recordAttempt(email);
      }

      const { errorTitle, errorMessage } = classifyResetPasswordError(error);

      const emailDomain = typeof email === 'string' && email.includes('@') ? email.split('@')[1] : 'unknown';
      reportOperationalError({
        service: 'auth_password_reset',
        flow: 'auth',
        severity: error.status >= 500 ? 'critical' : 'warning',
        message: `Falha ao solicitar recuperação de senha: ${error.message || errorTitle}`,
        errorCode: String(error.status || error.code || 'reset_password_error'),
        context: { emailDomain, errorTitle },
      });

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
    } else {
      passwordResetRateLimiter.recordAttempt(email);

      // Registrar solicitação de reset de senha
      auditLogger.info(AuditAction.PASSWORD_RESET, {
        details: { email }
      });

      toast({
        title: "📧 Email enviado!",
        description: "Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.",
      });
    }

    return { error };
  }, [toast]);

  const updatePassword = useCallback(async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
      data: {
        has_strong_password: true
      }
    });

    if (error) {
      let errorTitle = "Erro ao atualizar senha";
      let errorMessage = "Não foi possível atualizar sua senha. Tente novamente.";

      const normalizedCode = (error.code || error.error_code || '').toLowerCase();
      const normalizedMessage = (error.message || '').toLowerCase();

      if (
        normalizedCode === 'same_password' ||
        normalizedMessage.includes('same password') ||
        normalizedMessage.includes('different from the old password')
      ) {
        errorTitle = "Senha inalterada";
        errorMessage = "A nova senha precisa ser diferente da senha atual.";
      } else if (
        normalizedMessage.includes('at least') ||
        normalizedMessage.includes('least 6') ||
        normalizedMessage.includes('too short')
      ) {
        errorTitle = "Senha inválida";
        errorMessage = "A senha deve ter no mínimo 6 caracteres.";
      }

      reportOperationalError({
        service: 'auth_password_update',
        flow: 'auth',
        severity: error.status >= 500 ? 'critical' : 'warning',
        message: `Falha ao atualizar senha: ${error.message || errorTitle}`,
        errorCode: String(error.status || error.code || normalizedCode || 'update_password_error'),
        context: { errorTitle },
      });

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
    } else {
      // Registrar mudança de senha
      auditLogger.info(AuditAction.PASSWORD_CHANGE);

      toast({
        title: "✅ Senha atualizada!",
        description: "Sua senha foi alterada com sucesso.",
      });
    }

    return { error };
  }, [toast]);

  // ============================================
  // NOVOS MÉTODOS DE SEGURANÇA (Fase 2)
  // ============================================

  /**
   * Valida a sessão atual
   * @returns {Promise<boolean>} Se a sessão é válida
   */
  const validateSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ Erro ao validar sessão:', error);
        return false;
      }

      return !!data.session;
    } catch (error) {
      console.error('❌ Erro crítico ao validar sessão:', error);
      return false;
    }
  }, []);

  /**
   * Faz refresh do token de autenticação
   * @returns {Promise<{error: Error|null}>}
   */
  const refreshToken = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('❌ Erro ao fazer refresh de token:', error);
        return { error };
      }

      if (data.session) {
        console.log('✅ Token renovado com sucesso');
        handleSession(data.session);
      }

      return { error: null };
    } catch (error) {
      console.error('❌ Erro crítico ao fazer refresh:', error);
      return { error };
    }
  }, []);

  /**
   * Alterna o perfil ativo entre as roles disponíveis para o usuário
   * @param {string} newRole - Novo perfil desejado ('patient', 'professional', 'admin')
   * @returns {boolean} Se a troca foi realizada com sucesso
   */
  const switchActiveRole = useCallback(
    (newRole) => {
      if (!newRole) return false;
      const normalized = newRole.toLowerCase() === 'user' ? 'patient' : newRole.toLowerCase();

      if (!availableRoles.includes(normalized)) {
        console.warn(`[switchActiveRole] Role '${newRole}' não autorizada.`, { availableRoles });
        toast({
          variant: "destructive",
          title: "Perfil não autorizado",
          description: "Você não tem permissão para alternar para este perfil.",
        });
        return false;
      }

      setActiveRole(normalized);
      setUserRole(normalized);

      try {
        localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, normalized);
      } catch (e) {}

      auditLogger.info(AuditAction.ROLE_SWITCH, {
        details: { previousRole: activeRole, newRole: normalized, userId: user?.id }
      }).catch?.(() => {});

      toast({
        title: "Perfil alternado",
        description: `Navegando agora como ${
          normalized === 'admin' ? 'Administrador' : normalized === 'professional' ? 'Profissional' : 'Paciente'
        }.`,
      });

      return true;
    },
    [availableRoles, activeRole, toast, user]
  );

  /**
   * Verifica se usuário tem permissão específica
   * @param {string} permission - Permissão a verificar
   * @returns {boolean} Se usuário tem permissão
   */
  const checkPermission = useCallback(
    (permission) => {
      const currentRole = activeRole || userRole;
      if (!user || !currentRole) {
        return false;
      }

      // Admin tem todas as permissões
      if (currentRole === 'admin') {
        return true;
      }

      // Permissões base por role
      const rolePermissions = {
        patient: [
          'booking:create',
          'booking:view_own',
          'booking:cancel_own',
          'booking:reschedule_own',
          'profile:view_own',
          'profile:edit_own',
        ],
        user: [
          'booking:create',
          'booking:view_own',
          'booking:cancel_own',
          'booking:reschedule_own',
          'profile:view_own',
          'profile:edit_own',
        ],
        professional: [
          'booking:create',
          'booking:view_own',
          'booking:view_assigned',
          'booking:manage_assigned',
          'profile:view_own',
          'profile:edit_own',
          'availability:manage_own',
          'dashboard:view_professional',
        ],
      };

      const permissions = rolePermissions[currentRole] || [];
      return permissions.includes(permission);
    },
    [user, activeRole, userRole]
  );

  /**
   * Obtém timestamp de expiração da sessão
   * @returns {number|null} Timestamp de expiração ou null
   */
  const getSessionExpiry = useCallback(() => {
    if (!session?.expires_at) {
      return null;
    }
    return session.expires_at * 1000; // Converter para ms
  }, [session]);

  const value = useMemo(() => ({
    user,
    session,
    userRole: activeRole || userRole,
    activeRole: activeRole || userRole,
    availableRoles,
    isHybridUser: availableRoles.length > 1,
    switchActiveRole,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithMagicLink,
    resetPassword,
    updatePassword,
    // Novos métodos de segurança (Fase 2)
    validateSession,
    refreshToken,
    checkPermission,
    getSessionExpiry,
  }), [user, session, userRole, activeRole, availableRoles, switchActiveRole, loading, signUp, signIn, signOut, signInWithMagicLink, resetPassword, updatePassword, validateSession, refreshToken, checkPermission, getSessionExpiry]);

  // Sempre renderiza children - componentes individuais decidem se mostram loading
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook separado para compatibilidade com Fast Refresh
function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { useAuth };
