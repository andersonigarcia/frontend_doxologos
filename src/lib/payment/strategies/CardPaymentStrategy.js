import { PaymentStrategy } from '../PaymentStrategy';
import MercadoPagoService from '@/lib/mercadoPagoService';
import { supabase } from '@/lib/customSupabaseClient';
import { logger } from '@/lib/logger';

/**
 * Estratégia de pagamento com Cartão (Crédito/Débito)
 * Implementa lógica específica para pagamentos via cartão
 * 
 * Características:
 * - Processa pagamento via tokenização
 * - Polling a cada 2 segundos para verificar confirmação no booking
 * - Timeout de 30 segundos (cartão confirma rápido)
 * - Edge Function já confirma, polling é redundância/fallback
 * 
 * IMPORTANTE: Esta estratégia resolve o problema de confirmação de cartão
 * adicionando polling similar ao PIX, garantindo confirmação mesmo se webhook falhar
 */
export class CardPaymentStrategy extends PaymentStrategy {
    constructor() {
        super();
        this.pollingInterval = null;
        this.timeoutId = null;
    }

    /**
     * Processa pagamento com cartão
     * @param {Object} paymentData - Dados do pagamento (já com token)
     * @returns {Promise<Object>} - Resultado com paymentId, status, etc.
     */
    async create(paymentData) {
        const logContext = {
            amount: paymentData.amount,
            bookingId: paymentData.booking_id,
            inscricaoId: paymentData.inscricao_id,
            installments: paymentData.installments
        };

        logger.info('CardPaymentStrategy.create:start', logContext);

        try {
            // Processar pagamento com cartão via MercadoPagoService
            const result = await MercadoPagoService.processCardPayment(paymentData);

            if (!result.success) {
                throw new Error(result.error || 'Erro ao processar pagamento com cartão');
            }

            logger.success('CardPaymentStrategy.create:success', {
                ...logContext,
                paymentId: result.payment_id,
                status: result.status
            });

            return {
                paymentId: result.payment_id,
                status: result.status,
                statusDetail: result.status_detail,
                transactionAmount: result.transaction_amount
            };

        } catch (error) {
            logger.error('CardPaymentStrategy.create:error', error, logContext);
            throw error;
        }
    }

