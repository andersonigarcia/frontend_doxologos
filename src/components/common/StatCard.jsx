import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * StatCard - Card especializado para exibição de estatísticas com tendências
 * 
 * @component
 * @example
 * ```jsx
 * <StatCard
 *   label="Receita Mensal"
 *   value={15420.50}
 *   format="currency"
 *   trend={{ value: 12.5, direction: 'up' }}
 *   comparison="vs. mês anterior"
 *   sparkline={[10, 15, 12, 18, 20, 17, 22]}
 * />
 * ```
 */

const formatValue = (value, format, currency = 'BRL') => {
    if (value === null || value === undefined) return '-';

    switch (format) {
        case 'currency':
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency
            }).format(value);

        case 'percentage':
            return `${value.toFixed(1)}%`;

        case 'number':
            return new Intl.NumberFormat('pt-BR').format(value);

        default:
            return value;
    }
};

const getTrendIcon = (direction) => {
    switch (direction) {
        case 'up':
            return TrendingUp;
        case 'down':
            return TrendingDown;
        default:
            return Minus;
    }
};

const getTrendColor = (direction, invertColors = false) => {
    if (direction === 'neutral') return 'text-gray-500 bg-gray-100';

    const isPositive = invertColors ? direction === 'down' : direction === 'up';
    return isPositive
        ? 'text-emerald-600 bg-emerald-100'
        : 'text-red-600 bg-red-100';
};

export const StatCard = ({
    label,
    value,
    format = 'number',
    currency = 'BRL',
    trend,
    comparison,
    sparkline,
    loading = false,
    invertTrendColors = false,
    className,
    onClick
}) => {
    const TrendIcon = trend ? getTrendIcon(trend.direction) : null;
    const trendColor = trend ? getTrendColor(trend.direction, invertTrendColors) : '';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={onClick}
            className={cn(
                'bg-white rounded-xl border border-gray-200 shadow-sm p-6 transition-all',
                onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300',
                className
            )}
        >
            {/* Label */}
            <div className="text-sm font-medium text-gray-600 mb-2">
                {label}
            </div>

            {/* Value */}
            {loading ? (
                <div className="h-9 w-32 bg-gray-200 rounded animate-pulse mb-3" />
            ) : (
                <div className="text-3xl font-bold text-gray-900 mb-3">
                    {formatValue(value, format, currency)}
                </div>
            )}

            {/* Trend and Comparison */}
            <div className="flex items-center justify-between">
                {trend && !loading && (
                    <div className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                        trendColor
                    )}>
                        {TrendIcon && <TrendIcon className="w-3 h-3" />}
                        <span>
                            {trend.direction !== 'neutral' && (trend.direction === 'up' ? '+' : '-')}
                            {Math.abs(trend.value)}%
                        </span>
                    </div>
                )}

                {comparison && !loading && (
                    <span className="text-xs text-gray-500">
                        {comparison}
                    </span>
                )}
            </div>

            {/* Sparkline (simple visualization) */}
            {sparkline && sparkline.length > 0 && !loading && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-end justify-between h-12 gap-1">
                        {sparkline.map((point, index) => {
                            const maxValue = Math.max(...sparkline);
                            const height = (point / maxValue) * 100;

                            return (
                                <div
                                    key={index}
                                    className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t transition-all hover:opacity-80"
                                    style={{ height: `${height}%` }}
                                    title={`${formatValue(point, format, currency)}`}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default StatCard;
