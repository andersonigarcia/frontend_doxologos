/**
 * Utilitários de Segurança
 * 
 * Funções para validação de URLs, redirecionamentos seguros,
 * e proteção contra vulnerabilidades comuns.
 */

/**
 * Valida se uma URL pertence a um domínio permitido
 * Previne ataques de Open Redirect
 * 
 * @param {string} url - URL para validar
 * @param {string[]} additionalDomains - Domínios adicionais permitidos
 * @returns {boolean} True se a URL é segura
 */
export const validateRedirectUrl = (url, additionalDomains = []) => {
  if (!url) return false;

  try {
    const parsedUrl = new URL(url);
    
    // Lista branca de domínios permitidos
    const allowedDomains = [
      'mercadopago.com',
      'mercadopago.com.br',
      'mercadolibre.com',
      'mercadolibre.com.br',
      'doxologos.com.br',
      'localhost',
      '127.0.0.1',
      window.location.hostname,
      ...additionalDomains
    ];
    
    // Verificar se o hostname corresponde ou é subdomínio de um domínio permitido
    const isAllowed = allowedDomains.some(domain => 
      parsedUrl.hostname === domain || 
      parsedUrl.hostname.endsWith(`.${domain}`)
    );

    // Verificar protocolo seguro (https ou http apenas em desenvolvimento)
    const isSecureProtocol = parsedUrl.protocol === 'https:' || 
      (parsedUrl.protocol === 'http:' && (
        parsedUrl.hostname === 'localhost' || 
        parsedUrl.hostname === '127.0.0.1'
      ));

    return isAllowed && isSecureProtocol;
  } catch (error) {
    console.error('Erro ao validar URL:', error);
    return false;
  }
};

/**
 * Realiza redirecionamento seguro após validação
 * 
 * @param {string} url - URL para redirecionar
 * @param {string} fallback - URL de fallback se a validação falhar
 * @param {string[]} additionalDomains - Domínios adicionais permitidos
 */
export const safeRedirect = (url, fallback = '/', additionalDomains = []) => {
  if (validateRedirectUrl(url, additionalDomains)) {
    window.location.href = url;
  } else {
    console.error('⚠️ URL de redirecionamento bloqueada por segurança:', url);
    
    // Redirecionar para fallback
    if (fallback && fallback !== url) {
      window.location.href = fallback;
    }
  }
};

/**
 * Sanitiza string para prevenir XSS
 * Nota: React já faz isso automaticamente em JSX, usar apenas em casos especiais
 * 
 * @param {string} str - String para sanitizar
 * @returns {string} String sanitizada
 */
export const sanitizeHtml = (str) => {
  if (!str) return '';
  
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Valida se um valor é um email válido
 * 
 * @param {string} email - Email para validar
 * @returns {boolean} True se válido
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida se um valor é um telefone brasileiro válido
 * 
 * @param {string} phone - Telefone para validar
 * @returns {boolean} True se válido
 */
export const isValidPhone = (phone) => {
  // Remove caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Aceita 10 ou 11 dígitos (com DDD)
  return cleanPhone.length === 10 || cleanPhone.length === 11;
};

/**
 * Valida se uma string contém apenas caracteres alfanuméricos e seguros
 * Útil para IDs, slugs, etc
 * 
 * @param {string} str - String para validar
 * @returns {boolean} True se válido
 */
export const isAlphanumericSafe = (str) => {
  const safeRegex = /^[a-zA-Z0-9_-]+$/;
  return safeRegex.test(str);
};

/**
 * Remove caracteres potencialmente perigosos de uma string
 * 
 * @param {string} input - Input para limpar
 * @returns {string} Input sanitizado
 */
export const sanitizeInput = (input) => {
  if (!input) return '';
  
  return String(input)
    .replace(/[<>'"]/g, '') // Remove caracteres perigosos
    .trim();
};

/**
 * Valida se um UUID é válido
 * 
 * @param {string} uuid - UUID para validar
 * @returns {boolean} True se válido
 */
export const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