    /**
     * Inicia monitoramento do status do pagamento com cartão
     * 
     * IMPORTANTE: Este é o FIX principal do problema de confirmação de cartão
     * Verifica status do booking a cada 2 segundos para garantir confirmação
     * 
     * @param {string} paymentId - ID do pagamento no Mercado Pago
     * @param {Function} onStatusChange - Callback de mudança de status
     * @returns {Promise<Function>} - Função para parar monitoramento
     */
    async startMonitoring(paymentId, onStatusChange) {
        logger.info('CardPaymentStrategy.startMonitoring:start', { paymentId });

        // Limpar polling anterior se existir
        this.stopMonitoring();

        // Aguardar 1 segundo antes de iniciar polling
        // (dar tempo para Edge Function processar)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Polling a cada 2 segundos
        this.pollingInterval = setInterval(async () => {
            try {
                // Buscar payment para obter booking_id ou inscricao_id
                const { data: payment, error: paymentError } = await supabase
                    .from('payments')
                    .select('booking_id, inscricao_id, status')
                    .eq('mp_payment_id', paymentId.toString())
                    .single();

                if (paymentError) {
                    logger.warn('CardPaymentStrategy.polling:payment-not-found', {
                        paymentId,
                        error: paymentError.message
                    });
                    return;
                }

                if (!payment) {
                    logger.warn('CardPaymentStrategy.polling:no-payment', { paymentId });
                    return;
                }

                // Verificar status do booking
                if (payment.booking_id) {
                    const { data: booking, error: bookingError } = await supabase
                        .from('bookings')
                        .select('status, payment_status')
                        .eq('id', payment.booking_id)
                        .single();

                    if (bookingError) {
                        logger.warn('CardPaymentStrategy.polling:booking-error', {
                            paymentId,
                            bookingId: payment.booking_id,
                            error: bookingError.message
                        });
                        return;
                    }

                    if (booking) {
                        logger.info('CardPaymentStrategy.polling:booking-status', {
                            paymentId,
                            bookingId: payment.booking_id,
                            bookingStatus: booking.status,
                            paymentStatus: booking.payment_status
                        });

                        // Verificar se foi confirmado
                        if (booking.status === 'confirmed') {
                            logger.success('CardPaymentStrategy.polling:confirmed', {
                                paymentId,
                                bookingId: payment.booking_id
                            });

                            this.stopMonitoring();
                            onStatusChange({
                                status: 'approved',
                                statusDetail: 'confirmed_by_booking'
                            });
                            return;
                        }

                        // Verificar se foi cancelado
                        if (booking.status === 'cancelled') {
                            logger.warn('CardPaymentStrategy.polling:cancelled', {
                                paymentId,
                                bookingId: payment.booking_id
                            });

                            this.stopMonitoring();
                            onStatusChange({
                                status: 'cancelled',
                                statusDetail: 'booking_cancelled'
                            });
                            return;
                        }
                    }
                } else if (payment.inscricao_id) {
                    // Verificar status da inscrição
                    const { data: inscricao, error: inscricaoError } = await supabase
                        .from('inscricoes_eventos')
                        .select('status_pagamento')
                        .eq('id', payment.inscricao_id)
                        .single();

                    if (inscricaoError) {
                        logger.warn('CardPaymentStrategy.polling:inscricao-error', {
                            paymentId,
                            inscricaoId: payment.inscricao_id,
                            error: inscricaoError.message
                        });
                        return;
                    }

                    if (inscricao) {
                        logger.info('CardPaymentStrategy.polling:inscricao-status', {
                            paymentId,
                            inscricaoId: payment.inscricao_id,
                            statusPagamento: inscricao.status_pagamento
                        });

                        if (inscricao.status_pagamento === 'confirmado') {
                            logger.success('CardPaymentStrategy.polling:inscricao-confirmed', {
                                paymentId,
                                inscricaoId: payment.inscricao_id
                            });

                            this.stopMonitoring();
                            onStatusChange({
                                status: 'approved',
                                statusDetail: 'confirmed_by_inscricao'
                            });
                            return;
                        }
                    }
                }

            } catch (error) {
                logger.error('CardPaymentStrategy.polling:error', error, { paymentId });
            }
        }, 2000); // 2 segundos

        // Timeout após 30 segundos
        // (cartão confirma rápido, se não confirmou em 30s há problema)
        this.timeoutId = setTimeout(() => {
            logger.warn('CardPaymentStrategy.polling:timeout', {
                paymentId,
                message: 'Timeout após 30s - redirecionando mesmo assim'
            });

            this.stopMonitoring();

            // Notificar timeout mas permitir redirecionamento
            // (usuário pode verificar status na página de sucesso)
            onStatusChange({
                status: 'timeout',
                statusDetail: 'confirmation_timeout'
            });
        }, 30000); // 30 segundos

        // Retornar função para parar monitoramento
        return () => this.stopMonitoring();
    }

    /**
     * Para o monitoramento do pagamento
     */
    stopMonitoring() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            logger.info('CardPaymentStrategy.stopMonitoring:interval-cleared');
        }

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
            logger.info('CardPaymentStrategy.stopMonitoring:timeout-cleared');
        }
    }

    /**
     * Confirma o pagamento no sistema
     * 
     * NOTA: Para cartão, a confirmação já é feita pela Edge Function
     * Este método serve como fallback caso necessário
     * 
     * @param {string} paymentId - ID do pagamento no Mercado Pago
     * @returns {Promise<boolean>} - true (confirmação já foi feita)
     */
    async confirm(paymentId) {
        logger.info('CardPaymentStrategy.confirm:fallback', {
            paymentId,
            message: 'Edge Function já confirmou, este é apenas fallback'
        });

        // Edge Function mp-process-card-payment já confirma o booking
        // quando status é 'approved' ou 'authorized'
        // Este método existe apenas para manter interface consistente

        return true;
    }

    /**
     * Retorna configuração de UI para Cartão
     * @returns {Object} - Configuração de UI
     */
    getUIConfig() {
        return {
            showQRCode: false,
            showForm: true,
            redirectToExternal: false,
            pollingInterval: 2000,
            message: 'Processando pagamento com cartão...'
        };
    }
}
