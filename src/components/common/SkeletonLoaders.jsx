import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Skeleton Card Component
 * 
 * Componente de loading skeleton para cards
 * 
 * @param {Object} props
 * @param {string} props.className - Classes CSS adicionais
 * @param {number} props.lines - Número de linhas de texto (default: 3)
 */
export function SkeletonCard({ className = '', lines = 3 }) {
    return (
        <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse', className)}>
            <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-2">
                {Array.from({ length: lines }).map((_, i) => (
                    <div key={i} className="h-3 bg-gray-200 rounded" style={{ width: `${100 - i * 10}%` }}></div>
                ))}
            </div>
        </div>
    );
}

/**
 * Skeleton Table Component
 * 
 * Componente de loading skeleton para tabelas
 * 
 * @param {Object} props
 * @param {number} props.rows - Número de linhas (default: 5)
 * @param {number} props.columns - Número de colunas (default: 4)
 * @param {string} props.className - Classes CSS adicionais
 */
export function SkeletonTable({ rows = 5, columns = 4, className = '' }) {
    return (
        <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden', className)}>
            <div className="animate-pulse">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-200 p-4">
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                        {Array.from({ length: columns }).map((_, i) => (
                            <div key={i} className="h-4 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>

                {/* Rows */}
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="border-b border-gray-100 p-4">
                        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                            {Array.from({ length: columns }).map((_, colIndex) => (
                                <div
                                    key={colIndex}
                                    className="h-4 bg-gray-200 rounded"
                                    style={{ width: `${80 + Math.random() * 20}%` }}
                                ></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Skeleton List Component
 * 
 * Componente de loading skeleton para listas
 * 
 * @param {Object} props
 * @param {number} props.items - Número de itens (default: 5)
 * @param {string} props.className - Classes CSS adicionais
 * @param {boolean} props.showAvatar - Mostrar avatar circular (default: true)
 */
export function SkeletonList({ items = 5, className = '', showAvatar = true }) {
    return (
        <div className={cn('space-y-3', className)}>
            {Array.from({ length: items }).map((_, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
                >
                    <div className="flex items-center gap-4">
                        {showAvatar && (
                            <div className="h-12 w-12 bg-gray-200 rounded-full flex-shrink-0"></div>
                        )}
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="h-8 w-20 bg-gray-200 rounded"></div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

/**
 * Skeleton Stats Grid Component
 * 
 * Componente de loading skeleton para grid de estatísticas
 * 
 * @param {Object} props
 * @param {number} props.cards - Número de cards (default: 4)
 * @param {string} props.className - Classes CSS adicionais
 */
export function SkeletonStatsGrid({ cards = 4, className = '' }) {
    return (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
            {Array.from({ length: cards }).map((_, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </motion.div>
            ))}
        </div>
    );
}

/**
 * Skeleton Chart Component
 * 
 * Componente de loading skeleton para gráficos
 * 
 * @param {Object} props
 * @param {string} props.className - Classes CSS adicionais
 * @param {number} props.height - Altura em pixels (default: 300)
 */
export function SkeletonChart({ className = '', height = 300 }) {
    return (
        <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}>
            <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
                <div className="flex items-end justify-between gap-2" style={{ height: `${height}px` }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 bg-gray-200 rounded-t"
                            style={{ height: `${50 + Math.random() * 50}%` }}
                        ></div>
                    ))}
                </div>
                <div className="flex justify-between mt-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-3 bg-gray-200 rounded w-12"></div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default {
    SkeletonCard,
    SkeletonTable,
    SkeletonList,
    SkeletonStatsGrid,
    SkeletonChart,
};
