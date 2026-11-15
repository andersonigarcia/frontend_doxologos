import React, { useEffect, useRef } from 'react';
import { Bell, Check, Clock, X } from 'lucide-react';
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
 * Toca um chime sutil sintetizado via Web Audio API (zero dependências de arquivo externo)
 */
function playChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Nota D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // Nota A5
        
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch {
        // Audio pode ser bloqueado se não houve interação prévia
    }
}

/**
 * NotificationCenter - Central de Notificações com Clean Analytics e Alerta Sonoro
 */
export function NotificationCenter() {
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
    } = useNotifications({ realtime: true });

    const prevCountRef = useRef(unreadCount);

    // Toca o chime quando a contagem de não lidas aumentar (novo agendamento)
    useEffect(() => {
        if (unreadCount > prevCountRef.current) {
            playChime();
        }
        prevCountRef.current = unreadCount;
    }, [unreadCount]);

    const recentNotifications = notifications.slice(0, 10);

    const handleNotificationClick = async (notification) => {
        if (!notification.read) {
            await markAsRead(notification.id);
        }

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

    const getNotificationIcon = (type = '') => {
        if (type.includes('booking:confirmed')) return '📅';
        if (type.includes('booking:cancelled')) return '❌';
        if (type.includes('booking:rescheduled')) return '🔄';
        if (type.includes('booking:reminder')) return '⏰';
        if (type.includes('payment:received')) return '💰';
        return '🔔';
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative text-slate-300 hover:text-white hover:bg-white/10 rounded-xl h-10 w-10 transition-colors"
                    aria-label="Abrir notificações"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-emerald-500 text-white font-bold text-[11px] rounded-full flex items-center justify-center shadow-xs border-2 border-slate-900 animate-pulse">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-0 overflow-hidden font-sans z-50">
                <DropdownMenuLabel className="flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm tracking-tight">Notificações</span>
                        {unreadCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {unreadCount > 0 && (
                        <button
                            className="text-xs text-slate-400 hover:text-white font-semibold transition-colors underline"
                            onClick={markAllAsRead}
                        >
                            Marcar todas como lidas
                        </button>
                    )}
                </DropdownMenuLabel>

                <ScrollArea className="max-h-[380px] divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-xs text-slate-500 font-medium">
                            Carregando alertas...
                        </div>
                    ) : recentNotifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                                <Bell className="h-5 w-5" />
                            </div>
                            <p className="text-xs font-bold text-slate-700">Tudo em dia!</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Nenhuma nova notificação no momento.</p>
                        </div>
                    ) : (
                        recentNotifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex flex-col items-start p-3.5 cursor-pointer transition-colors focus:bg-slate-50 ${
                                    !notification.read ? 'bg-slate-50/80' : 'bg-white'
                                }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex items-start gap-3 w-full">
                                    <span className="text-base flex-shrink-0 mt-0.5">
                                        {getNotificationIcon(notification.type)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                            {notification.title}
                                        </p>
                                        {notification.message && (
                                            <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                                                {notification.message}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-slate-400 mt-1 font-medium flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTimeAgo(notification.created_at)}
                                        </p>
                                    </div>
                                    {!notification.read && (
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1.5" />
                                    )}
                                </div>
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default NotificationCenter;
