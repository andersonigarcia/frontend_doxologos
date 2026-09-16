import { PaymentStrategy } from '../PaymentStrategy';
import MercadoPagoService from '@/lib/mercadoPagoService';
import { supabase } from '@/lib/customSupabaseClient';
import { logger } from '@/lib/logger';
import { isFeatureEnabled } from '@/lib/paymentFeatureFlags';

/**
 * Estratégia de pagamento PIX
 * Implementa lógica específica para pagamentos via PIX
 * 
 * Características:
 * - Gera QR Code para pagamento inline
 * - Polling a cada 3 segundos para verificar status
 * - Timeout de 10 minutos (expiração padrão do PIX)
 * - Confirmação automática quando aprovado
 */
export class PixPaymentStrategy extends PaymentStrategy {
    constructor() {
        super();
        this.pollingInterval = null;
        this.timeoutId = null;
    }

    /**
     * Cria pagamento PIX no Mercado Pago
     * @param {Object} paymentData - Dados do pagamento
     * @returns {Promise<Object>} - Resultado com paymentId, qrCode, etc.
     */
    async create(paymentData) {
        const logContext = {
            amount: paymentData.amount,
            bookingId: paymentData.booking_id,
            inscricaoId: paymentData.inscricao_id
        };

        logger.info('PixPaymentStrategy.create:start', logContext);

        try {
            // Gerar idempotency key se feature flag ativada
            const idempotencyKey = this.generateIdempotencyKey(paymentData);

            // DEBUG: Log completo dos dados antes de enviar
            logger.info('PixPaymentStrategy.create:calling-service', {
                paymentData: JSON.stringify(paymentData),
                idempotencyKey
            });

            // Criar pagamento PIX via MercadoPagoService
            const result = await MercadoPagoService.createPixPayment(
                paymentData,
                { idempotencyKey }
            );

            if (!result.success) {
                throw new Error(result.error || 'Erro ao criar pagamento PIX');
            }

            logger.success('PixPaymentStrategy.create:success', {
                ...logContext,
                paymentId: result.payment_id,
                status: result.status
            });

            return {
                paymentId: result.payment_id,
                status: result.status,
                qrCode: result.qr_code,
                qrCodeBase64: result.qr_code_base64,
                ticketUrl: result.ticket_url
            };

        } catch (error) {
            logger.error('PixPaymentStrategy.create:error', error, logContext);
            throw error;
        }
    }

