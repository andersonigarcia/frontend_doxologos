/**
 * Feature Flags para Melhorias de Pagamento
 * 
 * Sistema de feature flags para ativar progressivamente as melhorias
 * no fluxo de pagamento sem impactar usuários existentes.
 * 
 * IMPORTANTE: Todas as flags começam como FALSE por padrão.
 * Ativar progressivamente conforme cronograma da Fase 4.
 */

export const PAYMENT_FEATURE_FLAGS = {
    // Fase 4 - Dia 2: Logging de tentativas ✅ ATIVADO
    PAYMENT_ATTEMPT_LOGGING: true,

    // Fase 4 - Dia 3: Nova UI de timeline ✅ ATIVADO
    PAYMENT_TIMELINE_UI: true,

    // Fase 4 - Dia 5: Verificação de duplicatas ✅ ATIVADO
    PAYMENT_IDEMPOTENCY_CHECK: true,

    // Fase 4 - Dia 7: Modal de aviso ✅ ATIVADO
    PAYMENT_DUPLICATE_MODAL: true,

    // Fase 4 - Dia 10: Expiração automática ✅ ATIVADO
    PAYMENT_AUTO_EXPIRATION: true,

    // Recursos adicionais (ativar após estabilização)
    PAYMENT_RETRY_LOGIC: false,
    PAYMENT_CIRCUIT_BREAKER: false,
};

/**
 * Verifica se uma feature flag está ativada
 * 
 * Permite override via localStorage para testes locais:
 * localStorage.setItem('feature_PAYMENT_IDEMPOTENCY_CHECK', 'true')
 * 
 * @param {string} flagName - Nome da flag (ex: 'PAYMENT_IDEMPOTENCY_CHECK')
 * @returns {boolean} - true se a feature está ativada
 */
export const isFeatureEnabled = (flagName) => {
    // Verificar override no localStorage (apenas desenvolvimento)
    if (typeof window !== 'undefined' && window.localStorage) {
        const override = localStorage.getItem(`feature_${flagName}`);
        if (override !== null) {
            console.log(`🚩 Feature flag override: ${flagName} = ${override}`);
            return override === 'true';
        }
    }

    // Retornar valor padrão da flag
    return PAYMENT_FEATURE_FLAGS[flagName] || false;
};

/**
 * Ativa uma feature flag (apenas para testes)
 * 
 * @param {string} flagName - Nome da flag
 */
export const enableFeature = (flagName) => {
    if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`feature_${flagName}`, 'true');
        console.log(`✅ Feature ${flagName} ativada localmente`);
    }
};

/**
 * Desativa uma feature flag (apenas para testes)
 * 
 * @param {string} flagName - Nome da flag
 */
export const disableFeature = (flagName) => {
    if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`feature_${flagName}`, 'false');
        console.log(`❌ Feature ${flagName} desativada localmente`);
    }
};

/**
 * Limpa todos os overrides de feature flags
 */
export const clearFeatureOverrides = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(PAYMENT_FEATURE_FLAGS).forEach(flagName => {
            localStorage.removeItem(`feature_${flagName}`);
        });
        console.log('🧹 Todos os overrides de feature flags foram limpos');
    }
};

/**
 * Retorna status de todas as feature flags
 * Útil para debugging
 */
export const getFeatureFlagsStatus = () => {
    const status = {};
    Object.keys(PAYMENT_FEATURE_FLAGS).forEach(flagName => {
        status[flagName] = isFeatureEnabled(flagName);
    });
    return status;
};

// Exportar para uso em console (debugging)
if (typeof window !== 'undefined') {
    window.paymentFeatures = {
        enable: enableFeature,
        disable: disableFeature,
        clear: clearFeatureOverrides,
        status: getFeatureFlagsStatus,
    };

    console.log('💡 Feature flags disponíveis via window.paymentFeatures');
    console.log('   Exemplo: window.paymentFeatures.enable("PAYMENT_TIMELINE_UI")');
}

export default {
    isFeatureEnabled,
    enableFeature,
    disableFeature,
    clearFeatureOverrides,
    getFeatureFlagsStatus,
    PAYMENT_FEATURE_FLAGS,
};
