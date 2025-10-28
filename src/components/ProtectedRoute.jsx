/**
 * Protected Route Component
 * Protege rotas que requerem autenticação
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

/**
 * Componente de rota protegida
 * @param {object} props
 * @param {React.ReactNode} props.children - Componente filho a ser renderizado se autenticado
 * @param {string[]} props.requiredRoles - Roles necessárias para acessar (opcional)
 * @param {string} props.redirectTo - Rota para redirecionar se não autenticado (padrão: '/')
 * @param {React.ReactNode} props.fallback - Componente de carregamento (opcional)
 */
export const ProtectedRoute = ({ 
  children, 
  requiredRoles = [], 
  redirectTo = '/',
  fallback = null 
}) => {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-[#2d8659] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verificando autenticação...</p>
        </motion.div>
      </div>
    );
  }

  // Redirecionar se não estiver autenticado
  if (!user) {
    console.log('🔒 Acesso negado: usuário não autenticado');
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Verificar roles se necessário
  if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
    console.log('🔒 Acesso negado: role insuficiente', { required: requiredRoles, current: userRole });
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-6">
            Você não tem permissão para acessar esta página.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-[#2d8659] text-white rounded-lg hover:bg-[#236b47] transition-colors"
          >
            Voltar
          </button>
        </motion.div>
      </div>
    );
  }

  // Renderizar conteúdo protegido
  return <>{children}</>;
};

/**
 * Hook para verificar autenticação
 * Útil para lógica condicional em componentes
 */
export const useRequireAuth = (requiredRoles = []) => {
  const { user, userRole, loading } = useAuth();
  
  const isAuthenticated = !!user;
  const hasRequiredRole = requiredRoles.length === 0 || requiredRoles.includes(userRole);
  const canAccess = isAuthenticated && hasRequiredRole;

  return {
    isAuthenticated,
    hasRequiredRole,
    canAccess,
    loading,
    user,
    userRole
  };
};

export default ProtectedRoute;
