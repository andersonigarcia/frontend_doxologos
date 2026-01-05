import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
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
            <Heart className="w-8 h-8 text-[#2d8659]" />
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