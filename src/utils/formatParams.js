export const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

export const parseBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return Boolean(value);
};

export const sanitizeCurrencyInput = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[^0-9.,-]/g, '');
};

export const parseCurrencyToNumber = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    const sanitized = sanitizeCurrencyInput(value);
    if (!sanitized) {
        return null;
    }

    // Remove pontos de milhar e substitui vírgula decimal por ponto
    const normalized = sanitized.replace(/\./g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

export const formatNumberToCurrencyInput = (value) => {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    const numberValue = typeof value === 'string' ? parseCurrencyToNumber(value) : value;
    if (!Number.isFinite(numberValue)) {
        return '';
    }

    return numberValue.toFixed(2).replace('.', ',');
};
