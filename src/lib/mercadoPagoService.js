/**
 * Serviço de integração com Mercado Pago
 * Gerencia criação de preferências e processamento de pagamentos
 */

import { supabase } from './customSupabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class MercadoPagoService {
    /**
     * Cria um pagamento PIX direto no Mercado Pago
     * Retorna QR Code para pagamento inline (sem redirecionamento)
     * @param {Object} paymentData - Dados do pagamento
     * @param {string} paymentData.booking_id - ID do agendamento
     * @param {number} paymentData.amount - Valor a ser pago
     * @param {string} paymentData.description - Descrição do pagamento
     * @param {Object} paymentData.payer - Dados do pagador
     * @returns {Promise<Object>} - Dados do pagamento PIX criado com QR Code
     */
    static async createPixPayment(paymentData) {
        try {
            console.log('🔵 [MP] Criando pagamento PIX direto...', paymentData);

            const { booking_id, amount, description, payer } = paymentData;

            if (!booking_id || !amount) {
                throw new Error('booking_id e amount são obrigatórios');
            }

            // Chamar Edge Function para criar pagamento PIX
            const payload = {
                booking_id,
                amount,
                description: description || `Consulta Online - Agendamento ${booking_id}`,
                payer: payer || {},
                payment_method_id: 'pix'
            };

            console.log('📤 [MP Service] Criando pagamento PIX:', payload);

            const response = await fetch(`${SUPABASE_URL}/functions/v1/mp-create-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [MP] Erro ao criar pagamento PIX:', errorText);
                throw new Error(`Erro ao criar pagamento PIX: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ [MP] Pagamento PIX criado com sucesso:', result);

            return {
                success: true,
                payment_id: result.payment_id,
                status: result.status,
                qr_code: result.qr_code,
                qr_code_base64: result.qr_code_base64,
                ticket_url: result.ticket_url
            };

        } catch (error) {
            console.error('❌ [MP] Erro no createPixPayment:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verifica o status de um pagamento
     * @param {string} paymentId - ID do pagamento no Mercado Pago
     * @returns {Promise<Object>} - Status atual do pagamento
     */
    static async checkPaymentStatus(paymentId) {
        try {
            console.log('🔍 [MP] Verificando status do pagamento:', paymentId);

            const response = await fetch(`${SUPABASE_URL}/functions/v1/mp-check-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ payment_id: paymentId })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [MP] Erro ao verificar status:', errorText);
                throw new Error(`Erro ao verificar status: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ [MP] Status do pagamento:', result);

            return {
                success: true,
                status: result.status,
                status_detail: result.status_detail
            };

        } catch (error) {
            console.error('❌ [MP] Erro no checkPaymentStatus:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cria uma preferência de pagamento no Mercado Pago
     * @param {Object} paymentData - Dados do pagamento
     * @param {string} paymentData.booking_id - ID do agendamento
     * @param {number} paymentData.amount - Valor a ser pago
     * @param {string} paymentData.description - Descrição do pagamento
     * @param {Object} paymentData.payer - Dados do pagador
     * @param {Array<string>} paymentData.payment_methods - Métodos de pagamento permitidos
     * @returns {Promise<Object>} - Dados da preferência criada
     */
    static async createPreference(paymentData) {
        try {
            console.log('💳 [MP] Criando preferência de pagamento...', paymentData);

            const { booking_id, amount, description, payer, payment_methods } = paymentData;

            if (!booking_id || !amount) {
                throw new Error('booking_id e amount são obrigatórios');
            }

            // Chamar Edge Function para criar preferência
            const payload = {
                booking_id,
                amount,
                description: description || `Consulta Online - Agendamento ${booking_id}`,
                payer: payer || {},
                payment_methods: payment_methods || {
                    excluded_payment_methods: [],
                    excluded_payment_types: [],
                    installments: 12
                }
            };

            console.log('📤 [MP Service] Payload ANTES de JSON.stringify:', payload);
            console.log('📤 [MP Service] payment_methods.excluded_payment_types tipo:', typeof payload.payment_methods.excluded_payment_types);
            console.log('📤 [MP Service] payment_methods.excluded_payment_types é array?:', Array.isArray(payload.payment_methods.excluded_payment_types));

            const response = await fetch(`${SUPABASE_URL}/functions/v1/mp-create-preference`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [MP] Erro ao criar preferência:', errorText);
                throw new Error(`Erro ao criar preferência: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ [MP] Preferência criada com sucesso:', result);

            return {
                success: true,
                init_point: result.init_point,
                preference_id: result.preference_id,
                sandbox_init_point: result.sandbox_init_point
            };

        } catch (error) {
            console.error('❌ [MP] Erro no createPreference:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Busca detalhes de um pagamento
     * @param {string} paymentId - ID do pagamento no Mercado Pago
     * @returns {Promise<Object>} - Dados do pagamento
     */
    static async getPayment(paymentId) {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('mp_payment_id', paymentId)
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('❌ [MP] Erro ao buscar pagamento:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Lista pagamentos de um agendamento
     * @param {string} bookingId - ID do agendamento
     * @returns {Promise<Array>} - Lista de pagamentos
     */
    static async getBookingPayments(bookingId) {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('booking_id', bookingId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ [MP] Erro ao buscar pagamentos:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    /**
     * Lista todos os pagamentos com filtros
     * @param {Object} filters - Filtros de busca
     * @returns {Promise<Array>} - Lista de pagamentos
     */
    static async listPayments(filters = {}) {
        try {
            let query = supabase
                .from('payments')
                .select('*, booking:bookings(patient_name, patient_email, booking_date, booking_time)');

            // Aplicar filtros
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            if (filters.payment_method) {
                query = query.eq('payment_method', filters.payment_method);
            }

            if (filters.date_from) {
                query = query.gte('created_at', filters.date_from);
            }

            if (filters.date_to) {
                query = query.lte('created_at', filters.date_to);
            }

            if (filters.payer_email) {
                query = query.ilike('payer_email', `%${filters.payer_email}%`);
            }

            query = query.order('created_at', { ascending: false });

            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;

            if (error) throw error;

            return { success: true, data: data || [] };
        } catch (error) {
            console.error('❌ [MP] Erro ao listar pagamentos:', error);
            return { success: false, error: error.message, data: [] };
        }
    }

    /**
     * Solicita reembolso de um pagamento
     * @param {string} paymentId - ID do pagamento a ser reembolsado
     * @param {number} amount - Valor a reembolsar (opcional, total se não informado)
     * @returns {Promise<Object>} - Resultado do reembolso
     */
    static async refundPayment(paymentId, amount = null) {
        try {
            console.log('💰 [MP] Solicitando reembolso...', { paymentId, amount });

            const response = await fetch(`${SUPABASE_URL}/functions/v1/mp-refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    payment_id: paymentId,
                    amount: amount
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [MP] Erro ao processar reembolso:', errorText);
                throw new Error(`Erro ao processar reembolso: ${errorText}`);
            }

            const result = await response.json();
            console.log('✅ [MP] Reembolso processado:', result);

            return { success: true, data: result };

        } catch (error) {
            console.error('❌ [MP] Erro no refundPayment:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Cancela um pagamento pendente
     * @param {string} paymentId - ID do pagamento
     * @returns {Promise<Object>} - Resultado do cancelamento
     */
    static async cancelPayment(paymentId) {
        try {
            const { error } = await supabase
                .from('payments')
                .update({ 
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('mp_payment_id', paymentId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('❌ [MP] Erro ao cancelar pagamento:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Formata valor monetário
     * @param {number} amount - Valor a formatar
     * @returns {string} - Valor formatado
     */
    static formatCurrency(amount) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(amount || 0);
    }

    /**
     * Retorna label traduzido para status
     * @param {string} status - Status do pagamento
     * @returns {string} - Label do status
     */
    static getStatusLabel(status) {
        const labels = {
            'pending': 'Pendente',
            'approved': 'Aprovado',
            'authorized': 'Autorizado',
            'in_process': 'Em Processamento',
            'in_mediation': 'Em Mediação',
            'rejected': 'Rejeitado',
            'cancelled': 'Cancelado',
            'refunded': 'Reembolsado',
            'charged_back': 'Chargeback'
        };
        return labels[status] || status;
    }

    /**
     * Retorna cor para status
     * @param {string} status - Status do pagamento
     * @returns {string} - Classes CSS
     */
    static getStatusColor(status) {
        const colors = {
            'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'approved': 'bg-green-100 text-green-800 border-green-200',
            'authorized': 'bg-blue-100 text-blue-800 border-blue-200',
            'in_process': 'bg-blue-100 text-blue-800 border-blue-200',
            'in_mediation': 'bg-orange-100 text-orange-800 border-orange-200',
            'rejected': 'bg-red-100 text-red-800 border-red-200',
            'cancelled': 'bg-gray-100 text-gray-800 border-gray-200',
            'refunded': 'bg-purple-100 text-purple-800 border-purple-200',
            'charged_back': 'bg-red-100 text-red-800 border-red-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    }

    /**
     * Retorna label do método de pagamento
     * @param {string} method - Método de pagamento
     * @returns {string} - Label do método
     */
    static getPaymentMethodLabel(method) {
        const labels = {
            'pix': 'PIX',
            'credit_card': 'Cartão de Crédito',
            'debit_card': 'Cartão de Débito',
            'bank_transfer': 'Boleto Bancário',
            'ticket': 'Boleto',
            'account_money': 'Dinheiro em Conta'
        };
        return labels[method] || method;
    }
}

export default MercadoPagoService;
