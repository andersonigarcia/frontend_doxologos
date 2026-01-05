import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Shield, Stethoscope } from 'lucide-react';

const UserCreator = () => {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [userData, setUserData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'admin', // admin, professional
    specialty: '', // apenas para profissionais
    mini_curriculum: '' // apenas para profissionais
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userData.email || !userData.password || !userData.full_name) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos obrigatórios"
      });
      return;
    }

    setIsCreating(true);

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            role: userData.role
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Falha ao criar usuário');
      }

      // 2. Se for profissional, criar entrada na tabela professionals
      if (userData.role === 'professional') {
        const { error: profError } = await supabase
          .from('professionals')
          .insert([{
            id: authData.user.id,
            name: userData.full_name,
            email: userData.email,
            specialty: userData.specialty || 'Psicologia Clínica',
            mini_curriculum: userData.mini_curriculum || 'Profissional qualificado em psicologia.'
          }]);

        if (profError) {
          console.error('Erro ao criar profissional:', profError);
          // Não falha aqui pois o usuário já foi criado
        }
      }

      toast({
        title: "Usuário criado com sucesso!",
        description: `${userData.role === 'admin' ? 'Administrador' : 'Profissional'} ${userData.full_name} foi criado.`
      });

      // Limpar formulário
      setUserData({
        email: '',
        password: '',
        full_name: '',
        role: 'admin',
        specialty: '',
        mini_curriculum: ''
      });

    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário",
        description: error.message || "Erro desconhecido"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Criar Usuário para Área Restrita
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de usuário */}
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de usuário</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={userData.role === 'admin'}
                  onChange={(e) => setUserData({...userData, role: e.target.value})}
                />
                <Shield className="w-4 h-4" />
                Administrador
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="professional"
                  checked={userData.role === 'professional'}
                  onChange={(e) => setUserData({...userData, role: e.target.value})}
                />
                <Stethoscope className="w-4 h-4" />
                Profissional
              </label>
            </div>
          </div>

          {/* Dados básicos */}
          <div>
            <label className="block text-sm font-medium mb-2">Nome completo *</label>
            <input
              type="text"
              required
              value={userData.full_name}
              onChange={(e) => setUserData({...userData, full_name: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
              placeholder="Ex: Dr. João Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              required
              value={userData.email}
              onChange={(e) => setUserData({...userData, email: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
              placeholder="Ex: joao@doxologos.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Senha *</label>
            <input
              type="password"
              required
              value={userData.password}
              onChange={(e) => setUserData({...userData, password: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
          </div>

          {/* Campos específicos para profissionais */}
          {userData.role === 'professional' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Especialidade</label>
                <input
                  type="text"
                  value={userData.specialty}
                  onChange={(e) => setUserData({...userData, specialty: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                  placeholder="Ex: Psicologia Clínica"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Mini currículo</label>
                <textarea
                  value={userData.mini_curriculum}
                  onChange={(e) => setUserData({...userData, mini_curriculum: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                  placeholder="Breve descrição profissional..."
                  rows={3}
                />
              </div>
            </>
          )}

          <Button 
            type="submit" 
            disabled={isCreating}
            className="w-full bg-[#2d8659] hover:bg-[#236b47]"
          >
            {isCreating ? 'Criando...' : 'Criar Usuário'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default UserCreator;