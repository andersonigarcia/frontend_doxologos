/**
 * Sistema de Logging Seguro
 * 
 * Previne exposição de dados sensíveis em produção
 */

const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

/**
 * Logger seguro que respeita o ambiente
 */
export const secureLog = {
  /**
   * Log informativo - apenas em desenvolvimento
   */
  info: (...args) => {
    if (isDev) {
      console.log('ℹ️', ...args);
    }
  },

  /**
   * Log de sucesso - apenas em desenvolvimento
   */
  success: (...args) => {
    if (isDev) {
      console.log('✅', ...args);
    }
  },

  /**
   * Log de aviso - sempre exibido
   */
  warn: (...args) => {
    console.warn('⚠️', ...args);
  },

  /**
   * Log de erro - sempre exibido
   */
  error: (...args) => {
    console.error('❌', ...args);
    
    // Em produção, enviar para serviço de monitoring
    if (isProd) {
      // TODO: Integrar com Sentry, LogRocket, etc
      // Exemplo: Sentry.captureException(args[0]);
    }
  },

  /**
   * Log de debug - apenas em desenvolvimento
   */
  debug: (...args) => {
    if (isDev) {
      console.debug('🔍', ...args);
    }
  },

  /**
   * Log de dados sensíveis - NUNCA em produção
   * Use este método para logar tokens, senhas, etc durante desenvolvimento
   */
  sensitive: (...args) => {
    if (isDev) {
      console.log('🔐 [SENSITIVE]', ...args);
    }
  },

  /**
   * Log de performance - apenas em desenvolvimento
   */
  performance: (label, duration) => {
    if (isDev) {
      console.log(`⏱️ [PERFORMANCE] ${label}: ${duration}ms`);
    }
  },

  /**
   * Grupo de logs - apenas em desenvolvimento
   */
  group: (label, collapsed = false) => {
    if (isDev) {
      if (collapsed) {
        console.groupCollapsed(label);
      } else {
        console.group(label);
      }
    }
  },

  groupEnd: () => {
    if (isDev) {
      console.groupEnd();
    }
  },

  /**
   * Tabela - apenas em desenvolvimento
   */
  table: (data) => {
    if (isDev) {
      console.table(data);
    }
  },

  /**
   * Timer - apenas em desenvolvimento
   */
  time: (label) => {
    if (isDev) {
      console.time(label);
    }
  },

  timeEnd: (label) => {
    if (isDev) {
      console.timeEnd(label);
    }
  }
};

/**
 * Helper para logar requisições HTTP
 */
export const logRequest = (method, url, data = null) => {
  if (isDev) {
    secureLog.group(`🌐 ${method} ${url}`, true);
    if (data) {
      console.log('Request data:', data);
    }
    secureLog.groupEnd();
  }
};

/**
 * Helper para logar respostas HTTP
 */
export const logResponse = (method, url, status, data = null) => {
  if (isDev) {
    const emoji = status >= 200 && status < 300 ? '✅' : '❌';
    secureLog.group(`${emoji} ${method} ${url} - ${status}`, true);
    if (data) {
      console.log('Response data:', data);
    }
    secureLog.groupEnd();
  }
};

/**
 * Helper para logar erros de requisição
 */
export const logRequestError = (method, url, error) => {
  console.error(`❌ ${method} ${url} - Error:`, error.message);
  
  if (isDev) {
    console.error('Full error:', error);
  }
};

/**
 * Reduz dados sensíveis para logging seguro
 * Remove ou mascara campos sensíveis
 */
export const sanitizeForLogging = (data, sensitiveFields = []) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const defaultSensitiveFields = [
    'password',
    'senha',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'apiKey',
    'secret',
    'private_key',
    'privateKey',
    'credit_card',
    'creditCard',
    'cvv',
    'cpf',
    'ssn'
  ];

  const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];

  const sanitized = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = allSensitiveFields.some(field => 
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '***REDACTED***';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeForLogging(value, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Log seguro de objeto com dados potencialmente sensíveis
 */
export const logSanitized = (label, data, additionalSensitiveFields = []) => {
  if (isDev) {
    const sanitized = sanitizeForLogging(data, additionalSensitiveFields);
    console.log(label, sanitized);
  }
};
