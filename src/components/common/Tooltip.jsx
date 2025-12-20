import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Tooltip Component
 * 
 * Componente de tooltip informativo com animações
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Elemento que dispara o tooltip
 * @param {string} props.content - Conteúdo do tooltip
 * @param {string} props.position - Posição do tooltip (top, bottom, left, right)
 * @param {number} props.delay - Delay em ms antes de mostrar (default: 200)
 * @param {string} props.className - Classes CSS adicionais
 */
export function Tooltip({
    children,
    content,
    position = 'top',
    delay = 200,
    className = ''
}) {
    const [isVisible, setIsVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState(null);

    const handleMouseEnter = () => {
        const id = setTimeout(() => {
            setIsVisible(true);
        }, delay);
        setTimeoutId(id);
    };

    const handleMouseLeave = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        setIsVisible(false);
    };

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
        left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
        right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900',
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}

            <AnimatePresence>
                {isVisible && content && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                            'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none',
                            positionClasses[position],
                            className
                        )}
                    >
                        {content}
                        <div
                            className={cn(
                                'absolute w-0 h-0 border-4',
                                arrowClasses[position]
                            )}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * InfoTooltip Component
 * 
 * Tooltip com ícone de informação
 * 
 * @param {Object} props
 * @param {string} props.content - Conteúdo do tooltip
 * @param {string} props.position - Posição do tooltip
 * @param {string} props.className - Classes CSS adicionais
 */
export function InfoTooltip({ content, position = 'top', className = '' }) {
    return (
        <Tooltip content={content} position={position}>
            <button
                type="button"
                className={cn(
                    'inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors',
                    className
                )}
                aria-label="Mais informações"
            >
                <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>
        </Tooltip>
    );
}

export default Tooltip;
