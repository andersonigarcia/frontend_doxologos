import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase - REQUER variáveis de ambiente
const isTestEnv = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';

const supabaseUrl = isTestEnv
  ? 'https://tests.supabase.local'
  : (import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) || 'https://ppwjtvzrhvjinsutrjwk.supabase.co');

const supabaseAnonKey = isTestEnv
  ? 'mock-anon-key-for-tests'
  : (import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) || '');



// Validação de configuração obrigatória
if (!supabaseUrl || (supabaseUrl !== 'https://tests.supabase.local' && !supabaseAnonKey)) {
  const errorMsg = '❌ ERRO: Variáveis de ambiente do Supabase não configuradas. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY';
  console.error(errorMsg);
  throw new Error(errorMsg);
}

// Log das configurações (apenas em desenvolvimento)
if (import.meta.env?.DEV) {

  console.log('🔗 Supabase Config:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : ''
  });
}


// Cliente Supabase com configurações de segurança aprimoradas
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Evitar conflitos com roteamento
    storageKey: 'doxologos-auth', // Nome personalizado para evitar conflitos
    flowType: 'pkce', // Usar PKCE para maior segurança
  },
  global: {
    headers: {
      'x-client-info': 'doxologos-web-app'
    }
  }
});

// Wrapper simples com limpeza automática de dados corrompidos
class SupabaseClientWrapper {
  constructor() {
    this.client = supabaseClient;
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    // Interceptar apenas erros críticos
    const originalGetSession = this.client.auth.getSession.bind(this.client.auth);

    this.client.auth.getSession = async (...args) => {
      try {
        const result = await originalGetSession(...args);
        return result;
      } catch (error) {
        if (this.isJWTError(error)) {
          console.warn('🔧 Erro JWT detectado, limpando storage...');
          this.cleanCorruptedData();
          return { data: { session: null }, error: null };
        }
        throw error;
      }
    };
  }

  // Proxy methods para manter compatibilidade
  get auth() { return this.client.auth; }
  get from() { return this.client.from.bind(this.client); }
  get rpc() { return this.client.rpc.bind(this.client); }
  get storage() { return this.client.storage; }
  get functions() { return this.client.functions; }
  get channel() { return this.client.channel.bind(this.client); }

  isJWTError(error) {
    if (!error) return false;
    const message = error.message?.toLowerCase() || '';
    const errorCode = error.error_code || error.code || '';

    return (
      message.includes('jwt') ||
      message.includes('invalid claim') ||
      message.includes('missing sub claim') ||
      errorCode === 'bad_jwt'
    );
  }

  cleanCorruptedData() {
    // Limpeza simples e eficaz
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });

    Object.keys(sessionStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });

    console.log('✅ Storage limpo');
  }

}

// Exportar instância única
export const supabase = new SupabaseClientWrapper();