/**
 * Proteção CSRF para formulários
 * 
 * Funcionalidades:
 * - Gerar tokens CSRF únicos por sessão
 * - Validar tokens em requisições
 * - Hook para uso fácil em formulários
 */

/**
 * Gera um token CSRF único
 * @returns {string} Token CSRF
 */
export const generateCsrfToken = () => {
    const token = crypto.randomUUID();
    sessionStorage.setItem('csrf_token', token);
    sessionStorage.setItem('csrf_token_timestamp', Date.now().toString());
    return token;
};

/**
 * Valida um token CSRF
 * @param {string} token - Token a validar
 * @param {number} maxAge - Idade máxima do token em ms (padrão: 1 hora)
 * @returns {boolean} Se token é válido
 */
export const validateCsrfToken = (token, maxAge = 60 * 60 * 1000) => {
    const storedToken = sessionStorage.getItem('csrf_token');
    const timestamp = sessionStorage.getItem('csrf_token_timestamp');

    // Verificar se token existe
    if (!storedToken || !timestamp) {
        console.warn('⚠️ Token CSRF não encontrado');
        return false;
    }

    // Verificar se token corresponde
    if (token !== storedToken) {
        console.warn('⚠️ Token CSRF inválido');
        return false;
    }

    // Verificar se token não expirou
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > maxAge) {
        console.warn('⚠️ Token CSRF expirado');
        return false;
    }

    return true;
};

/**
 * Limpa token CSRF da sessão
 */
export const clearCsrfToken = () => {
    sessionStorage.removeItem('csrf_token');
    sessionStorage.removeItem('csrf_token_timestamp');
};

/**
 * Hook para uso de CSRF token em formulários
 * @returns {Object} Token e funções de validação
 */
export const useCsrfToken = () => {
    const [token, setToken] = React.useState(() => {
        // Tentar obter token existente
        const existingToken = sessionStorage.getItem('csrf_token');
        const timestamp = sessionStorage.getItem('csrf_token_timestamp');

        // Se token existe e não expirou, usar ele
        if (existingToken && timestamp) {
            const tokenAge = Date.now() - parseInt(timestamp);
            if (tokenAge < 60 * 60 * 1000) {
                // 1 hora
                return existingToken;
            }
        }

        // Caso contrário, gerar novo token
        return generateCsrfToken();
    });

    const validate = React.useCallback(
        (tokenToValidate) => {
            return validateCsrfToken(tokenToValidate);
        },
        []
    );

    const refresh = React.useCallback(() => {
        const newToken = generateCsrfToken();
        setToken(newToken);
        return newToken;
    }, []);

    return {
        token,
        validate,
        refresh,
    };
};

/**
 * Componente de campo hidden com token CSRF
 * @param {Object} props - Props do componente
 * @returns {React.Component}
 */
export const CsrfTokenField = () => {
    const { token } = useCsrfToken();

    return (
        <input
            type="hidden"
            name="csrf_token"
            value={token}
            aria-hidden="true"
        />
    );
};

// Importar React se necessário
import React from 'react';
