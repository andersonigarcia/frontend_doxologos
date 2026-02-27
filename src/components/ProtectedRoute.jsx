/**
 * Protected Route Component
 * Protege rotas que requerem autenticação
 */

import React, { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Formulário de login embutido — exibido quando o usuário tenta acessar uma rota
 * protegida sem estar autenticado. Restaura o comportamento de "Sou Profissional"
 * exibir um formulário de login sem redirecionar silenciosamente para outra página.
 */
const EmbeddedLoginForm = () => {
  const { signIn } = useAuth();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(loginData.email, loginData.password);
      // Após login bem-sucedido, o ProtectedRoute re-renderizará com user preenchido
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/favicon.svg" alt="Doxologos Logo" className="w-7 md:w-8 h-7 md:h-8" />
              <span className="text-xl md:text-2xl font-bold gradient-text">Doxologos</span>
            </Link>
            <Link to="/">
              <Button variant="outline" className="border-[#2d8659] text-[#2d8659] text-sm md:text-base">
                <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" /> Voltar
              </Button>
            </Link>
          </div>
        </nav>
      </header>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full"
        >
          <div className="w-16 h-16 bg-[#2d8659]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#2d8659]" />
          </div>
          <h2 className="text-3xl font-bold mb-2 text-center">Área Restrita</h2>
          <p className="text-center text-gray-600 mb-6">Faça login para acessar.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                required
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Senha</label>
                <Link to="/recuperar-senha" className="text-sm text-[#2d8659] hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <input
                type="password"
                required
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#2d8659] hover:bg-[#236b47]"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </motion.div>
      </div>
    </>
  );
};

/**
 * Componente de rota protegida
 * @param {object} props
 * @param {React.ReactNode} props.children - Componente filho a ser renderizado se autenticado
 * @param {string[]} props.requiredRoles - Roles necessárias para acessar (opcional)
 * @param {string} props.redirectTo - Rota para redirecionar se não autenticado (não usado para admin — exibe login inline)
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

  // SECURITY FIX (S-03): Exibir formulário de login embutido em vez de redirecionar
  // silenciosamente. Antes, AdminPage rendenizava seu próprio guard de login interno;
  // com ProtectedRoute centralizamos esse comportamento aqui.
  if (!user) {
    console.log('🔒 Acesso negado: usuário não autenticado — exibindo formulário de login');
    return <EmbeddedLoginForm />;
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
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 mb-2">
            Você está logado como <strong>{user?.email}</strong>, mas esta área é exclusiva para administradores e profissionais.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Se você é um paciente, acesse a Área do Paciente para ver seus agendamentos.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/area-do-paciente">
              <Button className="w-full bg-[#2d8659] hover:bg-[#236b47]">
                Ir para Área do Paciente
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="w-full border-gray-300 text-gray-700">
                Voltar ao Início
              </Button>
            </Link>
          </div>
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
