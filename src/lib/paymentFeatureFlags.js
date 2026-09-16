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

    // Otimização de Conversão (CRO) ✅ ATIVADO
    CRO_IMPLICIT_TERMS: true,
    CRO_DEFAULT_PIX_HIGHLIGHT: true,

    // Recursos adicionais (ativar após estabilização)
    PAYMENT_RETRY_LOGIC: false,
    PAYMENT_CIRCUIT_BREAKER: false,

    // ── Resiliência End-to-End (Fase 3 — v2.4) ─────────────────────────────
    // Ativar progressivamente após deploy das Edge Functions correspondentes.
    // Todas iniciam como FALSE para garantir zero impacto na operação atual.

    // Orquestração pós-pagamento: dispara email de confirmação após webhook/aprovação
    // Requer deploy de `post-payment-orchestrator` Edge Function
    POST_PAYMENT_ORCHESTRATOR: false,

    // Status intermediário para cartão em análise antifraude (in_process)
    // booking.status = 'awaiting_payment' em vez de 'pending_payment'
    AWAITING_PAYMENT_STATUS: false,

    // Cron de reconciliação: safety net que verifica bookings pendentes a cada 10min
    // Requer configuração do pg_cron no Supabase Dashboard
    RECONCILIATION_CRON: false,

    // WhatsApp pós-confirmação: ativar apenas quando serviço de API for contratado
    // Requer: WHATSAPP_API_URL, WHATSAPP_API_KEY, WHATSAPP_REMINDERS_ENABLED=true
    WHATSAPP_BOOKING_CONFIRMATION: false,
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
