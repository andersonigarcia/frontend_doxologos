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
 * - Polling a cada 3 segundos consultando a API do Mercado Pago diretamente
 *   (igual ao PIX — fonte mais confiável que consultar o Supabase)
 * - Timeout de 3 minutos (pagamentos em análise antifraude podem demorar)
 * - confirm() implementado: atualiza booking/inscrição no Supabase
 *
 * FLUXO:
 * 1. Edge Function cria pagamento no MP e salva marketplace_payment_id no booking
 * 2. Se MP retornar 'approved'/'authorized': Edge Function já confirma o booking
 * 3. Se MP retornar 'in_process': polling aguarda webhook confirmar o booking
 *    - Polling verifica status na API do MP (não no Supabase)
 *    - Quando MP retornar 'approved', confirm() atualiza o Supabase
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
                transactionAmount: result.transaction_amount,
                // Preservar referências para o confirm()
                bookingId: paymentData.booking_id,
                inscricaoId: paymentData.inscricao_id
            };

        } catch (error) {
            logger.error('CardPaymentStrategy.create:error', error, logContext);
            throw error;
        }
    }

    /**
     * Inicia monitoramento do status do pagamento com cartão
     *
     * Consulta a API do Mercado Pago diretamente (igual ao PIX),
     * em vez de consultar o Supabase.
     * Isso garante que o status reflita a realidade do MP,
     * independente de o webhook já ter chegado ou não.
     *
     * @param {string} paymentId - ID do pagamento no Mercado Pago
     * @param {Function} onStatusChange - Callback de mudança de status
     * @returns {Promise<Function>} - Função para parar monitoramento
     */
    async startMonitoring(paymentId, onStatusChange) {
        logger.info('CardPaymentStrategy.startMonitoring:start', { paymentId });

        // Limpar polling anterior se existir
        this.stopMonitoring();

        // Aguardar 2 segundos antes de iniciar polling
        // (dar tempo para Edge Function processar e salvar no banco)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Polling a cada 3 segundos consultando a API do MP diretamente
        // (Mesmo comportamento do PIX via MercadoPagoService.checkPaymentStatus)
        this.pollingInterval = setInterval(async () => {
            try {
                const statusResult = await MercadoPagoService.checkPaymentStatus(paymentId);

                if (!statusResult.success) {
                    logger.warn('CardPaymentStrategy.polling:check-failed', {
                        paymentId,
                        error: statusResult.error
                    });
                    return;
                }

                logger.info('CardPaymentStrategy.polling:status', {
                    paymentId,
                    status: statusResult.status,
                    statusDetail: statusResult.status_detail
                });

                // Notificar mudança de status ao Orchestrator
                onStatusChange({
                    status: statusResult.status,
                    statusDetail: statusResult.status_detail
                });

                // Parar polling em status finais
                if (['approved', 'authorized', 'rejected', 'cancelled'].includes(statusResult.status)) {
                    logger.info('CardPaymentStrategy.polling:final-status', {
                        paymentId,
                        status: statusResult.status
                    });
                    this.stopMonitoring();
                }

            } catch (error) {
                logger.error('CardPaymentStrategy.polling:error', error, { paymentId });
            }
        }, 3000); // 3 segundos (igual ao PIX)

        // Timeout de 3 minutos
        // Pagamentos em análise antifraude (in_process) podem demorar.
        // Se não confirmou em 3 min, há um problema e notificamos timeout.
        // O webhook ainda pode chegar e confirmar o booking em background.
        this.timeoutId = setTimeout(() => {
            logger.warn('CardPaymentStrategy.polling:timeout', {
                paymentId,
                message: 'Timeout após 3min - o webhook ainda pode confirmar em background'
            });

            this.stopMonitoring();

            onStatusChange({
                status: 'timeout',
                statusDetail: 'confirmation_timeout'
            });
        }, 180000); // 3 minutos

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
     * Confirma o pagamento no sistema Supabase
     *
     * Chamado pelo Orchestrator quando o polling detecta status 'approved'.
     * Atualiza a tabela payments e booking/inscrição no Supabase.
     * Segue o mesmo padrão da PixPaymentStrategy.confirm().
     *
     * NOTA: Esta lógica é complementar ao webhook.
     * Se o webhook chegou primeiro, os UPDATEs são idempotentes (sem efeito colateral).
     *
     * @param {string} paymentId - ID do pagamento no Mercado Pago
     * @returns {Promise<boolean>} - true se confirmado com sucesso
     */
    async confirm(paymentId) {
        logger.info('CardPaymentStrategy.confirm:start', { paymentId });

        try {
            // 1. Atualizar status do pagamento na tabela payments
            const { error: paymentError } = await supabase
                .from('payments')
                .update({
                    status: 'approved',
                    status_detail: 'accredited'
                })
                .eq('mp_payment_id', paymentId.toString());

            if (paymentError) {
                logger.error('CardPaymentStrategy.confirm:payment-error', paymentError, { paymentId });
                // Não retornar false ainda — tentar confirmar o booking mesmo assim
            } else {
                logger.info('CardPaymentStrategy.confirm:payment-updated', { paymentId });
            }

            // 2. Buscar booking_id ou inscricao_id vinculado ao pagamento
            const { data: payment, error: fetchError } = await supabase
                .from('payments')
                .select('booking_id, inscricao_id')
                .eq('mp_payment_id', paymentId.toString())
                .single();

            if (fetchError || !payment) {
                logger.error('CardPaymentStrategy.confirm:fetch-error', fetchError, { paymentId });
                return false;
            }

            // 3. Atualizar booking ou inscrição
            if (payment.booking_id) {
                const { error: bookingError } = await supabase
                    .from('bookings')
                    .update({
                        status: 'confirmed',
                        payment_status: 'approved',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', payment.booking_id);

                if (bookingError) {
                    logger.error('CardPaymentStrategy.confirm:booking-error', bookingError, {
                        paymentId,
                        bookingId: payment.booking_id
                    });
                    return false;
                }

                logger.success('CardPaymentStrategy.confirm:booking-confirmed', {
                    paymentId,
                    bookingId: payment.booking_id
                });

            } else if (payment.inscricao_id) {
                const { error: inscricaoError } = await supabase
                    .from('inscricoes_eventos')
                    .update({
                        status_pagamento: 'confirmado',
                        payment_status: 'approved',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', payment.inscricao_id);

                if (inscricaoError) {
                    logger.error('CardPaymentStrategy.confirm:inscricao-error', inscricaoError, {
                        paymentId,
                        inscricaoId: payment.inscricao_id
                    });
                    return false;
                }

                logger.success('CardPaymentStrategy.confirm:inscricao-confirmed', {
                    paymentId,
                    inscricaoId: payment.inscricao_id
                });
            }

            return true;

        } catch (error) {
            logger.error('CardPaymentStrategy.confirm:error', error, { paymentId });
            return false;
        }
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
            pollingInterval: 3000,
            message: 'Processando pagamento com cartão...'
        };
    }
}
