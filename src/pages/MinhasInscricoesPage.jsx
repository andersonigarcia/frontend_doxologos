import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, ExternalLink, Heart, ArrowLeft, Video, Lock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { fetchEventMeeting } from '@/services/eventAccessService';
import emailService from '@/lib/emailService';
import emailTemplates from '@/lib/emailTemplates';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { AlertTriangle } from 'lucide-react';

export default function MinhasInscricoesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [inscricoes, setInscricoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meetingAccess, setMeetingAccess] = useState({});
  const [meetingLoading, setMeetingLoading] = useState({});
  const [meetingErrors, setMeetingErrors] = useState({});

  // Cancellation State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedInscricao, setSelectedInscricao] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

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
          payment_preference_id,
          eventos (
            id,
            titulo,
            descricao,
            data_inicio,
            data_fim,
            valor,
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

  const handleOpenCancel = (inscricao) => {
    setSelectedInscricao(inscricao);
    setCancellationReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedInscricao) return;

    try {
      setIsCancelling(true);

      const { data, error } = await supabase.rpc('cancel_event_registration', {
        p_inscricao_id: selectedInscricao.id,
        p_reason: cancellationReason
      });

      if (error) throw error;

      // Send Cancellation Email
      try {
        const evento = selectedInscricao.eventos;
        const refundMessage = data.refund_status === 'requested'
          ? 'O reembolso foi solicitado e está sob análise. Em breve você receberá mais informações.'
          : null;

        const emailHtml = emailTemplates.eventoCancelamento(
          selectedInscricao,
          evento,
          cancellationReason,
          refundMessage
        );

        await emailService.sendEmail({
          to: user.email,
          subject: `Cancelamento - ${evento.titulo}`,
          html: emailHtml,
          type: 'event_cancellation'
        });
      } catch (emailErr) {
        console.error('Erro ao enviar email de cancelamento:', emailErr);
      }

      toast({
        title: "Cancelamento realizado",
        description: data.message || "Sua inscrição foi cancelada com sucesso.",
        variant: "default" // or success if available
      });

      setCancelModalOpen(false);
      fetchInscricoes(); // Refresh list

    } catch (err) {
      console.error('Erro ao cancelar:', err);
      toast({
        title: "Erro ao cancelar",
        description: err.message || "Não foi possível cancelar sua inscrição.",
        variant: "destructive"
      });
    } finally {
      setIsCancelling(false);
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

  const handleOpenCheckout = (inscricao) => {
    const queryParams = new URLSearchParams({
      type: 'evento',
      inscricao_id: inscricao.id,
      valor: inscricao.eventos?.valor ? String(inscricao.eventos.valor) : '',
      titulo: inscricao.eventos?.titulo || '',
    });

    navigate(`/checkout?${queryParams.toString()}`);
  };

  const requestMeetingAccess = useCallback((eventoId) => {
    if (!eventoId) return;

    setMeetingLoading((prev) => ({ ...prev, [eventoId]: true }));
    setMeetingErrors((prev) => ({ ...prev, [eventoId]: null }));

    fetchEventMeeting(eventoId)
      .then((data) => {
        setMeetingAccess((prev) => ({ ...prev, [eventoId]: data }));
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Erro ao carregar link do evento';
        setMeetingErrors((prev) => ({ ...prev, [eventoId]: message }));
      })
      .finally(() => {
        setMeetingLoading((prev) => ({ ...prev, [eventoId]: false }));
      });
  }, []);

  useEffect(() => {
    if (!user || inscricoes.length === 0) return;

    const eligible = inscricoes.filter((inscricao) => {
      const evento = inscricao.eventos;
      if (!evento?.id) return false;
      if (meetingAccess[evento.id]) return false;
      if (meetingLoading[evento.id]) return false;
      const isGratuito = evento.valor === 0;
      const isConfirmadoPago = evento.valor > 0 && inscricao.status === 'confirmed';
      return isGratuito || isConfirmadoPago;
    });

    if (eligible.length === 0) return;

    eligible.forEach((inscricao) => {
      requestMeetingAccess(inscricao.eventos.id);
    });
  }, [user, inscricoes, meetingAccess, meetingLoading, requestMeetingAccess]);

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

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Minhas Inscrições em Eventos</h1>
                <p className="text-gray-600">
                  Acompanhe o status e acesse os detalhes dos seus eventos
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link to="/area-do-paciente">
                  <Button
                    variant="outline"
                    className="border-[#2d8659] text-[#2d8659] hover:bg-[#2d8659] hover:text-white"
                  >
                    Ir para Área do Paciente
                  </Button>
                </Link>
                <Link to="/#eventos">
                  <Button className="bg-[#2d8659] hover:bg-[#236b47]">
                    Ver Eventos Disponíveis
                  </Button>
                </Link>
              </div>
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
                const eventoId = evento.id;
                const meetingInfo = eventoId ? meetingAccess[eventoId] : null;
                const meetingError = eventoId ? meetingErrors[eventoId] : null;
                const isLoadingMeeting = eventoId ? meetingLoading[eventoId] : false;
                const shouldHaveMeeting = !!eventoId && (isEventoGratuito || (isEventoPago && inscricao.status === 'confirmed'));
                const showZoomLink = shouldHaveMeeting && meetingInfo?.meetingLink;
                const showPaymentButton = isEventoPago && inscricao.status === 'pending';

                // Debug: Ver dados da inscrição
                console.log('🔍 Inscrição:', {
                  id: inscricao.id,
                  status: inscricao.status,
                  payment_id: inscricao.payment_id,
                  evento: evento.titulo,
                  valor: evento.valor,
                  tipo: isEventoPago ? 'PAGO' : 'GRATUITO',
                  meeting_link: meetingInfo?.meetingLink ? 'EDGE' : 'N/A',
                  showZoomLink,
                  showPaymentButton
                });

                return (
                  <motion.div
                    key={inscricao.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white rounded-xl shadow-lg overflow-hidden ${isPast ? 'opacity-75' : ''
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
                              <span className={`ml-2 font-medium ${inscricao.payment_status === 'approved'
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
                              {/* Link Release Check */}
                              {(() => {
                                const eventDate = new Date(inscricao.eventos.data_inicio);
                                const releaseMinutes = inscricao.eventos.meeting_link_release_minutes ?? 60; // Default 60 min

                                const releaseTime = new Date(eventDate.getTime() - releaseMinutes * 60000);
                                const now = new Date();

                                const isReleased = now >= releaseTime;

                                if (isReleased) {
                                  return (
                                    <a
                                      href={meetingInfo.meetingLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                      Acessar Sala Zoom
                                    </a>
                                  );
                                } else {
                                  return (
                                    <div className="bg-white/60 rounded px-3 py-2 text-sm text-green-800 border border-green-200 inline-block">
                                      <span className="font-semibold block mb-1">🔒 Link Protegido</span>
                                      Disponível a partir das {releaseTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({releaseMinutes} min antes do início)
                                    </div>
                                  );
                                }
                              })()}
                              {meetingInfo.meetingPassword && (
                                <div className="mt-3 flex items-center gap-2 text-sm">
                                  <Lock className="w-4 h-4 text-green-700" />
                                  <span className="text-green-800">
                                    Senha: <code className="px-2 py-1 bg-white rounded border border-green-300 font-mono">{meetingInfo.meetingPassword}</code>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {shouldHaveMeeting && !showZoomLink && !meetingError && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-blue-900">
                                {isLoadingMeeting
                                  ? 'Carregando link seguro do evento...'
                                  : 'O link será disponibilizado assim que confirmado.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {meetingError && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-red-900">
                                {meetingError}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => eventoId && requestMeetingAccess(eventoId)}
                              >
                                Tentar novamente
                              </Button>
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

                              <Button
                                onClick={() => handleOpenCheckout(inscricao)}
                                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Finalizar Pagamento
                              </Button>

                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botão de Cancelamento */}
                      {inscricao.status !== 'cancelled' && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                          <Button
                            variant="ghost"
                            onClick={() => handleOpenCancel(inscricao)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 text-sm h-auto py-2 px-3"
                          >
                            Cancelar Inscrição
                          </Button>
                        </div>
                      )}

                      {/* Mensagem se Zoom não disponível mas confirmado */}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Cancelamento */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Inscrição</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar sua inscrição?
              {selectedInscricao?.eventos?.valor > 0 && ['paid', 'approved', 'confirmed'].includes(selectedInscricao?.payment_status) && (
                <span className="block mt-2 font-medium text-amber-600 flex items-center">
                  <AlertTriangle className="inline w-4 h-4 mr-1" />
                  Atenção: Para eventos pagos, o reembolso passará por análise.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Motivo (opcional)
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d8659]"
              placeholder="Indique o motivo do cancelamento..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Manter Inscrição
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Processando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
