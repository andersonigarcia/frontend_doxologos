import { useState, useEffect, useCallback } from 'react';
import { notificationService, NotificationType } from '@/lib/notificationService';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook para gerenciar notificações do usuário
 * 
 * Funcionalidades:
 * - Buscar notificações
 * - Contar não lidas
 * - Marcar como lida
 * - Deletar
 * - Subscrição em tempo real
 * 
 * @param {Object} options - Opções do hook
 * @param {boolean} options.realtime - Habilitar atualizações em tempo real
 * @param {boolean} options.unreadOnly - Buscar apenas não lidas
 * @returns {Object} Estado e métodos de notificações
 */
export function useNotifications(options = {}) {
    const {
        realtime = true,
        unreadOnly = false,
    } = options;

    const { toast } = useToast();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Busca notificações
     */
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await notificationService.getNotifications({
            unreadOnly,
            limit: 50,
        });

        if (fetchError) {
            setError(fetchError);
            console.warn('ℹ️ Notificações offline ou sem permissão:', fetchError?.message || fetchError);
            setNotifications([]);
        } else {
            setNotifications(data || []);
        }

        setLoading(false);
    }, [unreadOnly, toast]);

    /**
     * Busca contagem de não lidas
     */
    const fetchUnreadCount = useCallback(async () => {
        const { count } = await notificationService.getUnreadCount();
        setUnreadCount(count);
    }, []);

    /**
     * Marca notificação como lida
     */
    const markAsRead = useCallback(async (notificationId) => {
        const { success } = await notificationService.markAsRead(notificationId);

        if (success) {
            // Atualizar localmente
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        return success;
    }, []);

    /**
     * Marca todas como lidas
     */
    const markAllAsRead = useCallback(async () => {
        const { count } = await notificationService.markAllAsRead();

        if (count > 0) {
            // Atualizar localmente
            setNotifications((prev) =>
                prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
            );
            setUnreadCount(0);

            toast({
                title: '✅ Notificações marcadas como lidas',
                description: `${count} notificação${count !== 1 ? 'ões' : ''} marcada${count !== 1 ? 's' : ''} como lida${count !== 1 ? 's' : ''}.`,
            });
        }

        return count;
    }, [toast]);

    /**
     * Deleta notificação
     */
    const deleteNotification = useCallback(async (notificationId) => {
        const { success } = await notificationService.deleteNotification(notificationId);

        if (success) {
            // Atualizar localmente
            setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

            // Atualizar contagem se era não lida
            const notification = notifications.find((n) => n.id === notificationId);
            if (notification && !notification.read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }

            toast({
                title: '🗑️ Notificação removida',
            });
        }

        return success;
    }, [notifications, toast]);

    /**
     * Atualiza lista de notificações
     */
    const refresh = useCallback(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, [fetchNotifications, fetchUnreadCount]);

    // Buscar notificações ao montar
    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, [fetchNotifications, fetchUnreadCount]);

    // Subscrição em tempo real
    useEffect(() => {
        if (!realtime) return;

        const subscription = notificationService.subscribeToNotifications((newNotification) => {
            // Adicionar nova notificação ao início da lista
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Mostrar toast
            toast({
                title: newNotification.title,
                description: newNotification.message,
            });
        });

        return () => {
            notificationService.unsubscribeFromNotifications(subscription);
        };
    }, [realtime, toast]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refresh,
    };
}

/**
 * Hook simplificado para apenas contar não lidas
 * 
 * @returns {Object} Contagem de não lidas
 */
export function useUnreadCount() {
    const [count, setCount] = useState(0);

    const fetchCount = useCallback(async () => {
        const { count: unreadCount } = await notificationService.getUnreadCount();
        setCount(unreadCount);
    }, []);

    useEffect(() => {
        fetchCount();

        // Atualizar a cada 30 segundos
        const interval = setInterval(fetchCount, 30000);

        return () => clearInterval(interval);
    }, [fetchCount]);

    return { count, refresh: fetchCount };
}
