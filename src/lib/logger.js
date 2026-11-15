/**
 * Sistema de Logging Centralizado - Doxologos
 * 
 * Níveis de Log Configuráveis:
 * - SILENT (0): Sem logs (produção padrão)
 * - ERROR (1): Apenas erros críticos
 * - WARN (2): Erros + Avisos
 * - INFO (3): Erros + Avisos + Informações importantes
 * - DEBUG (4): Todos os logs detalhados
 * 
 * Configuração:
 * - Via ENV: VITE_LOG_LEVEL=INFO
 * - Via localStorage: localStorage.setItem('doxologos_log_level', 'DEBUG')
 * - Via console: window.setLogLevel('DEBUG')
 */

// Níveis de log
export const LOG_LEVELS = {
  SILENT: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4
};

class Logger {
  constructor() {
    const isNode = typeof process !== 'undefined' && process.env;
    this.isDevelopment = isNode ? (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) : import.meta.env.DEV;
    this.isProduction = isNode ? process.env.NODE_ENV === 'production' : import.meta.env.PROD;
    this.logBuffer = [];
    this.maxBufferSize = 100;

    // Nível de log configurável
    this.currentLevel = this.getInitialLogLevel();

    // Expõe métodos globais para toggle rápido em produção
    if (typeof window !== 'undefined') {
      window.__DOXOLOGOS_LOGGER__ = this;

      // Comandos globais para debug rápido
      window.setLogLevel = (level) => this.setLevel(level);
      window.getLogLevel = () => this.getLevelName();
      window.enableDebugLogs = () => this.setLevel('DEBUG');
      window.enableInfoLogs = () => this.setLevel('INFO');
      window.disableLogs = () => this.setLevel('SILENT');
      window.downloadLogs = () => this.exportLogs();
      window.viewLogs = () => {
        console.table(this.logBuffer);
        return this.logBuffer;
      };
    }
  }

  /**
   * Determina o nível inicial de log
   */
  getInitialLogLevel() {
    // 1. Verifica ENV variable (build time)
    const isNode = typeof process !== 'undefined' && process.env;
    const envLevel = isNode ? process.env.VITE_LOG_LEVEL : import.meta.env.VITE_LOG_LEVEL;
    if (envLevel && LOG_LEVELS[envLevel.toUpperCase()] !== undefined) {
      return LOG_LEVELS[envLevel.toUpperCase()];
    }

    // 2. Verifica localStorage (runtime - permite toggle em produção)
    if (typeof window !== 'undefined') {
      const storedLevel = localStorage.getItem('doxologos_log_level');
      if (storedLevel && LOG_LEVELS[storedLevel] !== undefined) {
        return LOG_LEVELS[storedLevel];
      }
    }

    // 3. Padrão: DEBUG em dev, SILENT em prod
    return this.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.SILENT;
  }

  /**
   * Muda o nível de log dinamicamente (persiste no localStorage)
   */
  setLevel(level) {
    const levelName = typeof level === 'string' ? level.toUpperCase() : level;
    const levelValue = typeof levelName === 'string'
      ? LOG_LEVELS[levelName]
      : levelName;

    if (levelValue === undefined) {
      console.error(`❌ Invalid log level: ${level}. Valid: SILENT, ERROR, WARN, INFO, DEBUG`);
      return;
    }

    this.currentLevel = levelValue;

    // Persiste no localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('doxologos_log_level', this.getLevelName());
    }

