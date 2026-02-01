import { logger } from '@/lib/logger';

/**
 * Orquestrador de pagamentos
 * Implementa Strategy Pattern para diferentes métodos de pagamento
 * Segue Open-Closed Principle: aberto para extensão, fechado para modificação
 * 
 * Responsabilidades:
 * - Gerenciar registro de estratégias de pagamento
 * - Coordenar fluxo de pagamento delegando para estratégia apropriada
 * - Fornecer interface unificada para todos os métodos de pagamento
 */
export class PaymentOrchestrator {
    constructor() {
        /**
         * Registro de estratégias de pagamento
         * @type {Object.<string, PaymentStrategy>}
         */
        this.strategies = {};

        logger.info('PaymentOrchestrator.constructor', { message: 'Payment orchestrator initialized' });
    }

    /**
     * Registra uma nova estratégia de pagamento
     * Permite adicionar novos métodos de pagamento sem modificar código existente
     * 
     * @param {string} methodId - Identificador do método (ex: 'pix', 'credit_card')
     * @param {PaymentStrategy} strategy - Instância da estratégia
     * @example
     * orchestrator.registerStrategy('boleto', new BoletoPaymentStrategy());
     */
    registerStrategy(methodId, strategy) {
        this.strategies[methodId] = strategy;
        logger.info('PaymentOrchestrator.registerStrategy', {
            methodId,
            strategyName: strategy.constructor.name
        });
    }

    /**
     * Obtém estratégia para método de pagamento
     * @param {string} paymentMethod - Método de pagamento
     * @returns {PaymentStrategy} - Estratégia correspondente
     * @throws {Error} - Se método não suportado
     */
    getStrategy(paymentMethod) {
        const strategy = this.strategies[paymentMethod];

        if (!strategy) {
            const availableMethods = Object.keys(this.strategies).join(', ');
            const errorMsg = `Método de pagamento não suportado: ${paymentMethod}. Métodos disponíveis: ${availableMethods}`;
            logger.error('PaymentOrchestrator.getStrategy:not-found', null, {
                paymentMethod,
                availableMethods
            });
            throw new Error(errorMsg);
        }

        return strategy;
    }

    /**
     * Processa pagamento usando estratégia apropriada
     * 
     * @param {string} paymentMethod - Método de pagamento ('pix', 'credit_card', etc.)
     * @param {Object} paymentData - Dados do pagamento
     * @param {Object} callbacks - Callbacks de eventos
     * @param {Function} callbacks.onStatusChange - Chamado quando status muda
     * @param {Function} callbacks.onSuccess - Chamado quando pagamento aprovado
     * @param {Function} callbacks.onError - Chamado quando há erro
     * @returns {Promise<Object>} - Resultado do processamento
     * @returns {boolean} returns.success - Se processamento foi bem-sucedido
     * @returns {string} returns.paymentId - ID do pagamento criado
     * @returns {Function} returns.stopMonitoring - Função para parar monitoramento
     * @returns {Object} returns.uiConfig - Configuração de UI
     * @returns {string} returns.error - Mensagem de erro (se houver)
     */
    async processPayment(paymentMethod, paymentData, callbacks = {}) {
        const { onStatusChange, onSuccess, onError } = callbacks;

        const logContext = {
            paymentMethod,
            amount: paymentData.amount,
            bookingId: paymentData.booking_id,
            inscricaoId: paymentData.inscricao_id
        };

        try {
            logger.info('PaymentOrchestrator.processPayment:start', logContext);

            // 1. Obter estratégia apropriada
            const strategy = this.getStrategy(paymentMethod);

            // 2. Criar pagamento usando estratégia
            const createResult = await strategy.create(paymentData);

            logger.success('PaymentOrchestrator.processPayment:created', {
                ...logContext,
                paymentId: createResult.paymentId,
                status: createResult.status
            });

            // 3. Iniciar monitoramento do status
            const stopMonitoring = await strategy.startMonitoring(
                createResult.paymentId,
                async (statusUpdate) => {
                    logger.info('PaymentOrchestrator.processPayment:status-change', {
                        paymentId: createResult.paymentId,
                        status: statusUpdate.status,
                        statusDetail: statusUpdate.statusDetail
                    });

                    // Callback de mudança de status
                    if (onStatusChange) {
                        onStatusChange(statusUpdate);
                    }

                    // Processar status
                    if (statusUpdate.status === 'approved') {
                        // Confirmar pagamento no sistema
                        const confirmed = await strategy.confirm(createResult.paymentId);

                        if (confirmed) {
                            logger.success('PaymentOrchestrator.processPayment:confirmed', {
                                paymentId: createResult.paymentId
                            });
                        }

                        // Callback de sucesso
                        if (onSuccess) {
                            onSuccess({
                                ...createResult,
                                confirmed
                            });
                        }
                    } else if (['rejected', 'cancelled', 'timeout'].includes(statusUpdate.status)) {
                        logger.warn('PaymentOrchestrator.processPayment:failed', {
                            paymentId: createResult.paymentId,
                            status: statusUpdate.status,
                            statusDetail: statusUpdate.statusDetail
                        });

                        // Callback de erro
                        if (onError) {
                            onError({
                                status: statusUpdate.status,
                                statusDetail: statusUpdate.statusDetail,
                                message: this.getErrorMessage(statusUpdate)
                            });
                        }
                    }
                }
            );

            // 4. Retornar resultado com controles
            return {
                success: true,
                paymentId: createResult.paymentId,
                status: createResult.status,
                stopMonitoring,
                uiConfig: strategy.getUIConfig(),
                ...createResult // Incluir dados específicos (qrCode, etc.)
            };

        } catch (error) {
            logger.error('PaymentOrchestrator.processPayment:error', error, logContext);

            // Callback de erro
            if (onError) {
                onError({
                    error: error.message,
                    originalError: error,
                    message: error.message || 'Erro ao processar pagamento. Tente novamente.'
                });
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Retorna mensagem de erro amigável baseada no status
     * @param {Object} statusUpdate - Atualização de status
     * @returns {string} - Mensagem amigável
     */
    getErrorMessage(statusUpdate) {
        const { status, statusDetail } = statusUpdate;

        if (status === 'timeout') {
            return 'O tempo de confirmação expirou. Por favor, verifique se o pagamento foi processado.';
        }

        if (status === 'cancelled') {
            return 'O pagamento foi cancelado. Você pode tentar novamente.';
        }

        if (status === 'rejected') {
            return statusDetail
                ? `Pagamento rejeitado: ${statusDetail}`
                : 'O pagamento foi rejeitado. Tente outro método de pagamento.';
        }

        return 'Não foi possível processar o pagamento. Tente novamente.';
    }

    /**
     * Lista métodos de pagamento disponíveis
     * @returns {Array<string>} - Lista de IDs de métodos disponíveis
     */
    getAvailableMethods() {
        return Object.keys(this.strategies);
    }

    /**
     * Verifica se método de pagamento está disponível
     * @param {string} methodId - ID do método
     * @returns {boolean} - true se disponível
     */
    isMethodAvailable(methodId) {
        return methodId in this.strategies;
    }
}

/**
 * Instância singleton do orquestrador
 * Estratégias serão registradas na inicialização da aplicação
 */
export const paymentOrchestrator = new PaymentOrchestrator();
