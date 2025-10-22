import { supabase } from '@/lib/supabase';
import { withRetry, withTimeout } from '@/lib/api';
import { logger } from '@/lib/logger';
import { AuthenticationError, handleError } from '@/lib/errors';
import {
  safeValidate,
  loginSchema,
  signUpSchema,
  type LoginFormData,
  type SignUpFormData,
} from '@/lib/validation';
import type { User, Session } from '@supabase/supabase-js';

export class AuthService {
  /**
   * Sign in with email and password
   */
  async signIn(credentials: LoginFormData): Promise<{
    user: User;
    session: Session;
  }> {
    try {
      // Validate input
      const validData = safeValidate(loginSchema, credentials);

      logger.info('Attempting to sign in user', { email: validData.email });

      const { data, error } = await withTimeout(
        withRetry(
          async () =>
            await supabase.auth.signInWithPassword({
              email: validData.email,
              password: validData.password,
            }),
          { maxRetries: 2 }
        )
      );

      if (error) {
        throw new AuthenticationError(error.message);
      }

      if (!data.user || !data.session) {
        throw new AuthenticationError('Sign in failed');
      }

      logger.info('User signed in successfully', { userId: data.user.id });

      return { user: data.user, session: data.session };
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(
    credentials: SignUpFormData
  ): Promise<{ user: User; session: Session | null }> {
    try {
      // Validate input
      const validData = safeValidate(signUpSchema, credentials);

      logger.info('Attempting to sign up user', { email: validData.email });

      const { data, error } = await withTimeout(
        withRetry(
          async () =>
            await supabase.auth.signUp({
              email: validData.email,
              password: validData.password,
              options: {
                data: {
                  name: validData.name,
                },
              },
            }),
          { maxRetries: 2 }
        )
      );

      if (error) {
        throw new AuthenticationError(error.message);
      }

      if (!data.user) {
        throw new AuthenticationError('Sign up failed');
      }

      logger.info('User signed up successfully', { userId: data.user.id });

      return { user: data.user, session: data.session };
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      logger.info('Attempting to sign out user');

      const { error } = await withTimeout(
        withRetry(async () => await supabase.auth.signOut())
      );

      if (error) {
        throw new AuthenticationError(error.message);
      }

      logger.info('User signed out successfully');
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        logger.warn('Failed to get session', error);
        return null;
      }

      return data.session;
    } catch (error) {
      logger.error('Error getting session', error);
      return null;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        logger.warn('Failed to get user', error);
        return null;
      }

      return user;
    } catch (error) {
      logger.error('Error getting user', error);
      return null;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<void> {
    try {
      logger.info('Attempting to reset password', { email });

      const { error } = await withTimeout(
        withRetry(
          async () =>
            await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/reset-password`,
            })
        )
      );

      if (error) {
        throw new AuthenticationError(error.message);
      }

      logger.info('Password reset email sent successfully');
    } catch (error) {
      throw handleError(error);
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      logger.info('Attempting to update password');

      const { error } = await withTimeout(
        withRetry(
          async () =>
            await supabase.auth.updateUser({
              password: newPassword,
            })
        )
      );

      if (error) {
        throw new AuthenticationError(error.message);
      }

      logger.info('Password updated successfully');
    } catch (error) {
      throw handleError(error);
    }
  }
}

export const authService = new AuthService();
