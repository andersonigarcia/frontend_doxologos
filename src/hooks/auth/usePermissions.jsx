import { useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * Definição de permissões por role
 * 
 * Estrutura:
 * - user: Usuário comum (paciente)
 * - professional: Profissional de saúde
 * - admin: Administrador do sistema
 */
const ROLE_PERMISSIONS = {
    user: [
        'booking:create',
        'booking:view_own',
        'booking:cancel_own',
        'booking:reschedule_own',
        'profile:view_own',
        'profile:edit_own',
        'payment:view_own',
        'review:create',
    ],
    professional: [
        'booking:create',
        'booking:view_own',
        'booking:view_assigned',
        'booking:cancel_own',
        'booking:reschedule_own',
        'booking:manage_assigned',
        'profile:view_own',
        'profile:edit_own',
        'availability:manage_own',
        'payment:view_own',
        'review:view_assigned',
        'dashboard:view_professional',
    ],
    admin: [
        'booking:create',
        'booking:view_all',
        'booking:cancel_all',
        'booking:reschedule_all',
        'booking:manage_all',
        'profile:view_all',
        'profile:edit_all',
        'availability:manage_all',
        'payment:view_all',
        'payment:manage_all',
        'review:view_all',
        'review:manage_all',
        'dashboard:view_admin',
        'user:manage_all',
        'system:configure',
    ],
};

/**
 * Hook para verificação de permissões
 * 
 * Funcionalidades:
 * - Verificar se usuário pode executar ação específica
 * - Verificar role do usuário
 * - Cache de permissões para performance
 * - Suporte a permissões customizadas
 * 
 * @returns {Object} Métodos e estado de permissões
 */
export function usePermissions() {
    const { user, userRole } = useAuth();

    /**
     * Obtém todas as permissões do usuário atual
     */
    const permissions = useMemo(() => {
        if (!user || !userRole) {
            return [];
        }

        // Permissões base do role
        const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

        // TODO: Adicionar permissões customizadas do banco de dados
        // const customPermissions = await fetchCustomPermissions(user.id);

        return rolePermissions;
    }, [user, userRole]);

    /**
     * Verifica se usuário tem permissão específica
     * 
     * @param {string} permission - Permissão a verificar (ex: 'booking:cancel')
     * @param {Object} options - Opções adicionais
     * @param {string} options.resourceId - ID do recurso (para verificar ownership)
     * @param {string} options.resourceOwnerId - ID do dono do recurso
     * @returns {boolean} Se usuário tem permissão
     */
    const can = useCallback(
        (permission, options = {}) => {
            if (!user) {
                return false;
            }

            // Admin tem todas as permissões
            if (userRole === 'admin') {
                return true;
            }

            // Verificar permissão base
            const hasBasePermission = permissions.includes(permission);

            // Se não tem permissão base, negar
            if (!hasBasePermission) {
                return false;
            }

            // Verificar ownership se necessário
            if (options.resourceOwnerId) {
                // Permissões que terminam com '_own' requerem ownership
                if (permission.endsWith('_own')) {
                    return options.resourceOwnerId === user.id;
                }
            }

            return true;
        },
        [user, userRole, permissions]
    );

    /**
     * Verifica se usuário tem role específico
     * 
     * @param {string|string[]} roles - Role(s) a verificar
     * @returns {boolean} Se usuário tem o role
     */
    const hasRole = useCallback(
        (roles) => {
            if (!userRole) {
                return false;
            }

            if (Array.isArray(roles)) {
                return roles.includes(userRole);
            }

            return userRole === roles;
        },
        [userRole]
    );

    /**
     * Verifica se usuário tem qualquer uma das permissões
     * 
     * @param {string[]} permissionList - Lista de permissões
     * @returns {boolean} Se usuário tem pelo menos uma permissão
     */
    const canAny = useCallback(
        (permissionList) => {
            return permissionList.some((permission) => can(permission));
        },
        [can]
    );

    /**
     * Verifica se usuário tem todas as permissões
     * 
     * @param {string[]} permissionList - Lista de permissões
     * @returns {boolean} Se usuário tem todas as permissões
     */
    const canAll = useCallback(
        (permissionList) => {
            return permissionList.every((permission) => can(permission));
        },
        [can]
    );

    /**
     * Verifica se usuário é dono do recurso
     * 
     * @param {string} resourceOwnerId - ID do dono do recurso
     * @returns {boolean} Se usuário é dono
     */
    const isOwner = useCallback(
        (resourceOwnerId) => {
            if (!user) {
                return false;
            }
            return user.id === resourceOwnerId;
        },
        [user]
    );

    return {
        permissions,
        can,
        canAny,
        canAll,
        hasRole,
        isOwner,
        userRole,
        isAuthenticated: !!user,
    };
}

/**
 * Componente de ordem superior para proteger componentes com permissões
 * 
 * @param {React.Component} Component - Componente a proteger
 * @param {string|string[]} requiredPermissions - Permissões necessárias
 * @param {React.Component} FallbackComponent - Componente a mostrar se não tiver permissão
 * @returns {React.Component} Componente protegido
 */
export function withPermission(Component, requiredPermissions, FallbackComponent = null) {
    return function ProtectedComponent(props) {
        const { can, canAny } = usePermissions();

        const hasPermission = Array.isArray(requiredPermissions)
            ? canAny(requiredPermissions)
            : can(requiredPermissions);

        if (!hasPermission) {
            if (FallbackComponent) {
                return <FallbackComponent {...props} />;
            }
            return null;
        }

        return <Component {...props} />;
    };
}

/**
 * Hook para verificar permissão e retornar componente condicional
 * 
 * @param {string|string[]} requiredPermissions - Permissões necessárias
 * @returns {boolean} Se tem permissão
 */
export function useRequirePermission(requiredPermissions) {
    const { can, canAny } = usePermissions();

    return useMemo(() => {
        if (Array.isArray(requiredPermissions)) {
            return canAny(requiredPermissions);
        }
        return can(requiredPermissions);
    }, [requiredPermissions, can, canAny]);
}
