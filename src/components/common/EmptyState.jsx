import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * EmptyState - Componente para estados vazios com ilustrações
 * 
 * @component
 * @example
 * ```jsx
 * <EmptyState
 *   icon={Calendar}
 *   title="Nenhum agendamento"
 *   description="Você ainda não tem consultas agendadas"
 *   action={{
 *     label: 'Agendar consulta',
 *     onClick: () => navigate('/agendamento')
 *   }}
 * />
 * ```
 */

export const EmptyState = ({
    icon: Icon,
    title,
    description,
    action,
    secondaryAction,
    illustration,
    className,
    compact = false
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
                'flex flex-col items-center justify-center text-center',
                compact ? 'py-8' : 'py-16',
                className
            )}
        >
            {/* Icon or Illustration */}
            {illustration ? (
                <div className="mb-6">
                    {illustration}
                </div>
            ) : Icon ? (
                <div className={cn(
                    'rounded-full bg-gray-100 p-6 mb-6',
                    compact && 'p-4 mb-4'
                )}>
                    <Icon className={cn(
                        'text-gray-400',
                        compact ? 'w-8 h-8' : 'w-12 h-12'
                    )} />
                </div>
            ) : null}

            {/* Title */}
            <h3 className={cn(
                'font-semibold text-gray-900 mb-2',
                compact ? 'text-lg' : 'text-xl'
            )}>
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p className={cn(
                    'text-gray-600 max-w-md mb-6',
                    compact ? 'text-sm mb-4' : 'text-base'
                )}>
                    {description}
                </p>
            )}

            {/* Actions */}
            {(action || secondaryAction) && (
                <div className="flex flex-col sm:flex-row gap-3">
                    {action && (
                        <Button
                            onClick={action.onClick}
                            variant={action.variant || 'default'}
                            className={cn(
                                action.variant === 'default' && 'bg-[#2d8659] hover:bg-[#236b47]',
                                compact && 'text-sm'
                            )}
                        >
                            {action.icon && <action.icon className="w-4 h-4 mr-2" />}
                            {action.label}
                        </Button>
                    )}

                    {secondaryAction && (
                        <Button
                            onClick={secondaryAction.onClick}
                            variant={secondaryAction.variant || 'outline'}
                            className={compact && 'text-sm'}
                        >
                            {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4 mr-2" />}
                            {secondaryAction.label}
                        </Button>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default EmptyState;