    /**
     * Inicia monitoramento do status do pagamento PIX
     * Verifica status a cada 3 segundos via API do Mercado Pago
     * 
     * @param {string} paymentId - ID do pagamento no Mercado Pago
     * @param {Function} onStatusChange - Callback de mudança de status
     * @returns {Promise<Function>} - Função para parar monitoramento
     */
    async startMonitoring(paymentId, onStatusChange) {
        logger.info('PixPaymentStrategy.startMonitoring:start', { paymentId });

        // Limpar polling anterior se existir
        this.stopMonitoring();

        // Polling a cada 3 segundos
        this.pollingInterval = setInterval(async () => {
            try {
                const statusResult = await MercadoPagoService.checkPaymentStatus(paymentId);

                if (statusResult.success) {
                    logger.info('PixPaymentStrategy.polling:status', {
                        paymentId,
                        status: statusResult.status,
                        statusDetail: statusResult.status_detail
                    });

                    // Notificar mudança de status
                    onStatusChange({
                        status: statusResult.status,
                        statusDetail: statusResult.status_detail
                    });

                    // Parar polling se finalizado
                    if (['approved', 'rejected', 'cancelled'].includes(statusResult.status)) {
                        logger.info('PixPaymentStrategy.polling:final-status', {
                            paymentId,
                            status: statusResult.status
                        });
                        this.stopMonitoring();
                    }
                } else {
                    logger.warn('PixPaymentStrategy.polling:check-failed', {
                        paymentId,
                        error: statusResult.error
                    });
                }
            } catch (error) {
                logger.error('PixPaymentStrategy.polling:error', error, { paymentId });
            }
        }, 3000); // 3 segundos

        // Timeout após 10 minutos (PIX expira)
        this.timeoutId = setTimeout(() => {
            logger.warn('PixPaymentStrategy.polling:timeout', { paymentId });
            this.stopMonitoring();
            onStatusChange({
                status: 'timeout',
                statusDetail: 'pix_expired'
            });
        }, 600000); // 10 minutos

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
            logger.info('PixPaymentStrategy.stopMonitoring:interval-cleared');
        }

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
            logger.info('PixPaymentStrategy.stopMonitoring:timeout-cleared');
        }
    }

    /**
     * Confirma o pagamento no sistema
     * Atualiza tabelas payments e bookings/inscricoes_eventos
     * 
     * @param {string} paymentId - ID do pagamento no Mercado Pago
     * @returns {Promise<boolean>} - true se confirmado com sucesso
     */
    async confirm(paymentId) {
        logger.info('PixPaymentStrategy.confirm:start', { paymentId });

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
                logger.error('PixPaymentStrategy.confirm:payment-error', paymentError, { paymentId });
                return false;
            }

            logger.info('PixPaymentStrategy.confirm:payment-updated', { paymentId });

            // 2. Buscar booking_id ou inscricao_id
            const { data: payment, error: fetchError } = await supabase
                .from('payments')
                .select('booking_id, inscricao_id')
                .eq('mp_payment_id', paymentId.toString())
                .single();

            if (fetchError || !payment) {
                logger.error('PixPaymentStrategy.confirm:fetch-error', fetchError, { paymentId });
                return false;
            }

            // 3. Atualizar booking ou inscrição
            if (payment.booking_id) {
                const { error: bookingError } = await supabase
                    .from('bookings')
                    .update({ status: 'confirmed' })
                    .eq('id', payment.booking_id);

                if (bookingError) {
                    logger.error('PixPaymentStrategy.confirm:booking-error', bookingError, {
                        paymentId,
                        bookingId: payment.booking_id
                    });
                    return false;
                }

                logger.success('PixPaymentStrategy.confirm:booking-confirmed', {
                    paymentId,
                    bookingId: payment.booking_id
                });
            } else if (payment.inscricao_id) {
                const { error: inscricaoError } = await supabase
                    .from('inscricoes_eventos')
                    .update({ status_pagamento: 'confirmado' })
                    .eq('id', payment.inscricao_id);

                if (inscricaoError) {
                    logger.error('PixPaymentStrategy.confirm:inscricao-error', inscricaoError, {
                        paymentId,
                        inscricaoId: payment.inscricao_id
                    });
                    return false;
                }

                logger.success('PixPaymentStrategy.confirm:inscricao-confirmed', {
                    paymentId,
                    inscricaoId: payment.inscricao_id
                });
            }

            return true;

        } catch (error) {
            logger.error('PixPaymentStrategy.confirm:error', error, { paymentId });
            return false;
        }
    }

    /**
     * Retorna configuração de UI para PIX
     * @returns {Object} - Configuração de UI
     */
    getUIConfig() {
        return {
            showQRCode: true,
            showForm: false,
            redirectToExternal: false,
            pollingInterval: 3000,
            message: 'Escaneie o QR Code para efetuar o pagamento'
        };
    }

    /**
     * Gera chave de idempotência para evitar pagamentos duplicados
     * @param {Object} paymentData - Dados do pagamento
     * @returns {string|undefined} - Chave de idempotência ou undefined
     */
    generateIdempotencyKey(paymentData) {
        // Apenas gerar se feature flag estiver ativada
        if (!isFeatureEnabled('PAYMENT_IDEMPOTENCY_CHECK')) {
            return undefined;
        }

        const referenceId = paymentData.booking_id || paymentData.inscricao_id;
        if (!referenceId) {
            return undefined;
        }

        const today = new Date().toISOString().split('T')[0];
        return `pix_${referenceId}_${today}`;
    }
}
