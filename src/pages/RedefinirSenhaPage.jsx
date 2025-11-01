import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

export default function RedefinirSenhaPage() {
  const { updatePassword, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);

  // Validações
  const passwordLength = newPassword.length >= 6;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isValid = passwordLength && passwordsMatch;

  useEffect(() => {
    // Verificar se há um token de recuperação na URL
    const checkRecoveryToken = async () => {
      const hash = window.location.hash;
      
      // Se houver um hash com access_token, o Supabase já processou automaticamente
      if (hash && hash.includes('access_token')) {
        console.log('✅ Token de recuperação detectado na URL');
        // Aguardar o contexto de autenticação processar
        setTimeout(() => {
          setValidatingToken(false);
        }, 2000);
        return;
      }
      
      // Se não há hash mas há usuário, está OK
      if (user) {
        console.log('✅ Usuário autenticado:', user.email);
        setValidatingToken(false);
        return;
      }
      
      // Se não há token nem usuário após 5 minutos (300000ms), mostrar erro mas NÃO redirecionar
      setTimeout(() => {
        if (!user && !window.location.hash.includes('access_token')) {
          console.error('❌ Token não encontrado ou expirado');
          toast({
            variant: 'destructive',
            title: 'Link inválido ou expirado',
            description: 'O link de recuperação pode ter expirado. Solicite um novo link.',
          });
        }
        setValidatingToken(false);
      }, 300000);
    };

    checkRecoveryToken();
  }, [user, navigate, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValid) {
      toast({
        variant: 'destructive',
        title: 'Senha inválida',
        description: 'Verifique se a senha atende aos requisitos e se as senhas coincidem.',
      });
      return;
    }

    setLoading(true);

    const { error } = await updatePassword(newPassword);

    if (!error) {
      setSuccess(true);
      
      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/area-do-paciente');
      }, 3000);
    }

    setLoading(false);
  };

  // Estado de validação do token
  if (validatingToken) {
    return (
      <>
        <Helmet>
          <title>Validando Link - Doxologos</title>
        </Helmet>

        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Validando link de recuperação...
                  </h2>
                  <p className="text-gray-600">
                    Aguarde um momento
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Helmet>
          <title>Senha Atualizada - Doxologos</title>
        </Helmet>

        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Senha Atualizada!
                  </h2>
                  <p className="text-gray-600">
                    Sua senha foi alterada com sucesso.
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    Redirecionando para a área do paciente...
                  </p>
                </div>

                <Button
                  onClick={() => navigate('/area-do-paciente')}
                  className="w-full bg-[#2d8659] hover:bg-[#236b47]"
                >
                  Ir para Área do Paciente
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Redefinir Senha - Doxologos</title>
        <meta name="description" content="Defina sua nova senha de acesso" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <Link to="/" className="inline-flex items-center gap-2 text-3xl font-bold text-[#2d8659]">
              <Heart className="w-8 h-8 fill-[#2d8659]" />
              Doxologos
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Definir Nova Senha</CardTitle>
                <CardDescription>
                  Escolha uma senha forte e segura
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nova Senha */}
                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Digite sua nova senha"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Senha */}
                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Digite novamente a senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Requisitos da Senha */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Requisitos da senha:
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          passwordLength ? 'bg-green-100' : 'bg-gray-200'
                        }`}>
                          {passwordLength && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                        </div>
                        <span className={passwordLength ? 'text-green-700' : 'text-gray-600'}>
                          Mínimo de 6 caracteres
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          passwordsMatch ? 'bg-green-100' : 'bg-gray-200'
                        }`}>
                          {passwordsMatch && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                        </div>
                        <span className={passwordsMatch ? 'text-green-700' : 'text-gray-600'}>
                          As senhas coincidem
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#2d8659] hover:bg-[#236b47]"
                    disabled={loading || !isValid}
                  >
                    {loading ? 'Atualizando...' : 'Atualizar Senha'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-center"
            >
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#2d8659] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para o site
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
