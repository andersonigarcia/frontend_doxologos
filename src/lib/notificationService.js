import { supabase } from '@/lib/customSupabaseClient';

/**
 * Serviço para gerenciar notificações do usuário
 * 
 * Funcionalidades:
 * - Criar notificações
 * - Buscar notificações
 * - Marcar como lida
 * - Deletar notificações
 */

/**
 * Tipos de notificação disponíveis
 */
export const NotificationType = {
    // Agendamentos
    BOOKING_CONFIRMED: 'booking:confirmed',
    BOOKING_CANCELLED: 'booking:cancelled',
    BOOKING_RESCHEDULED: 'booking:rescheduled',
    BOOKING_REMINDER: 'booking:reminder',

    // Pagamentos
    PAYMENT_RECEIVED: 'payment:received',
    PAYMENT_REFUNDED: 'payment:refunded',
    PAYMENT_PENDING: 'payment:pending',

    // Sistema
    SYSTEM_ANNOUNCEMENT: 'system:announcement',
    SYSTEM_UPDATE: 'system:update',
};

/**
 * Classe para gerenciar notificações
 */
class NotificationService {
    /**
     * Busca notificações do usuário atual
     * 
     * @param {Object} options - Opções de busca
     * @param {boolean} options.unreadOnly - Apenas não lidas
     * @param {string} options.type - Filtrar por tipo
     * @param {number} options.limit - Limite de resultados
     * @returns {Promise<{data: Array, error?: Error}>}
     */
    async getNotifications(options = {}) {
        const {
            unreadOnly = false,
            type = null,
            limit = 50,
        } = options;

        try {
            let query = supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (unreadOnly) {
                query = query.eq('read', false);
            }

            if (type) {
                query = query.eq('type', type);
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ Erro ao buscar notificações:', error);
                return { data: [], error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erro crítico ao buscar notificações:', error);
            return { data: [], error };
        }
    }

    /**
     * Conta notificações não lidas
     * 
     * @returns {Promise<{count: number, error?: Error}>}
     */
    async getUnreadCount() {
        try {
            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('read', false);

            if (error) {
                console.error('❌ Erro ao contar notificações:', error);
                return { count: 0, error };
            }

            return { count, error: null };
        } catch (error) {
            console.error('❌ Erro crítico ao contar notificações:', error);
            return { count: 0, error };
        }
    }

    /**
     * Marca uma notificação como lida
     * 
     * @param {string} notificationId - ID da notificação
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async markAsRead(notificationId) {
        try {
            const { error } = await supabase.rpc('mark_notification_as_read', {
                notification_id: notificationId,
            });

            if (error) {
                console.error('❌ Erro ao marcar notificação como lida:', error);
                return { success: false, error };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erro crítico ao marcar notificação:', error);
            return { success: false, error };
        }
    }

    /**
     * Marca todas as notificações como lidas
     * 
     * @returns {Promise<{count: number, error?: Error}>}
     */
    async markAllAsRead() {
        try {
            const { data, error } = await supabase.rpc('mark_all_notifications_as_read');

            if (error) {
                console.error('❌ Erro ao marcar todas como lidas:', error);
                return { count: 0, error };
            }

            return { count: data, error: null };
        } catch (error) {
            console.error('❌ Erro crítico ao marcar todas:', error);
            return { count: 0, error };
        }
    }

    /**
     * Deleta uma notificação
     * 
     * @param {string} notificationId - ID da notificação
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async deleteNotification(notificationId) {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) {
                console.error('❌ Erro ao deletar notificação:', error);
                return { success: false, error };
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('❌ Erro crítico ao deletar notificação:', error);
            return { success: false, error };
        }
    }

    /**
     * Cria uma nova notificação (apenas para admins/service role)
     * 
     * @param {Object} notification - Dados da notificação
     * @param {string} notification.userId - ID do usuário
     * @param {string} notification.type - Tipo da notificação
     * @param {string} notification.title - Título
     * @param {string} notification.message - Mensagem
     * @param {string} notification.link - Link (opcional)
     * @param {Object} notification.metadata - Metadados (opcional)
     * @returns {Promise<{data: Object, error?: Error}>}
     */
    async createNotification(notification) {
        const {
            userId,
            type,
            title,
            message,
            link = null,
            metadata = {},
        } = notification;

        try {
            const { data, error } = await supabase
                .from('notifications')
                .insert([{
                    user_id: userId,
                    type,
                    title,
                    message,
                    link,
                    metadata,
                }])
                .select()
                .single();

            if (error) {
                console.error('❌ Erro ao criar notificação:', error);
                return { data: null, error };
            }

            console.log('✅ Notificação criada:', data.id);
            return { data, error: null };
        } catch (error) {
            console.error('❌ Erro crítico ao criar notificação:', error);
            return { data: null, error };
        }
    }

    /**
     * Subscreve a mudanças em notificações (tempo real)
     * 
     * @param {Function} callback - Callback para mudanças
     * @returns {Object} Subscription object
     */
    subscribeToNotifications(callback) {
        const subscription = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    console.log('📬 Nova notificação recebida:', payload.new);
                    callback(payload.new);
                }
            )
            .subscribe();

        return subscription;
    }

    /**
     * Cancela subscrição de notificações
     * 
     * @param {Object} subscription - Objeto de subscrição
     */
    unsubscribeFromNotifications(subscription) {
        if (subscription) {
            supabase.removeChannel(subscription);
        }
    }
}

// Exportar instância singleton
export const notificationService = new NotificationService();

// Exportar classe para testes
export { NotificationService };
