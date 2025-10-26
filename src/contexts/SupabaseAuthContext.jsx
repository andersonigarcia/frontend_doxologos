
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
      toast({
        variant: "destructive",
        title: "Sign up Failed",
        description: error.message || "Something went wrong",
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
      toast({
        variant: "destructive",
        title: "Sign in Failed",
        description: error.message || "Credenciais inválidas.",
      });
    } else {
        toast({ title: "Login bem-sucedido!" });
    }

    return { error };
  }, [toast]);

  const signInWithMagicLink = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao enviar magic link', description: error.message });
    } else {
      toast({ title: 'Verifique seu e-mail', description: 'Enviamos um link para login.' });
    }
    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        variant: "destructive",
        title: "Sign out Failed",
        description: error.message || "Something went wrong",
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
