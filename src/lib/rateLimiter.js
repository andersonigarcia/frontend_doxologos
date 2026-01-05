/**
 * Rate Limiter para Frontend
 * 
 * Previne tentativas excessivas de ações (login, submissões, etc)
 */
export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  /**
   * Verifica se uma ação pode ser executada
   * 
   * @param {string} key - Identificador único (email, IP, userId, etc)
   * @returns {Object} { allowed: boolean, remainingAttempts: number, waitTime: number }
   */
  canAttempt(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    
    // Remover tentativas fora da janela de tempo
    const recentAttempts = userAttempts.filter(
      time => now - time < this.windowMs
    );
    
    // Atualizar lista de tentativas
    this.attempts.set(key, recentAttempts);
    
    // Verificar se excedeu limite
    if (recentAttempts.length >= this.maxAttempts) {
      const oldestAttempt = Math.min(...recentAttempts);
      const waitTime = Math.ceil((this.windowMs - (now - oldestAttempt)) / 1000);
      
      return { 
        allowed: false, 
        remainingAttempts: 0,
        waitTime 
      };
    }
    
    return { 
      allowed: true, 
      remainingAttempts: this.maxAttempts - recentAttempts.length - 1,
      waitTime: 0 
    };
  }

  /**
   * Registra uma tentativa
   * 
   * @param {string} key - Identificador único
   */
  recordAttempt(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];
    userAttempts.push(now);
    this.attempts.set(key, userAttempts);
  }

  /**
   * Reseta tentativas de um usuário
   * 
   * @param {string} key - Identificador único
   */
  reset(key) {
    this.attempts.delete(key);
  }

  /**
   * Limpa tentativas antigas (limpeza de memória)
   */
  cleanup() {
    const now = Date.now();
    
    for (const [key, attempts] of this.attempts.entries()) {
      const recentAttempts = attempts.filter(
        time => now - time < this.windowMs
      );
      
      if (recentAttempts.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, recentAttempts);
      }
    }
  }

  /**
   * Obtém tempo de espera formatado
   * 
   * @param {number} seconds - Segundos de espera
   * @returns {string} Tempo formatado
   */
  static formatWaitTime(seconds) {
    if (seconds < 60) {
      return `${seconds} segundo${seconds !== 1 ? 's' : ''}`;
    }
    
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  }
}

/**
 * Rate limiters pré-configurados para diferentes ações
 */

// Rate limiter para tentativas de login
// 5 tentativas a cada 15 minutos
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000);

// Rate limiter para reset de senha
// 3 tentativas a cada 30 minutos
export const passwordResetRateLimiter = new RateLimiter(3, 30 * 60 * 1000);

// Rate limiter para envio de formulários
// 10 tentativas a cada 5 minutos
export const formSubmitRateLimiter = new RateLimiter(10, 5 * 60 * 1000);

// Rate limiter para requisições de API
// 30 tentativas por minuto
export const apiRateLimiter = new RateLimiter(30, 60 * 1000);

/**
 * Hook auxiliar para usar com React
 * 
 * Exemplo de uso:
 * 
 * const handleLogin = async (email, password) => {
 *   const check = loginRateLimiter.canAttempt(email);
 *   
 *   if (!check.allowed) {
 *     toast({
 *       variant: 'destructive',
 *       title: 'Muitas tentativas',
 *       description: `Aguarde ${RateLimiter.formatWaitTime(check.waitTime)} antes de tentar novamente.`
 *     });
 *     return;
 *   }
 *   
 *   loginRateLimiter.recordAttempt(email);
 *   
 *   // Continuar com o login...
 * };
 */

// Limpeza periódica de memória (a cada hora)
if (typeof window !== 'undefined') {
  setInterval(() => {
    loginRateLimiter.cleanup();
    passwordResetRateLimiter.cleanup();
    formSubmitRateLimiter.cleanup();
    apiRateLimiter.cleanup();
  }, 60 * 60 * 1000);
}