    console.log(`🔧 Log level changed to: ${this.getLevelName()}`);
  }

  /**
   * Obtém o nome do nível atual
   */
  getLevelName() {
    return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === this.currentLevel) || 'UNKNOWN';
  }

  /**
   * Verifica se deve logar neste nível
   */
  shouldLog(level) {
    return this.currentLevel >= level;
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
    // Em modo SILENT, não adiciona ao buffer (exceto ERRORs críticos)
    if (this.currentLevel === LOG_LEVELS.SILENT && level !== 'error') {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: this.sanitize(data),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    this.logBuffer.push(logEntry);

    // Limita tamanho do buffer
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Log de informação geral (INFO level)
   */
  info(message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;

    if (this.isDevelopment || this.currentLevel >= LOG_LEVELS.INFO) {
      console.info(`ℹ️ [INFO] ${message}`, data || '');
    }
    this.addToBuffer('info', message, data);
  }

  /**
   * Log de aviso (WARN level)
   */
  warn(message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.WARN)) return;

    if (this.isDevelopment || this.currentLevel >= LOG_LEVELS.WARN) {
      console.warn(`⚠️ [WARN] ${message}`, data || '');
    }
    this.addToBuffer('warn', message, data);
  }

  /**
   * Log de erro (ERROR level - sempre adiciona ao buffer)
   */
  error(message, error = null, context = {}) {
    if (!this.shouldLog(LOG_LEVELS.ERROR)) return;

    const errorData = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      code: error?.code,
      ...context
    };

    if (this.isDevelopment || this.currentLevel >= LOG_LEVELS.ERROR) {
      console.error(`❌ [ERROR] ${message}`, this.sanitize(errorData));
    }

    // Erros SEMPRE vão para o buffer (mesmo em SILENT)
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
   * Log de sucesso (INFO level)
   */
  success(message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;

    if (this.isDevelopment || this.currentLevel >= LOG_LEVELS.INFO) {
      console.log(`✅ [SUCCESS] ${message}`, data || '');
    }
    this.addToBuffer('success', message, data);
  }

  /**
   * Log de debug detalhado (DEBUG level)
   */
  debug(message, data = null) {
    if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;

    if (this.isDevelopment || this.currentLevel >= LOG_LEVELS.DEBUG) {
      console.debug(`🐛 [DEBUG] ${message}`, data);
    }
    this.addToBuffer('debug', message, data);
  }

  /**
   * Log de API calls (INFO level)
   */
  api(method, endpoint, status, data = null) {
    const message = `API ${method} ${endpoint} - Status: ${status}`;
    this.info(message, data);
  }

  /**
   * Log de navegação (DEBUG level)
   */
  navigation(from, to) {
    this.debug(`Navigation: ${from} → ${to}`);
  }

  /**
   * Log de autenticação (INFO level)
   */
  auth(action, userId = null) {
    this.info(`Auth: ${action}`, { userId });
  }

  /**
   * Log de performance (DEBUG level)
   */
  performance(metric, value, unit = 'ms') {
    this.debug(`Performance: ${metric} = ${value}${unit}`);
  }

  /**
   * Log de pagamento (INFO level)
   */
  payment(action, orderId, amount = null) {
    this.info(`Payment: ${action}`, { orderId, amount });
  }

  /**
   * Cria um timer para medir performance
   */
  startTimer(label) {
    const start = performance.now();
    return {
      end: () => {
        const duration = performance.now() - start;
        this.performance(label, duration.toFixed(2));
        return duration;
      }
    };
  }

  /**
   * Log batch para evitar spam (INFO level)
   */
  batch(category, metrics) {
    if (!this.shouldLog(LOG_LEVELS.INFO)) return;

    console.group(`� [BATCH] ${category}`);
    Object.entries(metrics).forEach(([key, value]) => {
      console.log(`  ${key}:`, value);
    });
    console.groupEnd();
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
    console.log('🗑️ Log buffer cleared');
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

    console.log('📥 Logs downloaded');
  }

  /**
   * Exibe informações do logger
   */
  getInfo() {
    return {
      currentLevel: this.getLevelName(),
      currentLevelValue: this.currentLevel,
      environment: this.isProduction ? 'production' : 'development',
      bufferSize: this.logBuffer.length,
      maxBufferSize: this.maxBufferSize,
      availableLevels: Object.keys(LOG_LEVELS),
      commands: [
        'window.setLogLevel("DEBUG")',
        'window.enableDebugLogs()',
        'window.enableInfoLogs()',
        'window.disableLogs()',
        'window.downloadLogs()',
        'window.viewLogs()'
      ]
    };
  }
}

// Exporta instância singleton
export const logger = new Logger();

// Exporta também a classe para testes
export default Logger;

// Log inicial de configuração
if (typeof window !== 'undefined') {
  console.log(
    `%c🔧 Doxologos Logger Initialized`,
    'background: #2d8659; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold',
    `\nLevel: ${logger.getLevelName()}`,
    `\nEnvironment: ${logger.isProduction ? 'Production' : 'Development'}`,
    `\n\n💡 Commands:\n  - window.setLogLevel('DEBUG')\n  - window.enableDebugLogs()\n  - window.disableLogs()\n  - window.downloadLogs()\n  - window.viewLogs()`
  );
}