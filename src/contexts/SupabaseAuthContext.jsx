
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

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
        errorMessage = "Email ou senha incorretos. Verifique seus dados e tente novamente.";
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
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: "Não foi possível fazer logout. Tente novamente.",
      });
    } else {
      toast({
        title: "👋 Até logo!",
        description: "Você foi desconectado com sucesso.",
      });
    }

    return { error };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    userRole,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithMagicLink,
  }), [user, session, userRole, loading, signUp, signIn, signOut, signInWithMagicLink]);

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
