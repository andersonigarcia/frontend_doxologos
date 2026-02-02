/**
 * Formata um valor numérico para moeda BRL
 * @param {number|string} value - Valor a ser formatado
 * @returns {string} - Valor formatado (ex: R$ 1.234,56)
 */
export const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'R$ 0,00';

    const numberValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numberValue)) return 'R$ 0,00';

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(numberValue);
};

/**
 * Formata uma data para o padrão brasileiro
 * @param {string|Date} date - Data a ser formatada
 * @param {Object} options - Opções de formatação Intl.DateTimeFormat
 * @returns {string} - Data formatada
 */
export const formatDate = (date, options = {}) => {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) return '';

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...options
    }).format(dateObj);
};

/**
 * Formata data e hora
 */
export const formatDateTime = (date) => {
    return formatDate(date, {
        hour: '2-digit',
        minute: '2-digit'
    });
};
