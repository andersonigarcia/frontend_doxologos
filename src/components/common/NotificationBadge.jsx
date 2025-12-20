import React from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * NotificationBadge - Badge de notificações com contador
 * 
 * @component
 * @example
 * ```jsx
 * <NotificationBadge
 *   count={5}
 *   onClick={handleOpenNotifications}
 *   variant="dot"
 * />
 * ```
 */

export const NotificationBadge = ({
    count = 0,
    max = 99,
    variant = 'count', // 'count' | 'dot'
    size = 'md', // 'sm' | 'md' | 'lg'
    onClick,
    className,
    showZero = false
}) => {
    const hasNotifications = count > 0;
    const displayCount = count > max ? `${max}+` : count;

    const sizeClasses = {
        sm: {
            icon: 'w-4 h-4',
            badge: 'w-4 h-4 text-[10px]',
            dot: 'w-2 h-2'
        },
        md: {
            icon: 'w-5 h-5',
            badge: 'w-5 h-5 text-xs',
            dot: 'w-2.5 h-2.5'
        },
        lg: {
            icon: 'w-6 h-6',
            badge: 'w-6 h-6 text-sm',
            dot: 'w-3 h-3'
        }
    };

    const sizes = sizeClasses[size];

    if (!hasNotifications && !showZero) {
        return (
            <button
                onClick={onClick}
                className={cn(
                    'relative p-2 rounded-lg hover:bg-gray-100 transition-colors',
                    className
                )}
                aria-label="Notificações"
            >
                <Bell className={cn(sizes.icon, 'text-gray-600')} />
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                'relative p-2 rounded-lg hover:bg-gray-100 transition-colors',
                className
            )}
            aria-label={`${count} notificações não lidas`}
        >
            <Bell className={cn(
                sizes.icon,
                hasNotifications ? 'text-[#2d8659]' : 'text-gray-600'
            )} />

            {/* Badge */}
            {variant === 'count' ? (
                <span className={cn(
                    'absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-red-500 text-white font-bold',
                    sizes.badge,
                    count > 99 && 'px-1.5'
                )}>
                    {displayCount}
                </span>
            ) : (
                <span className={cn(
                    'absolute top-1.5 right-1.5 rounded-full bg-red-500',
                    sizes.dot,
                    hasNotifications ? 'animate-pulse' : ''
                )} />
            )}
        </button>
    );
};

export default NotificationBadge;
