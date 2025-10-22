import { AuthError } from '@supabase/supabase-js';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export type SupabaseError = AuthError | Error;
