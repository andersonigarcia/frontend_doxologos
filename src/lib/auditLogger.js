import { supabase } from '@/lib/customSupabaseClient';

/**
 * Serviço de auditoria para registrar ações críticas do usuário
 * 
 * Funcionalidades:
 * - Registrar ações do usuário (login, logout, cancelamento, etc)
 * - Níveis de log (info, warning, critical)
 * - Integração com Supabase
 * - Metadata automática (timestamp, user agent)
 */

/**
 * Níveis de log
 */
export const LogLevel = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
};

/**
 * Ações auditáveis
 */
export const AuditAction = {
    // Autenticação
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    PASSWORD_RESET: 'auth:password_reset',
    PASSWORD_CHANGE: 'auth:password_change',
    SESSION_REFRESH: 'auth:session_refresh',
    ROLE_SWITCH: 'auth:role_switch',

    // Agendamentos
    BOOKING_CREATE: 'booking:create',
    BOOKING_CANCEL: 'booking:cancel',
    BOOKING_RESCHEDULE: 'booking:reschedule',
    BOOKING_CONFIRM: 'booking:confirm',
    BOOKING_DELETE: 'booking:delete',
    BOOKING_STATUS_CHANGE: 'booking:status_change',
    BOOKING_UPDATE: 'booking:update',

    // Perfil
    PROFILE_UPDATE: 'profile:update',
    PROFILE_VIEW: 'profile:view',

    // Pagamentos
    PAYMENT_CREATE: 'payment:create',
    PAYMENT_REFUND: 'payment:refund',

    // Serviços
    SERVICE_CREATE: 'service:create',
    SERVICE_UPDATE: 'service:update',
    SERVICE_DELETE: 'service:delete',
    SERVICE_PRICE_CHANGE: 'service:price_change',

    // Profissionais
    PROFESSIONAL_CREATE: 'professional:create',
    PROFESSIONAL_UPDATE: 'professional:update',
    PROFESSIONAL_DELETE: 'professional:delete',

    // Disponibilidade
    AVAILABILITY_UPDATE: 'availability:update',
    AVAILABILITY_BLOCK: 'availability:block',
    AVAILABILITY_UNBLOCK: 'availability:unblock',

    // Avaliações
    REVIEW_APPROVE: 'review:approve',
    REVIEW_REJECT: 'review:reject',

    // Administrativo
    ADMIN_USER_DELETE: 'admin:user_delete',
    ADMIN_USER_UPDATE: 'admin:user_update',
    ADMIN_SETTINGS_CHANGE: 'admin:settings_change',
};

/**
 * Classe para gerenciar logs de auditoria
 */
class AuditLogger {
    /**
     * Registra uma ação no log de auditoria
     * 
     * @param {string} action - Ação realizada (use AuditAction)
     * @param {Object} options - Opções do log
     * @param {string} options.level - Nível do log (use LogLevel)
     * @param {string} options.resourceType - Tipo de recurso afetado
     * @param {string} options.resourceId - ID do recurso afetado
     * @param {Object} options.details - Detalhes adicionais
     * @param {string} options.userId - ID do usuário (opcional, pega do auth)
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async log(action, options = {}) {
        const {
            level = LogLevel.INFO,
            resourceType = null,
            resourceId = null,
            details = {},
            userId = null,
        } = options;

        try {
            // Obter usuário atual se não fornecido
            let currentUserId = userId;
            if (!currentUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                currentUserId = user?.id || null;
            }

            // Obter metadata do navegador
            const userAgent = navigator.userAgent;

            // Preparar dados do log
            const logData = {
                user_id: currentUserId,
                action,
                resource_type: resourceType,
                resource_id: resourceId,
                details: details,
                user_agent: userAgent,
                level,
                created_at: new Date().toISOString(),
            };

            // Inserir no banco de dados
            const { error } = await supabase
                .from('audit_logs')
                .insert([logData]);

            if (error) {
                console.error('❌ Erro ao registrar log de auditoria:', error);
                return { success: false, error };
            }

            console.log(`📝 Log de auditoria registrado: ${action} (${level})`);
            return { success: true };
        } catch (error) {
            console.error('❌ Erro crítico ao registrar log:', error);
            return { success: false, error };
        }
    }

    /**
     * Registra log de nível INFO
     */
    async info(action, options = {}) {
        return this.log(action, { ...options, level: LogLevel.INFO });
    }

    /**
     * Registra log de nível WARNING
     */
    async warning(action, options = {}) {
        return this.log(action, { ...options, level: LogLevel.WARNING });
    }

    /**
     * Registra log de nível CRITICAL
     */
    async critical(action, options = {}) {
        return this.log(action, { ...options, level: LogLevel.CRITICAL });
    }

    /**
     * Busca logs de auditoria do usuário atual
     * 
     * @param {Object} filters - Filtros de busca
     * @param {string} filters.action - Filtrar por ação
     * @param {string} filters.level - Filtrar por nível
     * @param {Date} filters.startDate - Data inicial
     * @param {Date} filters.endDate - Data final
     * @param {number} filters.limit - Limite de resultados
     * @returns {Promise<{data: Array, error?: Error}>}
     */
    async getUserLogs(filters = {}) {
        const {
            action = null,
            level = null,
            startDate = null,
            endDate = null,
            limit = 100,
        } = filters;

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return { data: [], error: new Error('Usuário não autenticado') };
            }

            let query = supabase
                .from('audit_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (action) {
                query = query.eq('action', action);
            }

            if (level) {
                query = query.eq('level', level);
            }

            if (startDate) {
                query = query.gte('created_at', startDate.toISOString());
            }

            if (endDate) {
                query = query.lte('created_at', endDate.toISOString());
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ Erro ao buscar logs:', error);
                return { data: [], error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erro crítico ao buscar logs:', error);
            return { data: [], error };
        }
    }

    /**
     * Busca todos os logs (apenas para admins)
     * 
     * @param {Object} filters - Filtros de busca
     * @returns {Promise<{data: Array, error?: Error}>}
     */
    async getAllLogs(filters = {}) {
        const {
            userId = null,
            action = null,
            level = null,
            startDate = null,
            endDate = null,
            limit = 100,
        } = filters;

        try {
            let query = supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (userId) {
                query = query.eq('user_id', userId);
            }

            if (action) {
                query = query.eq('action', action);
            }

            if (level) {
                query = query.eq('level', level);
            }

            if (startDate) {
                query = query.gte('created_at', startDate.toISOString());
            }

            if (endDate) {
                query = query.lte('created_at', endDate.toISOString());
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ Erro ao buscar logs:', error);
                return { data: [], error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erro crítico ao buscar logs:', error);
            return { data: [], error };
        }
    }
}

// Exportar instância singleton
export const auditLogger = new AuditLogger();

// Exportar classe para testes
export { AuditLogger };
