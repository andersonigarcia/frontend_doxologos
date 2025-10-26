/**
 * Sistema de Logging Centralizado - Doxologos
 * 
 * Gerencia logs de forma inteligente:
 * - Em desenvolvimento: exibe tudo no console
 * - Em produção: filtra informações sensíveis e pode enviar para serviço externo
 */

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
    this.logBuffer = [];
    this.maxBufferSize = 100;
  }

  /**
   * Sanitiza dados removendo informações sensíveis
   */
  sanitize(data) {
    if (!data) return data;
    
    const sanitized = JSON.parse(JSON.stringify(data));
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'authorization', 'api_key'];
    
    const recursiveSanitize = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      Object.keys(obj).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          recursiveSanitize(obj[key]);
        }
      });
      
      return obj;
    };
    
    return recursiveSanitize(sanitized);
  }

  /**
   * Adiciona log ao buffer para possível envio posterior
   */
  addToBuffer(level, message, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: this.sanitize(data),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.logBuffer.push(logEntry);
    
    // Limita tamanho do buffer
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Log de informação geral
   */
  info(message, data = null) {
    if (this.isDevelopment) {
      console.info(`ℹ️ ${message}`, data || '');
    }
    this.addToBuffer('info', message, data);
  }

  /**
   * Log de aviso
   */
  warn(message, data = null) {
    if (this.isDevelopment) {
      console.warn(`⚠️ ${message}`, data || '');
    }
    this.addToBuffer('warn', message, data);
  }

  /**
   * Log de erro
   */
  error(message, error = null, context = {}) {
    const errorData = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      code: error?.code,
      ...context
    };

    if (this.isDevelopment) {
      console.error(`❌ ${message}`, errorData);
    } else {
      // Em produção, apenas log sanitizado
      console.error(`❌ ${message}`, this.sanitize(errorData));
    }

    this.addToBuffer('error', message, errorData);
    
    // Em produção, poderia enviar para serviço de tracking
    // this.sendToTrackingService(errorData);
  }

  /**
   * Log de erro de API/Supabase
   */
  apiError(operation, error, additionalContext = {}) {
    const context = {
      operation,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorDetails: error?.details,
      hint: error?.hint,
      ...additionalContext
    };

    this.error(`Erro na operação: ${operation}`, error, context);
  }

  /**
   * Log de sucesso (apenas em dev)
   */
  success(message, data = null) {
    if (this.isDevelopment) {
      console.log(`✅ ${message}`, data || '');
    }
    this.addToBuffer('success', message, data);
  }

  /**
   * Log de debug detalhado (apenas em dev)
   */
  debug(message, data = null) {
    if (this.isDevelopment) {
      console.debug(`🐛 ${message}`, data);
    }
  }

  /**
   * Obtém logs do buffer (útil para debug ou envio para suporte)
   */
  getLogs() {
    return this.logBuffer;
  }

  /**
   * Limpa buffer de logs
   */
  clearLogs() {
    this.logBuffer = [];
  }

  /**
   * Exporta logs para download (útil para suporte técnico)
   */
  exportLogs() {
    const logsJson = JSON.stringify(this.logBuffer, null, 2);
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doxologos-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Exporta instância singleton
export const logger = new Logger();

// Exporta também a classe para testes
export default Logger;
