import { createClient } from '@supabase/supabase-js';

// Use Vite env vars (must start with VITE_ to be embedded in client bundle)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
	// eslint-disable-next-line no-console
	console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Make sure to set environment variables before building.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);