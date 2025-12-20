import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * DashboardCard - Componente reutilizável para cards de dashboard
 * 
 * @component
 * @example
 * ```jsx
 * <DashboardCard
 *   title="Total de Consultas"
 *   value="24"
 *   icon={Calendar}
 *   variant="success"
 *   trend={{ value: 12, isPositive: true }}
 *   loading={false}
 * />
 * ```
 */

const variantStyles = {
    default: {
        bg: 'bg-white',
        border: 'border-gray-200',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-600',
        textColor: 'text-gray-900'
    },
    success: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
        textColor: 'text-emerald-900'
    },
    warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        textColor: 'text-amber-900'
    },
    info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        textColor: 'text-blue-900'
    },
    danger: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        textColor: 'text-red-900'
    }
};

export const DashboardCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    variant = 'default',
    trend,
    loading = false,
    onClick,
    className,
    children,
    footer
}) => {
    const styles = variantStyles[variant];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClick}
            className={cn(
                'rounded-xl border shadow-sm p-6 transition-all',
                styles.bg,
                styles.border,
                onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
                className
            )}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                        {Icon && (
                            <div className={cn('p-2 rounded-lg', styles.iconBg)}>
                                <Icon className={cn('w-5 h-5', styles.iconColor)} />
                            </div>
                        )}
                        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
                    </div>

                    {/* Value */}
                    {loading ? (
                        <div className="space-y-2">
                            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
                            {subtitle && <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />}
                        </div>
                    ) : (
                        <>
                            <div className={cn('text-3xl font-bold mb-1', styles.textColor)}>
                                {value}
                            </div>
                            {subtitle && (
                                <p className="text-sm text-gray-500">{subtitle}</p>
                            )}
                        </>
                    )}

                    {/* Trend Indicator */}
                    {trend && !loading && (
                        <div className="mt-3 flex items-center gap-1">
                            <span className={cn(
                                'text-xs font-medium',
                                trend.isPositive ? 'text-emerald-600' : 'text-red-600'
                            )}>
                                {trend.isPositive ? '↑' : '↓'} {trend.value}%
                            </span>
                            <span className="text-xs text-gray-500">
                                {trend.label || 'vs. período anterior'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Content */}
            {children && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    {children}
                </div>
            )}

            {/* Footer */}
            {footer && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    {footer}
                </div>
            )}
        </motion.div>
    );
};

export default DashboardCard;
