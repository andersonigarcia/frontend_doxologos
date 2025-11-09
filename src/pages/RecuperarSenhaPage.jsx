import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft, Mail, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { isValidEmail } from '@/lib/securityUtils';

export default function RecuperarSenhaPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar email
    if (!email.trim()) {
      return;
    }

    if (!isValidEmail(email)) {
      return;
    }

    setLoading(true);

    const { error } = await resetPassword(email);

    if (!error) {
      setEmailSent(true);
    }

    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Recuperar Senha - Doxologos</title>
        <meta name="description" content="Recupere o acesso à sua conta Doxologos" />
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
                  <KeyRound className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
                <CardDescription>
                  {emailSent 
                    ? 'Se o endereço informado estiver cadastrado, você receberá instruções em instantes'
                    : 'Digite seu email para receber as instruções'
                  }
                </CardDescription>
              </CardHeader>

              <CardContent>
                {emailSent ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center space-y-4"
                  >
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-green-600" />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Solicitação registrada
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Se existir uma conta associada a este endereço, enviaremos um link de recuperação para:
                      </p>
                      <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-md break-all">
                        {email}
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                      <h4 className="font-semibold text-sm text-blue-900 mb-2">
                        Próximos passos:
                      </h4>
                      <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                        <li>Abra seu email</li>
                        <li>Clique no link de recuperação</li>
                        <li>Defina sua nova senha</li>
                      </ol>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left">
                      <p className="text-xs text-amber-800">
                        <strong>⚠️ Importante:</strong> Por segurança, você só pode solicitar recuperação de senha a cada 1 hora. 
                        Se não recebeu o email, verifique sua caixa de spam.
                      </p>
                    </div>

                    <p className="text-xs text-gray-500">
                      Não recebeu o email? Verifique sua caixa de spam ou aguarde alguns minutos.
                    </p>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setEmailSent(false);
                        setEmail('');
                      }}
                    >
                      Enviar para outro email
                    </Button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                          disabled={loading}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Digite o email cadastrado na sua conta
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-800">
                        <strong>🔒 Proteção de segurança:</strong> Por motivos de segurança, você só pode solicitar 
                        recuperação de senha a cada 1 hora por email.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#2d8659] hover:bg-[#236b47]"
                      disabled={loading || !email.trim()}
                    >
                      {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                    </Button>

                    <div className="text-center text-sm text-gray-600">
                      Lembrou sua senha?{' '}
                      <Link to="/area-do-paciente" className="text-[#2d8659] hover:underline font-medium">
                        Fazer login
                      </Link>
                    </div>
                  </form>
                )}
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
