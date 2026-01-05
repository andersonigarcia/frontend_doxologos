import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * TimelineView - Visualização de timeline para agendamentos
 * 
 * @component
 * @example
 * ```jsx
 * <TimelineView
 *   items={[
 *     {
 *       id: '1',
 *       date: '2024-01-15',
 *       time: '14:00',
 *       title: 'Consulta com Dr. Silva',
 *       status: 'confirmed',
 *       description: 'Terapia individual',
 *       actions: [{ label: 'Ver detalhes', onClick: () => {} }]
 *     }
 *   ]}
 *   groupBy="date"
 * />
 * ```
 */

const statusConfig = {
    confirmed: {
        icon: CheckCircle,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        borderColor: 'border-emerald-300',
        label: 'Confirmado'
    },
    pending: {
        icon: Clock,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        borderColor: 'border-amber-300',
        label: 'Pendente'
    },
    cancelled: {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-300',
        label: 'Cancelado'
    },
    completed: {
        icon: CheckCircle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        label: 'Concluído'
    }
};

const groupItemsByDate = (items) => {
    const grouped = {};

    items.forEach(item => {
        const date = item.date;
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(item);
    });

    return Object.entries(grouped).sort((a, b) =>
        new Date(b[0]) - new Date(a[0])
    );
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
        return 'Hoje';
    } else if (date.getTime() === tomorrow.getTime()) {
        return 'Amanhã';
    } else {
        return new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        }).format(new Date(dateString));
    }
};

export const TimelineView = ({
    items = [],
    groupBy = 'date', // 'date' | 'none'
    onItemClick,
    className,
    emptyMessage = 'Nenhum item para exibir'
}) => {
    const groupedItems = groupBy === 'date' ? groupItemsByDate(items) : [['all', items]];

    if (items.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-8', className)}>
            {groupedItems.map(([date, dateItems]) => (
                <div key={date}>
                    {/* Date Header */}
                    {groupBy === 'date' && (
                        <div className="flex items-center gap-3 mb-4">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900 capitalize">
                                {formatDate(date)}
                            </h3>
                            <div className="flex-1 h-px bg-gray-200" />
                        </div>
                    )}

                    {/* Timeline Items */}
                    <div className="relative pl-8 space-y-6">
                        {/* Vertical Line */}
                        <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />

                        {dateItems.map((item, index) => {
                            const config = statusConfig[item.status] || statusConfig.pending;
                            const StatusIcon = config.icon;

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="relative"
                                >
                                    {/* Timeline Dot */}
                                    <div className={cn(
                                        'absolute -left-8 top-2 w-4 h-4 rounded-full border-2 bg-white',
                                        config.borderColor
                                    )}>
                                        <div className={cn('absolute inset-0.5 rounded-full', config.bgColor)} />
                                    </div>

                                    {/* Item Card */}
                                    <div
                                        onClick={() => onItemClick?.(item)}
                                        className={cn(
                                            'bg-white rounded-lg border border-gray-200 p-4 shadow-sm transition-all',
                                            onItemClick && 'cursor-pointer hover:shadow-md hover:border-gray-300'
                                        )}
                                    >
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm font-medium text-gray-600">
                                                        {item.time}
                                                    </span>
                                                </div>
                                                <h4 className="text-base font-semibold text-gray-900">
                                                    {item.title}
                                                </h4>
                                                {item.description && (
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Status Badge */}
                                            <div className={cn(
                                                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                                                config.bgColor,
                                                config.color
                                            )}>
                                                <StatusIcon className="w-3 h-3" />
                                                <span>{config.label}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {item.actions && item.actions.length > 0 && (
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                                                {item.actions.map((action, actionIndex) => (
                                                    <button
                                                        key={actionIndex}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            action.onClick?.(item);
                                                        }}
                                                        className={cn(
                                                            'text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
                                                            action.variant === 'primary'
                                                                ? 'bg-[#2d8659] text-white hover:bg-[#236b47]'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        )}
                                                    >
                                                        {action.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Custom Content */}
                                        {item.content && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                {item.content}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default TimelineView;
