import React, { useEffect, useState } from 'react';
import { useSessionValidation } from '@/hooks/auth/useSessionValidation';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Componente para validação automática de sessão
 * 
 * Funcionalidades:
 * - Validação silenciosa em background
 * - Aviso antes de expiração
 * - Opção de renovar sessão
 * - Logout automático se sessão inválida
 * 
 * @param {Object} props - Props do componente
 * @param {number} props.warningBeforeExpiry - Tempo em ms para mostrar aviso antes de expirar (padrão: 5 min)
 * @param {Function} props.onExpiring - Callback quando sessão está próxima de expirar
 * @param {Function} props.onExpired - Callback quando sessão expirou
 * @param {boolean} props.autoRefresh - Se deve fazer refresh automático (padrão: true)
 * @returns {React.Component}
 */
export function SessionValidator({
    warningBeforeExpiry = 5 * 60 * 1000, // 5 minutos
    onExpiring,
    onExpired,
    autoRefresh = true,
}) {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [showExpiryWarning, setShowExpiryWarning] = useState(false);
    const [hasShownWarning, setHasShownWarning] = useState(false);

    const {
        isValid,
        isRefreshing,
        timeUntilExpiry,
        isNearExpiry,
        refreshToken,
    } = useSessionValidation({
        onSessionExpired: () => {
            console.log('🔒 Sessão expirada, redirecionando para login...');

            toast({
                variant: 'destructive',
                title: '⏰ Sessão expirada',
                description: 'Sua sessão expirou. Por favor, faça login novamente.',
            });

            if (onExpired) {
                onExpired();
            }

            // Redirecionar para login após 2 segundos
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        },
        validationInterval: 5 * 60 * 1000, // Validar a cada 5 minutos
        gracePeriod: warningBeforeExpiry,
        autoRefresh,
    });

    // Efeito para mostrar aviso de expiração
    useEffect(() => {
        if (isNearExpiry && !hasShownWarning && !autoRefresh) {
            setShowExpiryWarning(true);
            setHasShownWarning(true);

            if (onExpiring) {
                onExpiring();
            }

            // Calcular minutos restantes
            const minutesLeft = Math.floor(timeUntilExpiry / 1000 / 60);

            toast({
                title: '⚠️ Sessão expirando',
                description: `Sua sessão expirará em ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''}. Clique para renovar.`,
                action: (
                    <button
                        onClick={handleRefreshSession}
                        className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    >
                        Renovar
                    </button>
                ),
            });
        }
    }, [isNearExpiry, hasShownWarning, autoRefresh, timeUntilExpiry, onExpiring, toast]);

    /**
     * Renova a sessão manualmente
     */
    const handleRefreshSession = async () => {
        const success = await refreshToken();

        if (success) {
            setShowExpiryWarning(false);
            setHasShownWarning(false);

            toast({
                title: '✅ Sessão renovada',
                description: 'Sua sessão foi renovada com sucesso.',
            });
        } else {
            toast({
                variant: 'destructive',
                title: '❌ Erro ao renovar sessão',
                description: 'Não foi possível renovar sua sessão. Por favor, faça login novamente.',
            });
        }
    };

    // Renderizar dialog de aviso apenas se não estiver em modo auto-refresh
    if (!autoRefresh && showExpiryWarning) {
        return (
            <AlertDialog open={showExpiryWarning} onOpenChange={setShowExpiryWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>⚠️ Sua sessão está expirando</AlertDialogTitle>
                        <AlertDialogDescription>
                            Sua sessão expirará em breve. Deseja renovar sua sessão para continuar conectado?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            onClick={handleRefreshSession}
                            disabled={isRefreshing}
                        >
                            {isRefreshing ? 'Renovando...' : 'Renovar Sessão'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    // Componente não renderiza nada visualmente (validação em background)
    return null;
}

/**
 * Componente para mostrar status da sessão (útil para debug)
 * 
 * @param {Object} props - Props do componente
 * @param {boolean} props.showDetails - Se deve mostrar detalhes (padrão: false)
 * @returns {React.Component}
 */
export function SessionStatus({ showDetails = false }) {
    const {
        isValid,
        isRefreshing,
        timeUntilExpiry,
        lastValidation,
        isNearExpiry,
    } = useSessionValidation({
        autoRefresh: true,
    });

    if (!showDetails) {
        return null;
    }

    const formatTime = (ms) => {
        if (!ms) return 'N/A';
        const minutes = Math.floor(ms / 1000 / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    };

    return (
        <div className="fixed bottom-4 right-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs">
            <div className="font-semibold mb-2">🔐 Status da Sessão</div>
            <div className="space-y-1">
                <div>
                    Status: {' '}
                    <span className={isValid ? 'text-green-600' : 'text-red-600'}>
                        {isValid ? '✅ Válida' : '❌ Inválida'}
                    </span>
                </div>
                {isRefreshing && (
                    <div className="text-blue-600">🔄 Renovando...</div>
                )}
                {isNearExpiry && (
                    <div className="text-yellow-600">⚠️ Próxima de expirar</div>
                )}
                <div>
                    Expira em: {formatTime(timeUntilExpiry)}
                </div>
                {lastValidation && (
                    <div>
                        Última validação: {new Date(lastValidation).toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
}
