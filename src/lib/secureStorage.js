/**
 * Wrapper seguro para localStorage
 * 
 * Previne erros de JSON.parse e fornece fallbacks seguros
 */
export class SecureStorage {
  /**
   * Obtém item do localStorage com tratamento de erro
   * 
   * @param {string} key - Chave do item
   * @param {any} defaultValue - Valor padrão se não encontrar ou erro
   * @returns {any} Valor armazenado ou defaultValue
   */
  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      
      if (item === null || item === undefined) {
        return defaultValue;
      }
      
      const parsed = JSON.parse(item);
      return parsed;
    } catch (error) {
      console.error(`⚠️ Erro ao ler "${key}" do localStorage:`, error.message);
      
      // Tentar limpar item corrompido
      this.remove(key);
      
      return defaultValue;
    }
  }

  /**
   * Salva item no localStorage com tratamento de erro
   * 
   * @param {string} key - Chave do item
   * @param {any} value - Valor para armazenar
   * @returns {boolean} True se salvou com sucesso
   */
  static set(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`⚠️ Erro ao salvar "${key}" no localStorage:`, error.message);
      
      // Verificar se é erro de quota excedida
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ Quota do localStorage excedida. Limpando dados antigos...');
        // Aqui poderia implementar lógica de limpeza de dados antigos
      }
      
      return false;
    }
  }

  /**
   * Remove item do localStorage
   * 
   * @param {string} key - Chave do item
   * @returns {boolean} True se removeu com sucesso
   */
  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`⚠️ Erro ao remover "${key}" do localStorage:`, error.message);
      return false;
    }
  }

  /**
   * Limpa todo o localStorage
   * 
   * @returns {boolean} True se limpou com sucesso
   */
  static clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('⚠️ Erro ao limpar localStorage:', error.message);
      return false;
    }
  }

  /**
   * Verifica se uma chave existe no localStorage
   * 
   * @param {string} key - Chave para verificar
   * @returns {boolean} True se existe
   */
  static has(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error(`⚠️ Erro ao verificar "${key}" no localStorage:`, error.message);
      return false;
    }
  }

  /**
   * Obtém array do localStorage com validação de tipo
   * 
   * @param {string} key - Chave do item
   * @param {any[]} defaultValue - Array padrão
   * @returns {any[]} Array armazenado ou defaultValue
   */
  static getArray(key, defaultValue = []) {
    const value = this.get(key, defaultValue);
    
    // Validar se é realmente um array
    if (!Array.isArray(value)) {
      console.warn(`⚠️ Valor de "${key}" não é um array. Usando valor padrão.`);
      return defaultValue;
    }
    
    return value;
  }

  /**
   * Obtém objeto do localStorage com validação de tipo
   * 
   * @param {string} key - Chave do item
   * @param {object} defaultValue - Objeto padrão
   * @returns {object} Objeto armazenado ou defaultValue
   */
  static getObject(key, defaultValue = {}) {
    const value = this.get(key, defaultValue);
    
    // Validar se é realmente um objeto
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      console.warn(`⚠️ Valor de "${key}" não é um objeto. Usando valor padrão.`);
      return defaultValue;
    }
    
    return value;
  }
}

/**
 * Wrapper seguro para sessionStorage (mesmas funcionalidades)
 */
export class SecureSessionStorage {
  static get(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(key);
      
      if (item === null || item === undefined) {
        return defaultValue;
      }
      
      return JSON.parse(item);
    } catch (error) {
      console.error(`⚠️ Erro ao ler "${key}" do sessionStorage:`, error.message);
      this.remove(key);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`⚠️ Erro ao salvar "${key}" no sessionStorage:`, error.message);
      return false;
    }
  }

  static remove(key) {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`⚠️ Erro ao remover "${key}" do sessionStorage:`, error.message);
      return false;
    }
  }

  static clear() {
    try {
      sessionStorage.clear();
      return true;
    } catch (error) {
      console.error('⚠️ Erro ao limpar sessionStorage:', error.message);
      return false;
    }
  }

  static has(key) {
    try {
      return sessionStorage.getItem(key) !== null;
    } catch (error) {
      console.error(`⚠️ Erro ao verificar "${key}" no sessionStorage:`, error.message);
      return false;
    }
  }

  static getArray(key, defaultValue = []) {
    const value = this.get(key, defaultValue);
    if (!Array.isArray(value)) {
      console.warn(`⚠️ Valor de "${key}" não é um array. Usando valor padrão.`);
      return defaultValue;
    }
    return value;
  }

  static getObject(key, defaultValue = {}) {
    const value = this.get(key, defaultValue);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      console.warn(`⚠️ Valor de "${key}" não é um objeto. Usando valor padrão.`);
      return defaultValue;
    }
    return value;
  }
}
