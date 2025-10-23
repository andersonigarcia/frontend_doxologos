import { createClient } from '@supabase/supabase-js';

// Use Vite env vars (must start with VITE_ to be embedded in client bundle)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
	// eslint-disable-next-line no-console
	console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Make sure to set environment variables before building.');
} else {
	console.log('🔧 [Supabase] Configuração carregada:');
	console.log('  - URL:', supabaseUrl);
	console.log('  - Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'undefined');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log de teste da conexão
console.log('🔧 [Supabase] Cliente criado:', supabase);
console.log('🔧 [Supabase] Auth:', supabase.auth);
console.log('🔧 [Supabase] REST URL:', supabase.supabaseUrl);
console.log('🔧 [Supabase] REST Key:', supabase.supabaseKey ? `${supabase.supabaseKey.substring(0, 10)}...` : 'undefined');