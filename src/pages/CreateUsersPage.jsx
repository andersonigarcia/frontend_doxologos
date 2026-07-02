import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserCreator from '@/components/UserCreator';

const CreateUsersPage = () => {
  return (
    <>
      <Helmet>
        <title>Criar Usuários - Doxologos</title>
      </Helmet>

      {/* Header */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/favicon.svg" alt="Doxologos Logo" className="w-8 h-8" />
            <span className="text-2xl font-bold gradient-text">Doxologos</span>
          </Link>
          <Link to="/">
            <Button variant="outline" className="border-[#2d8659] text-[#2d8659]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="container mx-auto">

          {/* Banner de aviso - apenas desenvolvimento */}
          <div className="max-w-2xl mx-auto mb-6 bg-yellow-50 border border-yellow-300 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-800">⚠️ Ferramenta de Desenvolvimento</p>
              <p className="text-yellow-700 text-sm mt-1">
                Esta página existe apenas para facilitar a criação inicial de usuários no ambiente local.
                Em produção, use a <Link to="/admin/usuarios" className="underline font-medium">Gestão de Usuários</Link> na área administrativa (requer login de administrador).
              </p>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Criação de Usuários
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Use esta ferramenta para criar usuários administradores e profissionais
              que poderão acessar a área restrita do sistema.
            </p>
          </div>

          <UserCreator />

          {/* Informações úteis */}
          <div className="mt-8 max-w-2xl mx-auto bg-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Informações Importantes:</h3>
            <ul className="text-blue-700 space-y-1">
              <li>• <strong>Administradores</strong> têm acesso completo ao sistema</li>
              <li>• <strong>Profissionais</strong> podem gerenciar seus agendamentos e disponibilidade</li>
              <li>• Após criar o usuário, ele pode fazer login em <code>/admin</code></li>
              <li>• A senha deve ter pelo menos 6 caracteres</li>
            </ul>
          </div>

          {/* Links úteis */}
          <div className="mt-6 text-center space-x-4">
            <Link to="/admin">
              <Button className="bg-[#2d8659] hover:bg-[#236b47]">
                Acessar Área Administrativa
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateUsersPage;