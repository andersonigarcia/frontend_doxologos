import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * QuickActions - Componente de ações rápidas contextuais
 * 
 * @component
 * @example
 * ```jsx
 * <QuickActions
 *   title="Ações Rápidas"
 *   actions={[
 *     {
 *       id: 'new-booking',
 *       label: 'Nova Consulta',
 *       icon: Plus,
 *       onClick: () => navigate('/agendamento'),
 *       variant: 'default'
 *     },
 *     {
 *       id: 'block-date',
 *       label: 'Bloquear Data',
 *       icon: CalendarX,
 *       onClick: handleBlockDate,
 *       variant: 'outline'
 *     }
 *   ]}
 *   layout="grid"
 * />
 * ```
 */

export const QuickActions = ({
    title = 'Ações Rápidas',
    actions = [],
    layout = 'grid', // 'grid' | 'list'
    columns = 2,
    className,
    showTitle = true
}) => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}>
            {showTitle && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {title}
                </h3>
            )}

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className={cn(
                    layout === 'grid'
                        ? `grid gap-3 grid-cols-1 sm:grid-cols-${columns}`
                        : 'flex flex-col gap-2'
                )}
            >
                {actions.map((action) => {
                    const Icon = action.icon;

                    return (
                        <motion.div key={action.id} variants={itemVariants}>
                            <Button
                                onClick={action.onClick}
                                disabled={action.disabled}
                                variant={action.variant || 'outline'}
                                className={cn(
                                    'w-full justify-start gap-3 h-auto py-3',
                                    layout === 'grid' && 'flex-col items-center text-center py-4',
                                    action.className
                                )}
                            >
                                {Icon && (
                                    <Icon className={cn(
                                        'w-5 h-5',
                                        layout === 'grid' && 'w-6 h-6 mb-1'
                                    )} />
                                )}
                                <div className="flex flex-col items-start">
                                    <span className={cn(
                                        'font-medium',
                                        layout === 'grid' && 'text-center'
                                    )}>
                                        {action.label}
                                    </span>
                                    {action.description && (
                                        <span className="text-xs text-gray-500 mt-1">
                                            {action.description}
                                        </span>
                                    )}
                                </div>
                                {action.badge && (
                                    <span className="ml-auto px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                                        {action.badge}
                                    </span>
                                )}
                            </Button>
                        </motion.div>
                    );
                })}
            </motion.div>

            {actions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">Nenhuma ação disponível no momento</p>
                </div>
            )}
        </div>
    );
};

export default QuickActions;
