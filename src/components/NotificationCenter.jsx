import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Centro de Notificações
 * 
 * Exibe notificações do usuário com:
 * - Badge de contagem de não lidas
 * - Dropdown com últimas notificações
 * - Ações: marcar como lida, marcar todas
 * - Real-time updates
 */
export function NotificationCenter() {
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
    } = useNotifications({ realtime: true });

    // Pegar apenas as últimas 10 notificações
    const recentNotifications = notifications.slice(0, 10);

    const handleNotificationClick = async (notification) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }

        // Se tem link, navegar
        if (notification.link) {
            window.location.href = notification.link;
        }
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMs = now - date;
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) return 'Agora';
        if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
        if (diffInHours < 24) return `${diffInHours}h atrás`;
        if (diffInDays === 1) return 'Ontem';
        if (diffInDays < 7) return `${diffInDays}d atrás`;

        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    const getNotificationIcon = (type) => {
        // Retornar emoji baseado no tipo
        if (type.includes('booking:confirmed')) return '✅';
        if (type.includes('booking:cancelled')) return '❌';
        if (type.includes('booking:rescheduled')) return '🔄';
        if (type.includes('booking:reminder')) return '⏰';
        if (type.includes('payment:received')) return '💰';
        if (type.includes('payment:refunded')) return '💸';
        if (type.includes('system:')) return '📢';
        return '🔔';
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notificações</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs"
                            onClick={markAllAsRead}
                        >
                            Marcar todas como lidas
                        </Button>
                    )}
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <ScrollArea className="h-[400px]">
                    {loading ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                            Carregando...
                        </div>
                    ) : recentNotifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Bell className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm text-gray-500">Nenhuma notificação</p>
                        </div>
                    ) : (
                        recentNotifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex flex-col items-start p-3 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''
                                    }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex items-start gap-2 w-full">
                                    <span className="text-lg flex-shrink-0">
                                        {getNotificationIcon(notification.type)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">
                                            {notification.title}
                                        </p>
                                        {notification.message && (
                                            <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                                                {notification.message}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            {formatTimeAgo(notification.created_at)}
                                        </p>
                                    </div>
                                    {!notification.read && (
                                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                                    )}
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>

                {recentNotifications.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-center justify-center text-sm text-blue-600 cursor-pointer">
                            Ver todas as notificações
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
