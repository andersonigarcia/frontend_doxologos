
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { loginRateLimiter, passwordResetRateLimiter, RateLimiter } from '@/lib/rateLimiter';
import { auditLogger, AuditAction } from '@/lib/auditLogger';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Processar sessão de forma mais simples
  const handleSession = (session) => {
    console.log('🔐 Processando sessão:', session ? 'ativa' : 'nula');

    setSession(session);
    const currentUser = session?.user ?? null;
    setUser(currentUser);

    if (currentUser) {
      setUserRole(currentUser.user_metadata?.role || 'user');
      console.log('👤 Usuário logado:', currentUser.email);
    } else {
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
          handleSession(data.session);
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

    // Registrar tentativa
    passwordResetRateLimiter.recordAttempt(email);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
      // Token expira em 1 hora (3600 segundos)
      options: {
        // Nota: O tempo de expiração é configurado no Supabase Dashboard > Authentication > Email Templates
        // Este parâmetro garante que o link será válido por 1 hora
        expiresIn: 3600
      }
    });

    if (error) {
      let errorTitle = "Erro ao enviar email";
      let errorMessage = "Não foi possível enviar o email de recuperação. Tente novamente.";

      const errorCode = error.message?.toLowerCase() || '';
      const errorStatus = error.status || 0;

      // Tratar erro 429 (Too Many Requests) do Supabase
      if (errorStatus === 429 || errorCode.includes('over_email_send_rate_limit')) {
        // Extrair tempo de espera da mensagem do erro
        const match = error.message?.match(/after (\d+) seconds/);
        const waitSeconds = match ? parseInt(match[1]) : 3600; // Default 1 hora
        const waitMinutes = Math.ceil(waitSeconds / 60);
        const waitHours = Math.floor(waitMinutes / 60);

        errorTitle = "⏰ Limite de segurança atingido";

        if (waitHours > 0) {
          errorMessage = `Por segurança, você só pode solicitar recuperação de senha novamente após ${waitHours} hora${waitHours > 1 ? 's' : ''}. Verifique se o email anterior já foi enviado ou entre em contato com o suporte.`;
        } else {
          errorMessage = `Por segurança, você só pode solicitar recuperação de senha novamente após ${waitMinutes} minuto${waitMinutes > 1 ? 's' : ''}. Verifique se o email anterior já foi enviado.`;
        }
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

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
      });
    } else {
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
    const { error } = await supabase.auth.updateUser({
      password: newPassword
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
   * Verifica se usuário tem permissão específica
   * @param {string} permission - Permissão a verificar
   * @returns {boolean} Se usuário tem permissão
   */
  const checkPermission = useCallback(
    (permission) => {
      if (!user || !userRole) {
        return false;
      }

      // Admin tem todas as permissões
      if (userRole === 'admin') {
        return true;
      }

      // Permissões base por role
      const rolePermissions = {
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

      const permissions = rolePermissions[userRole] || [];
      return permissions.includes(permission);
    },
    [user, userRole]
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
    userRole,
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
  }), [user, session, userRole, loading, signUp, signIn, signOut, signInWithMagicLink, resetPassword, updatePassword, validateSession, refreshToken, checkPermission, getSessionExpiry]);

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
