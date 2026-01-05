import React, { useState } from 'react';
import { usePermissions } from '@/hooks/auth/usePermissions';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Componente para proteger ações que requerem confirmação ou permissão
 * 
 * Funcionalidades:
 * - Verificação de permissão antes de executar ação
 * - Confirmação de ações destrutivas
 * - Feedback visual de progresso
 * - Mensagens customizáveis
 * 
 * @param {Object} props - Props do componente
 * @param {React.ReactNode} props.children - Elemento que dispara a ação
 * @param {string} props.action - Permissão necessária (ex: 'booking:cancel')
 * @param {Function} props.onConfirm - Callback quando ação é confirmada
 * @param {boolean} props.requireConfirmation - Se requer confirmação (padrão: false)
 * @param {string} props.confirmTitle - Título do modal de confirmação
 * @param {string} props.confirmMessage - Mensagem do modal de confirmação
 * @param {string} props.confirmButtonText - Texto do botão de confirmação
 * @param {string} props.cancelButtonText - Texto do botão de cancelamento
 * @param {boolean} props.destructive - Se ação é destrutiva (muda estilo do botão)
 * @param {Object} props.resourceOwnership - Informações de ownership do recurso
 * @param {Function} props.onUnauthorized - Callback quando usuário não tem permissão
 * @returns {React.Component}
 */
export function ProtectedAction({
    children,
    action,
    onConfirm,
    requireConfirmation = false,
    confirmTitle = 'Confirmar ação',
    confirmMessage = 'Tem certeza que deseja realizar esta ação?',
    confirmButtonText = 'Confirmar',
    cancelButtonText = 'Cancelar',
    destructive = false,
    resourceOwnership = {},
    onUnauthorized,
}) {
    const { can } = usePermissions();
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);

    /**
     * Verifica permissão e executa ação
     */
    const handleAction = async () => {
        // Verificar permissão
        const hasPermission = can(action, resourceOwnership);

        if (!hasPermission) {
            console.warn(`❌ Usuário não tem permissão: ${action}`);
            if (onUnauthorized) {
                onUnauthorized();
            }
            return;
        }

        // Se requer confirmação, mostrar dialog
        if (requireConfirmation) {
            setShowConfirmDialog(true);
            return;
        }

        // Executar ação diretamente
        await executeAction();
    };

    /**
     * Executa a ação confirmada
     */
    const executeAction = async () => {
        try {
            setIsExecuting(true);
            await onConfirm();
            setShowConfirmDialog(false);
        } catch (error) {
            console.error('❌ Erro ao executar ação:', error);
            throw error;
        } finally {
            setIsExecuting(false);
        }
    };

    /**
     * Clona o elemento filho e adiciona handler de click
     */
    const clonedChild = React.cloneElement(children, {
        onClick: (e) => {
            // Chamar onClick original se existir
            if (children.props.onClick) {
                children.props.onClick(e);
            }
            // Executar nossa lógica de proteção
            handleAction();
        },
        disabled: children.props.disabled || isExecuting,
    });

    return (
        <>
            {clonedChild}

            {requireConfirmation && (
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                            <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isExecuting}>
                                {cancelButtonText}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={executeAction}
                                disabled={isExecuting}
                                className={destructive ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                                {isExecuting ? 'Processando...' : confirmButtonText}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}

/**
 * Componente para proteger rotas/seções inteiras
 * 
 * @param {Object} props - Props do componente
 * @param {React.ReactNode} props.children - Conteúdo a proteger
 * @param {string|string[]} props.requiredPermissions - Permissões necessárias
 * @param {React.ReactNode} props.fallback - Componente a mostrar se não tiver permissão
 * @returns {React.Component}
 */
export function ProtectedSection({ children, requiredPermissions, fallback = null }) {
    const { can, canAny } = usePermissions();

    const hasPermission = Array.isArray(requiredPermissions)
        ? canAny(requiredPermissions)
        : can(requiredPermissions);

    if (!hasPermission) {
        return fallback;
    }

    return <>{children}</>;
}

/**
 * Componente para mostrar conteúdo baseado em role
 * 
 * @param {Object} props - Props do componente
 * @param {React.ReactNode} props.children - Conteúdo a mostrar
 * @param {string|string[]} props.roles - Roles permitidos
 * @param {React.ReactNode} props.fallback - Componente a mostrar se não tiver role
 * @returns {React.Component}
 */
export function RoleGuard({ children, roles, fallback = null }) {
    const { hasRole } = usePermissions();

    if (!hasRole(roles)) {
        return fallback;
    }

    return <>{children}</>;
}
