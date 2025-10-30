import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, ExternalLink, Heart, ArrowLeft, Video, Lock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function MinhasInscricoesPage() {
  const { user } = useAuth();
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchInscricoes();
    }
  }, [user]);

  const fetchInscricoes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar inscrições do usuário com dados do evento
      const { data, error: fetchError } = await supabase
        .from('inscricoes_eventos')
        .select(`
          *,
          payment_id,
          eventos (
            id,
            titulo,
            descricao,
            data_inicio,
            data_fim,
            valor,
            meeting_link,
            meeting_password,
            meeting_id,
            link_slug,
            tipo_evento
          )
        `)
        .eq('user_id', user.id)
        .order('data_inscricao', { ascending: false });

      if (fetchError) throw fetchError;

      setInscricoes(data || []);
    } catch (err) {
      console.error('Erro ao buscar inscrições:', err);
      setError('Não foi possível carregar suas inscrições. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (inscricao) => {
    const { status, payment_status } = inscricao;

    if (status === 'confirmed') {
      return (
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          Confirmado
        </div>
      );
    }

    if (status === 'pending' && payment_status === 'pending') {
      return (
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
          <AlertCircle className="w-4 h-4" />
          Aguardando Pagamento
        </div>
      );
    }

    if (status === 'cancelled') {
      return (
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
          <XCircle className="w-4 h-4" />
          Cancelado
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
        <AlertCircle className="w-4 h-4" />
        Pendente
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isEventoPast = (dataFim) => {
    return new Date(dataFim) < new Date();
  };

  const getPaymentLink = (paymentId) => {
    // Link do Mercado Pago para visualizar o pagamento
    // O usuário pode ver o QR Code e fazer o pagamento
    if (!paymentId) return null;
    return `https://www.mercadopago.com.br/checkout/v1/payment/${paymentId}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#2d8659] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando suas inscrições...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Minhas Inscrições em Eventos - Doxologos</title>
        <meta name="description" content="Visualize e gerencie suas inscrições em eventos Doxologos" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#2d8659] transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o site
            </Link>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Minhas Inscrições em Eventos</h1>
                <p className="text-gray-600">
                  Acompanhe o status e acesse os detalhes dos seus eventos
                </p>
              </div>
              <Link to="/#eventos">
                <Button className="bg-[#2d8659] hover:bg-[#236b47]">
                  Ver Eventos Disponíveis
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Lista de Inscrições */}
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
            >
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-800">{error}</p>
              <Button
                onClick={fetchInscricoes}
                variant="outline"
                className="mt-4"
              >
                Tentar Novamente
              </Button>
            </motion.div>
          ) : inscricoes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg p-12 text-center"
            >
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Nenhuma inscrição encontrada
              </h2>
              <p className="text-gray-600 mb-6">
                Você ainda não se inscreveu em nenhum evento. Explore nossos eventos disponíveis!
              </p>
              <Link to="/#eventos">
                <Button className="bg-[#2d8659] hover:bg-[#236b47]">
                  Ver Eventos Disponíveis
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {inscricoes.map((inscricao, index) => {
                const evento = inscricao.eventos;
                const isPast = isEventoPast(evento.data_fim);
                
                // Lógica ajustada:
                // - Eventos GRATUITOS: sempre mostra Zoom (se disponível)
                // - Eventos PAGOS: mostra Zoom apenas se status='confirmed'
                const isEventoGratuito = evento.valor === 0;
                const isEventoPago = evento.valor > 0;
                const showZoomLink = evento.meeting_link && (
                  isEventoGratuito || // Gratuito sempre mostra
                  (isEventoPago && inscricao.status === 'confirmed') // Pago só se confirmado
                );
                const showPaymentButton = isEventoPago && inscricao.status === 'pending';

                // Debug: Ver dados da inscrição
                console.log('🔍 Inscrição:', {
                  id: inscricao.id,
                  status: inscricao.status,
                  payment_id: inscricao.payment_id,
                  evento: evento.titulo,
                  valor: evento.valor,
                  tipo: isEventoPago ? 'PAGO' : 'GRATUITO',
                  meeting_link: evento.meeting_link ? 'EXISTE' : 'NULL',
                  showZoomLink,
                  showPaymentButton
                });

                return (
                  <motion.div
                    key={inscricao.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white rounded-xl shadow-lg overflow-hidden ${
                      isPast ? 'opacity-75' : ''
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">
                              {evento.titulo}
                            </h2>
                            {getStatusBadge(inscricao)}
                          </div>
                          {isPast && (
                            <div className="inline-block px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                              Evento realizado
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 mb-1">Tipo</p>
                          <p className="font-medium text-gray-900">{evento.tipo_evento}</p>
                        </div>
                      </div>

                      {evento.descricao && (
                        <p className="text-gray-600 mb-4 line-clamp-2">{evento.descricao}</p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center gap-3 text-gray-700">
                          <Calendar className="w-5 h-5 text-[#2d8659]" />
                          <div>
                            <p className="text-sm text-gray-500">Data</p>
                            <p className="font-medium">{formatDate(evento.data_inicio)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-gray-700">
                          <Clock className="w-5 h-5 text-[#2d8659]" />
                          <div>
                            <p className="text-sm text-gray-500">Horário</p>
                            <p className="font-medium">
                              {formatTime(evento.data_inicio)} - {formatTime(evento.data_fim)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-gray-700">
                          <MapPin className="w-5 h-5 text-[#2d8659]" />
                          <div>
                            <p className="text-sm text-gray-500">Local</p>
                            <p className="font-medium">Online (Zoom)</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-gray-700">
                          <div className="w-5 h-5 flex items-center justify-center text-[#2d8659] font-bold">
                            R$
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Valor</p>
                            <p className="font-medium">
                              {evento.valor > 0
                                ? `R$ ${parseFloat(evento.valor).toFixed(2).replace('.', ',')}`
                                : 'Gratuito'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Informações de Pagamento */}
                      {evento.valor > 0 && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Informações de Pagamento
                          </h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Status:</span>
                              <span className={`ml-2 font-medium ${
                                inscricao.payment_status === 'approved'
                                  ? 'text-green-600'
                                  : 'text-amber-600'
                              }`}>
                                {inscricao.payment_status === 'approved'
                                  ? 'Pago'
                                  : inscricao.payment_status === 'pending'
                                  ? 'Aguardando Pagamento'
                                  : 'Pendente'}
                              </span>
                            </div>
                            {inscricao.payment_date && (
                              <div>
                                <span className="text-gray-500">Pago em:</span>
                                <span className="ml-2 font-medium text-gray-900">
                                  {new Date(inscricao.payment_date).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Link Zoom (somente se confirmado) */}
                      {showZoomLink && (
                        <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Video className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-green-900 mb-2">
                                🎥 Sala Zoom do Evento
                              </h3>
                              <p className="text-sm text-green-800 mb-3">
                                Acesse a sala Zoom no dia e horário do evento:
                              </p>
                              <a
                                href={evento.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Acessar Sala Zoom
                              </a>
                              {evento.meeting_password && (
                                <div className="mt-3 flex items-center gap-2 text-sm">
                                  <Lock className="w-4 h-4 text-green-700" />
                                  <span className="text-green-800">
                                    Senha: <code className="px-2 py-1 bg-white rounded border border-green-300 font-mono">{evento.meeting_password}</code>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botão de pagamento - APENAS para eventos PAGOS com status PENDENTE */}
                      {showPaymentButton && (
                        <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-amber-900 font-semibold mb-1">
                                ⏳ Pagamento Pendente
                              </p>
                              <p className="text-sm text-amber-800 mb-3">
                                Complete o pagamento para confirmar sua vaga. Você receberá o link da sala Zoom após a confirmação do pagamento.
                              </p>
                              
                              {inscricao.payment_id ? (
                                <a 
                                  href={getPaymentLink(inscricao.payment_id)} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Pagar Agora via PIX
                                </a>
                              ) : (
                                <p className="text-sm text-amber-700 italic">
                                  ⚠️ Link de pagamento não disponível. Verifique seu email ou contate o suporte.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mensagem se Zoom não disponível mas confirmado */}
                      {inscricao.status === 'confirmed' && !evento.meeting_link && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-blue-900">
                                O link da sala Zoom será disponibilizado em breve. Você receberá um email com as informações de acesso.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
