/**
 * Serviço Canônico de Pagamentos (Fase 4 - Domain Unification)
 * Single Source of Truth (SSOT) para ciclo de vida de pagamentos Mercado Pago e reconciliação.
 */

import { supabase } from '@/lib/customSupabaseClient';

/**
 * Colunas reais existentes na tabela public.payments (validado via databaseCatalog.json)
 */
export const ALLOWED_PAYMENT_FIELDS = [
  'amount',
  'booking_id',
  'created_at',
  'created_by_admin_id',
  'currency',
  'date_approved',
  'date_created',
  'date_last_updated',
  'description',
  'expires_at',
  'external_reference',
  'fee_amount',
  'id',
  'idempotency_key',
  'inscricao_id',
  'metadata',
  'mp_payment_id',
  'mp_preference_id',
  'net_amount',
  'payer_document',
  'payer_email',
  'payer_name',
  'payment_attempt_count',
  'payment_method',
  'payment_type',
  'payment_url',
  'qr_code',
  'qr_code_base64',
  'raw_payload',
  'refund_amount',
  'refund_date',
  'refund_id',
  'refund_status',
  'refunded_at',
  'status',
  'status_detail',
  'ticket_url',
  'updated_at',
  'wallet_balance_used'
];

/**
 * Status canônicos de pagamento suportados pelo Mercado Pago e reconciliação
 */
export const VALID_PAYMENT_STATUSES = [
  'pending',
  'approved',
  'authorized',
  'in_process',
  'in_mediation',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back'
];

/**
 * Sanitiza o payload garantindo que apenas colunas existentes no PostgreSQL sejam enviadas
 * @param {Record<string, any>} payload
 * @returns {Record<string, any>}
 */
export function sanitizePaymentPayload(payload) {
  if (!payload || typeof payload !== 'object') return {};

  const sanitized = {};
  for (const [key, value] of Object.entries(payload)) {
    if (ALLOWED_PAYMENT_FIELDS.includes(key)) {
      sanitized[key] = value;
    }
  }

  // Validação de status se fornecido
  if (sanitized.status && !VALID_PAYMENT_STATUSES.includes(sanitized.status)) {
    console.warn(`[paymentService] Status de pagamento inválido ignorado: ${sanitized.status}`);
    delete sanitized.status;
  }

  return sanitized;
}

/**
 * Busca pagamento por ID primário
 * @param {string} id
 * @returns {Promise<any>}
 */
export async function getPaymentById(id) {
  if (!id) throw new Error('[paymentService] ID do pagamento é obrigatório.');

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Busca pagamento pelo ID do Mercado Pago (mp_payment_id)
 * Utilizado por páginas de retorno e webhooks
 * @param {string|number} mpPaymentId
 * @returns {Promise<any|null>}
 */
export async function getPaymentByMpId(mpPaymentId) {
  if (!mpPaymentId) return null;

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('mp_payment_id', mpPaymentId.toString())
    .maybeSingle();

  if (error) {
    console.error('[paymentService] Erro ao buscar pagamento por mp_payment_id:', error);
    return null;
  }

  return data;
}

/**
 * Busca o pagamento ativo mais recente para um determinado agendamento
 * @param {string} bookingId
 * @returns {Promise<any|null>}
 */
export async function getPaymentByBookingId(bookingId) {
  if (!bookingId) return null;

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.warn('[paymentService] Erro ao buscar pagamento por booking_id:', error);
    return null;
  }

  return data?.[0] || null;
}

/**
 * Lista pagamentos com filtros aplicáveis
 * @param {Object} options
 * @returns {Promise<any[]>}
 */
export async function listPayments(options = {}) {
  const {
    status,
    booking_id,
    limit = 50,
    orderBy = 'created_at',
    ascending = false
  } = options;

  let query = supabase.from('payments').select('*');

  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else {
      query = query.eq('status', status);
    }
  }

  if (booking_id) {
    query = query.eq('booking_id', booking_id);
  }

  query = query.order(orderBy, { ascending }).limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Atualiza o status de um pagamento de forma atômica
 * @param {string} id
 * @param {string} status
 * @param {Record<string, any>} details
 * @returns {Promise<any>}
 */
export async function updatePaymentStatus(id, status, details = {}) {
  if (!id) throw new Error('[paymentService] ID é obrigatório para atualização de status.');
  if (!VALID_PAYMENT_STATUSES.includes(status)) {
    throw new Error(`[paymentService] Status inválido: "${status}". Status permitidos: ${VALID_PAYMENT_STATUSES.join(', ')}`);
  }

  const payload = sanitizePaymentPayload({
    status,
    ...details,
    updated_at: new Date().toISOString()
  });

  const { data, error } = await supabase
    .from('payments')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Registra uma nova tentativa/registro de pagamento sanitizado
 * @param {Record<string, any>} payload
 * @returns {Promise<any>}
 */
export async function createPaymentRecord(payload) {
  const sanitized = sanitizePaymentPayload(payload);

  // Verificação de idempotência (Onda 2 - Padrão Stripe/Fintech)
  if (sanitized.idempotency_key) {
    const { data: existing } = await supabase
      .from('payments')
      .select('*')
      .eq('idempotency_key', sanitized.idempotency_key)
      .maybeSingle();

    if (existing) {
      console.log(`[paymentService] Registro de pagamento existente reutilizado via idempotency_key: ${sanitized.idempotency_key}`);
      return existing;
    }
  }

  const { data, error } = await supabase
    .from('payments')
    .insert([sanitized])
    .select()
    .single();

  if (error) throw error;
  return data;
}
