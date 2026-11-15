/**
 * Interface base para estratégias de pagamento
 * Implementa Open-Closed Principle: aberto para extensão, fechado para modificação
 * 
 * Cada método de pagamento (PIX, Cartão, Boleto, etc.) deve implementar esta interface
 */
export class PaymentStrategy {
    /**
     * Cria um pagamento usando este método
     * @param {Object} paymentData - Dados do pagamento
     * @param {string} paymentData.booking_id - ID do agendamento (opcional)
     * @param {string} paymentData.inscricao_id - ID da inscrição (opcional)
     * @param {number} paymentData.amount - Valor do pagamento
     * @param {string} paymentData.description - Descrição do pagamento
     * @param {Object} paymentData.payer - Dados do pagador
     * @returns {Promise<Object>} - Resultado da criação do pagamento
     * @throws {Error} - Se não implementado
     */
    async create(paymentData) {
        throw new Error('create() must be implemented by subclass');
    }

    /**
     * Inicia monitoramento do status do pagamento
     * @param {string} paymentId - ID do pagamento no Mercado Pago
     * @param {Function} onStatusChange - Callback chamado quando status muda
     * @param {Object} onStatusChange.statusUpdate - Objeto com status e statusDetail
     * @returns {Promise<Function>} - Função para parar o monitoramento
     * @throws {Error} - Se não implementado
     */
    async startMonitoring(paymentId, onStatusChange) {
        throw new Error('startMonitoring() must be implemented by subclass');
    }

    /**
     * Confirma o pagamento no sistema (atualiza booking/inscrição)
     * @param {string} paymentId - ID do pagamento no Mercado Pago
     * @returns {Promise<boolean>} - true se confirmado com sucesso
     * @throws {Error} - Se não implementado
     */
    async confirm(paymentId) {
        throw new Error('confirm() must be implemented by subclass');
    }

    /**
     * Retorna configuração de UI específica para este método de pagamento
     * @returns {Object} - Configuração de UI
     * @returns {boolean} returns.showQRCode - Se deve mostrar QR Code
     * @returns {boolean} returns.showForm - Se deve mostrar formulário
     * @returns {boolean} returns.redirectToExternal - Se deve redirecionar para página externa
     * @returns {number} returns.pollingInterval - Intervalo de polling em ms (0 = sem polling)
     * @returns {string} returns.message - Mensagem para exibir ao usuário
     */
    getUIConfig() {
        return {
            showQRCode: false,
            showForm: false,
            redirectToExternal: false,
            pollingInterval: 0,
            message: ''
        };
    }

    /**
     * Para o monitoramento do pagamento
     * Método auxiliar para ser sobrescrito se necessário
     */
    stopMonitoring() {
        // Implementação padrão vazia
        // Subclasses podem sobrescrever se necessário
    }
}
