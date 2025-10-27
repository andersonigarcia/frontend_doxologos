import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Componente de overlay de loading reutilizável
 * Exibe uma camada semi-transparente com spinner e mensagem
 * 
 * @param {Object} props
 * @param {boolean} props.isLoading - Se deve mostrar o loading
 * @param {string} props.message - Mensagem a ser exibida (opcional)
 * @param {string} props.size - Tamanho do spinner: 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} props.position - Posição: 'absolute' | 'fixed' (default: 'absolute')
 * @param {boolean} props.fullScreen - Se deve cobrir a tela toda (default: false)
 * @param {React.ReactNode} props.children - Conteúdo que ficará sob o overlay
 * 
 * @example
 * <LoadingOverlay isLoading={isLoading} message="Salvando...">
 *   <YourContent />
 * </LoadingOverlay>
 */
export const LoadingOverlay = ({ 
    isLoading, 
    message, 
    size = 'md',
    position = 'absolute',
    fullScreen = false,
    children 
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8'
    };
    
    const spinnerSize = sizeClasses[size] || sizeClasses.md;
    
    return (
        <div className={`${position === 'absolute' ? 'relative' : ''} w-full h-full`}>
            {children}
            
            {isLoading && (
                <div 
                    className={`
                        ${position} 
                        ${fullScreen ? 'inset-0 fixed' : 'inset-0'} 
                        bg-white bg-opacity-60 
                        backdrop-blur-sm 
                        flex items-center justify-center 
                        z-50 
                        rounded-lg
                        transition-all duration-200
                    `}
                >
                    <div className="bg-white rounded-lg shadow-lg p-4 flex items-center gap-3 animate-fadeIn">
                        <Loader2 className={`${spinnerSize} animate-spin text-[#2d8659]`} />
                        {message && (
                            <span className="text-sm font-medium text-gray-700">
                                {message}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Componente de botão com loading integrado
 * 
 * @param {Object} props
 * @param {boolean} props.isLoading - Se está em loading
 * @param {string} props.loadingText - Texto durante loading (opcional)
 * @param {React.ReactNode} props.children - Conteúdo do botão
 * @param {Function} props.onClick - Função de click
 * @param {boolean} props.disabled - Se está desabilitado
 * @param {string} props.className - Classes CSS adicionais
 * 
 * @example
 * <LoadingButton 
 *   isLoading={isLoading} 
 *   loadingText="Salvando..."
 *   onClick={handleSave}
 * >
 *   Salvar
 * </LoadingButton>
 */
export const LoadingButton = ({ 
    isLoading, 
    loadingText, 
    children, 
    onClick,
    disabled,
    className = '',
    ...props 
}) => {
    const isDisabled = disabled || isLoading;
    
    return (
        <button
            onClick={onClick}
            disabled={isDisabled}
            className={`
                ${className}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                transition-all duration-200
                flex items-center justify-center gap-2
            `}
            {...props}
        >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading && loadingText ? loadingText : children}
        </button>
    );
};

/**
 * Componente de spinner inline simples
 * 
 * @param {Object} props
 * @param {string} props.size - Tamanho: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} props.className - Classes CSS adicionais
 * 
 * @example
 * <LoadingSpinner size="sm" className="text-blue-500" />
 */
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
    const sizeClasses = {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
        xl: 'w-10 h-10'
    };
    
    const spinnerSize = sizeClasses[size] || sizeClasses.md;
    
    return (
        <Loader2 className={`${spinnerSize} animate-spin ${className}`} />
    );
};

/**
 * Componente de loading para inputs/selects
 * Adiciona um spinner ao lado direito do input
 * 
 * @param {Object} props
 * @param {boolean} props.isLoading - Se está em loading
 * @param {React.ReactNode} props.children - Input/Select element
 * 
 * @example
 * <LoadingInput isLoading={isLoading}>
 *   <select>...</select>
 * </LoadingInput>
 */
export const LoadingInput = ({ isLoading, children }) => {
    return (
        <div className="relative">
            {children}
            {isLoading && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <LoadingSpinner size="sm" className="text-[#2d8659]" />
                </div>
            )}
        </div>
    );
};

/**
 * Componente de card com loading overlay
 * Wrapper conveniente para cards que precisam de loading
 * 
 * @param {Object} props
 * @param {boolean} props.isLoading - Se está em loading
 * @param {string} props.message - Mensagem de loading
 * @param {React.ReactNode} props.children - Conteúdo do card
 * @param {string} props.className - Classes CSS do card
 * 
 * @example
 * <LoadingCard isLoading={isLoading} message="Carregando dados...">
 *   <CardContent />
 * </LoadingCard>
 */
export const LoadingCard = ({ isLoading, message, children, className = '' }) => {
    return (
        <div className={`relative ${className}`}>
            <LoadingOverlay isLoading={isLoading} message={message}>
                {children}
            </LoadingOverlay>
        </div>
    );
};

export default LoadingOverlay;
