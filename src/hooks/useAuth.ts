import { useState, useEffect } from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth.service';
import { logger } from '@/lib/logger';
import type { LoginFormData, SignUpFormData } from '@/lib/validation';

interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (credentials: LoginFormData) => Promise<void>;
  signUp: (credentials: SignUpFormData) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const currentSession = await authService.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        logger.error('Failed to initialize auth', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession: Session | null) => {
        logger.info('Auth state changed', { event });
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (credentials: LoginFormData): Promise<void> => {
    setLoading(true);
    try {
      const { user: signedInUser, session: newSession } =
        await authService.signIn(credentials);
      setUser(signedInUser);
      setSession(newSession);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (credentials: SignUpFormData): Promise<void> => {
    setLoading(true);
    try {
      const { user: signedUpUser, session: newSession } =
        await authService.signUp(credentials);
      setUser(signedUpUser);
      setSession(newSession);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    setLoading(true);
    try {
      await authService.resetPassword(email);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}
