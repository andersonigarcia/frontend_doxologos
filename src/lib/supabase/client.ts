import { createClient } from '@supabase/supabase-js';
import { logger } from '../logger';

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const error = new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
  logger.error('Supabase configuration error', error);
  throw error;
}

// Create Supabase client with retry configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
  global: {
    headers: {
      'x-app-name': import.meta.env.VITE_APP_NAME || 'Doxologos',
    },
  },
  db: {
    schema: 'public',
  },
});

// Health check function
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('_health_check').select('*').limit(1);
    if (error && !error.message.includes('does not exist')) {
      logger.warn('Supabase health check failed', error);
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Supabase connection error', error);
    return false;
  }
}
