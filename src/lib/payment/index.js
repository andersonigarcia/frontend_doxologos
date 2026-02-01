/**
 * Payment System - Entry Point
 * 
 * Este módulo inicializa o sistema de pagamentos baseado em Strategy Pattern
 * e registra todas as estratégias disponíveis.
 * 
 * Uso:
 * import { paymentOrchestrator } from '@/lib/payment';
 * 
 * const result = await paymentOrchestrator.processPayment('pix', paymentData, callbacks);
 */

import { paymentOrchestrator } from './PaymentOrchestrator';
import { PixPaymentStrategy } from './strategies/PixPaymentStrategy';
import { CardPaymentStrategy } from './strategies/CardPaymentStrategy';
import { logger } from '@/lib/logger';

/**
 * Inicializa e registra todas as estratégias de pagamento
 */
function initializePaymentStrategies() {
    logger.info('Payment.initialize:start', { message: 'Registering payment strategies' });

    // Registrar estratégia PIX
    paymentOrchestrator.registerStrategy('pix', new PixPaymentStrategy());

    // Registrar estratégia de Cartão de Crédito
    const cardStrategy = new CardPaymentStrategy();
    paymentOrchestrator.registerStrategy('credit_card', cardStrategy);

    // Reutilizar mesma estratégia para débito
    paymentOrchestrator.registerStrategy('debit_card', cardStrategy);

    const registeredMethods = paymentOrchestrator.getAvailableMethods();
    logger.success('Payment.initialize:complete', {
        message: 'Payment strategies registered',
        methods: registeredMethods
    });
}

// Inicializar estratégias automaticamente
initializePaymentStrategies();

// Exportar orquestrador e estratégias
export { paymentOrchestrator };
export { PaymentStrategy } from './PaymentStrategy';
export { PixPaymentStrategy } from './strategies/PixPaymentStrategy';
export { CardPaymentStrategy } from './strategies/CardPaymentStrategy';
