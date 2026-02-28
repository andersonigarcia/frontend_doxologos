/**
 * money.js — Utilitário central para aritmética monetária (M-01)
 *
 * Problema resolvido: parseFloat() acumula erro IEEE 754 em somas sucessivas.
 * Solução: converter para centavos (inteiros) antes de somar, converter de volta
 * apenas na exibição.
 *
 * NUNCA use parseFloat() diretamente para somar valores monetários.
 * Use sempre toCents() + sumCents() e fromCents() para exibição.
 */

/**
 * Converte qualquer representação de valor monetário para centavos (inteiro).
 * Suporta: number, string US ("150.00"), string BR ("150,00"), string BR com milhar ("1.500,00")
 *
 * @param {string|number|null|undefined} value
 * @returns {number} Centavos como inteiro (ex: 15000 para R$150,00)
 */
export function toCents(value) {
    if (value === null || value === undefined || value === '') return 0;

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return 0;
        return Math.round(value * 100);
    }

    // String: normalizar formato BR (1.500,00) ou US (1500.00)
    let str = String(value).trim();

    // Remove símbolos de moeda e espaços
    str = str.replace(/[R$\s]/g, '');

    const hasDot = str.includes('.');
    const hasComma = str.includes(',');

    if (hasComma && hasDot) {
        // Formato BR: 1.500,00 → remover ponto (milhar), trocar vírgula por ponto
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
        // Formato BR simples: 150,00 → 150.00
        str = str.replace(',', '.');
    }
    // Se só tem ponto: formato US normal — sem alteração

    const parsed = parseFloat(str);
    if (!Number.isFinite(parsed)) return 0;
    return Math.round(parsed * 100);
}

/**
 * Converte centavos (inteiro) para valor monetário com 2 casas decimais.
 *
 * @param {number} cents
 * @returns {number} Valor float com 2 decimais (ex: 150.00)
 */
export function fromCents(cents) {
    return Number((Math.round(cents) / 100).toFixed(2));
}

/**
 * Soma uma lista de valores usando centavos para evitar erros de float.
 *
 * @param {Array} arr - Array de objetos
 * @param {Function} fn - Função que extrai o valor monetário de cada item
 * @returns {number} Soma em reais (2 casas decimais)
 *
 * @example
 * const total = sumMoney(bookings, b => b.valor_consulta);
 */
export function sumMoney(arr, fn) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const totalCents = arr.reduce((sum, item) => sum + toCents(fn(item)), 0);
    return fromCents(totalCents);
}

/**
 * Calcula o split de um valor total.
 * Retorna { platformAmount, professionalAmount } garantindo que a soma = total (sem perda de centavo).
 *
 * @param {number|string} total - Valor total bruto
 * @param {number} platformPercent - Percentual da plataforma (ex: 40 para 40%)
 * @returns {{ platformAmount: number, professionalAmount: number, totalCents: number }}
 */
export function calculateSplit(total, platformPercent) {
    const totalCents = toCents(total);
    const platformCents = Math.round(totalCents * (platformPercent / 100));
    const professionalCents = totalCents - platformCents; // garante que não perde centavo

    return {
        platformAmount: fromCents(platformCents),
        professionalAmount: fromCents(professionalCents),
        totalCents,
    };
}

/**
 * Formata valor em reais para exibição.
 *
 * @param {number|string} value
 * @returns {string} Ex: "R$ 150,00"
 */
export function formatBRL(value) {
    return fromCents(toCents(value)).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}
