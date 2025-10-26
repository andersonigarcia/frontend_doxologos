import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase com fallbacks seguros
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ppwjtvzrhvjinsutrjwk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwd2p0dnpyaHZqaW5zdXRyandrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mzk3NDYsImV4cCI6MjA3NjUxNTc0Nn0.U8AvVoQU6Dsf_AS38CU9X3nXJUyLpvVMj-BrCOJbcmE';

// Log das configurações (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('🔗 Supabase Config:', {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    anonKeyPrefix: supabaseAnonKey.substring(0, 20) + '...'
  });
}

// Cliente Supabase simples e robusto
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false // Evitar conflitos com roteamento
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