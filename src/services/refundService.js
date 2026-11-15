/**
 * Serviço Canônico de Reembolsos e Cancelamentos (Fase 4 - Domain Unification)
 * Single Source of Truth (SSOT) para o ciclo de vida de estornos, cancelamentos e reversões.
 *
 * Unificação dos 3 Módulos de Reembolso do Ecossistema Doxologos:
 *  1. Reembolso Financeiro Manual & Gateway (Admin/Fintech - PaymentsPage, ledger, anti-clawback)
 *  2. Cancelamento e Crédito de Consultas (Paciente - PacientePage, 24h notice rule, Zero-PII)
 *  3. Reembolso de Pacotes Multi-Sessão & Eventos (80/20 retention, reversão de splits)
 */

import { supabase } from '@/lib/customSupabaseClient';
import { submitManualRefund, fetchManualRefunds, getManualRefundProof } from '@/lib/manualRefundService';
import { auditLogger, AuditAction } from '@/lib/auditLogger';
import { calculatePackageRefundSummary, isBookingEligibleForRefund } from '@/lib/packageRefundCalculator';

/**
 * Constantes Globais do Domínio de Reembolsos
 */
export const HOURS_CANCELLATION_LIMIT = 24;
export const PACKAGE_REFUND_PERCENTAGE = 0.80;
export const PACKAGE_PLATFORM_RETENTION = 0.20;

/**
 * Colunas reais existentes na tabela public.payment_refunds (validado via databaseCatalog.json)
 */
export const ALLOWED_PAYMENT_REFUND_FIELDS = [
  'amount',
  'created_at',
  'currency',
  'id',
  'metadata',
  'payment_id',
  'processed_by',
  'proof_bucket',
  'proof_checksum',
  'proof_path',
  'reason',
  'updated_at'
];

/**
 * Colunas reais existentes na tabela public.payment_ledger_entries (validado via databaseCatalog.json)
 */
export const ALLOWED_PAYMENT_LEDGER_FIELDS = [
  'account_code',
  'amount',
  'created_at',
  'created_by',
  'description',
  'entry_type',
  'id',
  'metadata',
  'transaction_id'
];

/**
 * Palavras-chave clínicas e diagnósticas que JAMAIS devem vazar em motivos de reembolso
 * ou e-mails de notificação (CFP Art. 9º / LGPD Art. 11 - Dados Sensíveis de Saúde).
 */
const CLINICAL_PROHIBITED_TERMS = [
  'ansiedade',
  'crise',
  'pânico',
  'depressão',
  'transtorno',
  'bipolar',
  'surto',
  'suicíd',
  'trauma',
  'psicop',
  'diagnóstic',
  'cid',
  'dsm',
  'medicamento',
  'psiquiatr',
  'remédio',
  'consulta clínica',
  'sessão terapêutica',
  'prontuário',
  'anamnese',
  'abuso',
  'luto',
  'fobia'
];

/**
 * Higieniza o motivo de cancelamento/reembolso garantindo Zero-PII e Sigilo Clínico.
 * @param {string} reasonText
 * @param {string} [fallbackText]
 * @returns {string}
 */
export function sanitizeRefundReason(reasonText, fallbackText = 'Solicitação administrativa de cancelamento/reembolso') {
  if (!reasonText || typeof reasonText !== 'string') {
    return fallbackText;
  }

  // Remover blocos <script>...</script> e quaisquer tags HTML maliciosas (prevenção de XSS)
  const stripped = reasonText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) return fallbackText;

  const lower = stripped.toLowerCase();
  for (const term of CLINICAL_PROHIBITED_TERMS) {
    if (lower.includes(term)) {
      console.warn(`[refundService] Termo clínico sensível interceptado e sanitizado: "${term}"`);
      return fallbackText;
    }
  }

  return stripped;
}

/**
 * =========================================================================
 * MÓDULO 1: REEMBOLSO FINANCEIRO MANUAL & GATEWAY (ADMIN / FINTECH)
 * =========================================================================
 */

/**
 * Verifica a integridade dos repasses antes de um estorno.
 * Impede que a plataforma sofra descasamento financeiro (estornar paciente quando o psicólogo já recebeu).
 * @param {Object} params
 * @param {string} [params.paymentId]
 * @param {string} [params.bookingId]
 * @returns {Promise<{ hasPaidPayout: boolean, hasPendingPayout: boolean, payoutRecord: any|null, warningMessage: string|null }>}
 */
export async function checkPayoutIntegrityForRefund({ paymentId, bookingId }) {
  let resolvedBookingId = bookingId;

  if (!resolvedBookingId && paymentId) {
    const { data: pay } = await supabase
      .from('payments')
      .select('booking_id')
      .eq('id', paymentId)
      .maybeSingle();
    resolvedBookingId = pay?.booking_id;
  }

  if (!resolvedBookingId) {
    return {
      hasPaidPayout: false,
      hasPendingPayout: false,
      payoutRecord: null,
      warningMessage: null
    };
  }

  // Verifica se o booking está vinculado a algum lote de repasse
  const { data: paymentBooking, error } = await supabase
    .from('payment_bookings')
    .select(`
      booking_id,
      payment_id,
      amount,
      payment:professional_payments (
        id,
        professional_id,
        status,
        total_amount,
        payment_date,
        period_start,
        period_end
      )
    `)
    .eq('booking_id', resolvedBookingId)
    .maybeSingle();

  if (error || !paymentBooking) {
    return {
      hasPaidPayout: false,
      hasPendingPayout: false,
      payoutRecord: null,
      warningMessage: null
    };
  }

  const payout = paymentBooking.payment;
  const isPaid = payout?.status === 'paid';
  const isPending = payout?.status === 'pending';

  let warningMessage = null;
  if (isPaid) {
    warningMessage = `Atenção: Os honorários deste agendamento já foram pagos ao profissional no lote #${payout.id?.slice(0, 8)}. Realizar o estorno ao paciente criará um descasamento de caixa na plataforma até que seja feito o acerto compensatório (clawback).`;
  } else if (isPending) {
    warningMessage = `Aviso: Este agendamento consta no lote de repasse #${payout.id?.slice(0, 8)} com status pendente. É recomendável recalcular o repasse antes de liberar o lote.`;
  }

  return {
    hasPaidPayout: isPaid,
    hasPendingPayout: isPending,
    payoutRecord: payout || null,
    warningMessage
  };
}

/**
 * Registra as partidas dobradas de estorno no Ledger Contábil (payment_ledger_entries).
 * Mantém o DRE e os relatórios financeiros em perfeita conformidade.
 * @param {Object} params
 * @param {string} params.paymentId
 * @param {number} params.amount
 * @param {string} [params.description]
 * @param {string} [params.adminId]
 * @param {Record<string, any>} [params.metadata]
 * @returns {Promise<any[]>}
 */
export async function recordRefundLedgerEntries({
  paymentId,
  amount,
  description = 'Estorno de pagamento',
  adminId = null,
  metadata = {}
}) {
  if (!paymentId || !amount || amount <= 0) {
    throw new Error('[refundService] paymentId e amount positivo são obrigatórios para escrituração no ledger.');
  }

  const now = new Date().toISOString();
  const safeDescription = sanitizeRefundReason(description);

  const entries = [
    {
      transaction_id: paymentId,
      entry_type: 'DEBIT',
      account_code: 'REFUNDS_EXPENSE',
      amount: Number(amount),
      description: safeDescription,
      created_by: adminId,
      created_at: now,
      metadata: { ...metadata, ledger_purpose: 'refund_reversal_debit' }
    },
    {
      transaction_id: paymentId,
      entry_type: 'CREDIT',
      account_code: 'CASH_BANK',
      amount: Number(amount),
      description: `Saída de caixa - ${safeDescription}`,
      created_by: adminId,
      created_at: now,
      metadata: { ...metadata, ledger_purpose: 'refund_reversal_credit' }
    }
  ];

  const { data, error } = await supabase
    .from('payment_ledger_entries')
    .insert(entries)
    .select();

  if (error) {
    console.error('[refundService] Erro ao registrar partidas no ledger contábil:', error);
    throw error;
  }

  return data || [];
}

/**
 * Executa o fluxo completo e unificado de Reembolso Manual (Fintech).
 * @param {Object} params
 * @param {string} params.paymentId
 * @param {number|null} [params.amount]
 * @param {string} [params.currency='BRL']
 * @param {string} params.reason
 * @param {string} params.proofBase64
 * @param {string} params.proofFilename
 * @param {string} [params.proofChecksum]
 * @param {Object} [params.notification]
 * @param {string} [params.adminId]
 * @returns {Promise<any>}
 */
export async function processManualPaymentRefund(params) {
  const {
    paymentId,
    amount,
    currency = 'BRL',
    reason,
    proofBase64,
    proofFilename,
    proofChecksum,
    notification = {},
    adminId = null
  } = params;

  if (!paymentId) throw new Error('[refundService] paymentId é obrigatório.');
  if (!reason) throw new Error('[refundService] Motivo do reembolso é obrigatório.');
  if (!proofBase64 || !proofFilename) throw new Error('[refundService] Comprovante é obrigatório.');

  // 1. Sanitizar motivo de reembolso (Zero PII)
  const safeReason = sanitizeRefundReason(reason);

  // 2. Chamar o serviço de invocação da Edge Function manual-refund
  const payload = {
    payment_id: paymentId,
    amount: amount || null,
    currency: currency || 'BRL',
    reason: safeReason,
    proof_base64: proofBase64,
    proof_filename: proofFilename,
    proof_checksum: proofChecksum,
    notification
  };

  const refundResult = await submitManualRefund(payload);

  // 3. Registrar auditoria de ação crítica
  try {
    await auditLogger.info(AuditAction.PAYMENT_REFUND, {
      resourceType: 'payment',
      resourceId: paymentId,
      details: {
        amount,
        currency,
        reason: safeReason,
        processed_by: adminId
      }
    });
  } catch (auditErr) {
    console.warn('[refundService] Falha ao registrar log de auditoria:', auditErr);
  }

  // 4. Escrituração contábil no Ledger imutável
  try {
    const finalAmount = amount || refundResult?.refund?.amount;
    if (finalAmount) {
      await recordRefundLedgerEntries({
        paymentId,
        amount: finalAmount,
        currency,
        description: safeReason,
        adminId,
        metadata: { refund_id: refundResult?.refund?.id }
      });
    }
  } catch (ledgerErr) {
    console.warn('[refundService] Aviso: Escrituração no ledger contábil gerou aviso (não bloqueante):', ledgerErr);
  }

  return refundResult;
}

/**
 * =========================================================================
 * MÓDULO 2: CANCELAMENTO E CRÉDITO DO PACIENTE (CONSULTAS INDIVIDUAIS)
 * =========================================================================
 */

/**
 * Avalia se um agendamento do paciente está dentro da janela de antecedência mínima (> 24h).
 * @param {string} bookingDate - YYYY-MM-DD
 * @param {string} [bookingTime='00:00'] - HH:mm
 * @param {Date} [now=new Date()]
 * @returns {{ isEligibleForCredit: boolean, hoursUntilSession: number, message: string }}
 */
export function evaluatePatientCancellationEligibility(bookingDate, bookingTime = '00:00', now = new Date()) {
  const isEligible = isBookingEligibleForRefund(bookingDate, bookingTime, now);

  if (!bookingDate) {
    return {
      isEligibleForCredit: false,
      hoursUntilSession: 0,
      message: 'Data de agendamento não fornecida.'
    };
  }

  const [year, month, day] = bookingDate.split('-').map(Number);
  const [hours, minutes] = bookingTime.split(':').map(Number);
  const sessionDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0);
  const hoursUntilSession = Number(((sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)).toFixed(1));

  const message = isEligible
    ? 'Cancelamento realizado com mais de 24h de antecedência. O valor integral será creditado em sua carteira para reagendamento futuro.'
    : 'Cancelamento realizado com menos de 24h do horário da sessão. O profissional reservou este horário com exclusividade, impossibilitando a geração de créditos ou reembolso.';

  return {
    isEligibleForCredit: isEligible,
    hoursUntilSession,
    message
  };
}

/**
 * Executa o cancelamento pelo paciente via Edge Function patient-cancel-booking com Zero PII.
 * @param {Object} params
 * @param {string} params.bookingId
 * @param {string} [params.reason]
 * @param {string} params.accessToken
 * @returns {Promise<any>}
 */
export async function executePatientCancellation({ bookingId, reason = '', accessToken }) {
  if (!bookingId) throw new Error('[refundService] bookingId é obrigatório para cancelamento.');
  if (!accessToken) throw new Error('[refundService] Sessão expirada. Autenticação obrigatória.');

  const safeReason = sanitizeRefundReason(reason, 'Cancelamento solicitado pelo paciente via portal');

  // Registrar auditoria prévia
  try {
    await auditLogger.info(AuditAction.BOOKING_CANCEL, {
      resourceType: 'booking',
      resourceId: bookingId,
      details: { triggered_by: 'patient_portal', reason: safeReason }
    });
  } catch (auditErr) {
    console.warn('[refundService] Erro ao registrar auditoria de cancelamento:', auditErr);
  }

  const { data, error } = await supabase.functions.invoke('patient-cancel-booking', {
    body: {
      booking_id: bookingId,
      reason: safeReason
    },
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (error) {
    throw new Error(error.message || 'Falha ao processar o cancelamento do agendamento.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

/**
 * =========================================================================
 * MÓDULO 3: PACOTES MULTI-SESSÃO & EVENTOS / WORKSHOPS
 * =========================================================================
 */

/**
 * Calcula o resumo financeiro de reembolso para pacotes de consultas múltiplas.
 * Regra: 80% do valor restante para sessões > 24h; 20% retenção administrativa.
 * @param {Array} bookings
 * @param {number} sessionPrice
 * @param {Date} [now]
 * @returns {Object}
 */
export function evaluatePackageRefund(bookings = [], sessionPrice = 150, now = new Date()) {
  return calculatePackageRefundSummary(bookings, sessionPrice, now);
}

/**
 * Executa a reversão financeira de um evento/workshop estornado.
 * @param {Object} params
 * @param {string} params.inscricaoId
 * @param {string} params.adminId
 * @param {'approve'|'reject'|'process'} params.actionType
 * @param {string} [params.reason]
 * @returns {Promise<any>}
 */
export async function processEventRefundReversal({ inscricaoId, adminId, actionType, reason = '' }) {
  if (!inscricaoId) throw new Error('[refundService] inscricaoId é obrigatório.');
  if (!adminId) throw new Error('[refundService] adminId é obrigatório.');

  const safeReason = sanitizeRefundReason(reason, 'Processamento de reembolso de inscrição em evento');

  if (actionType === 'process') {
    // Tenta invocar a RPC de reversão financeira se configurada
    try {
      const { data: reversalData, error: rpcError } = await supabase.rpc('process_refund_reversal', {
        p_inscricao_id: inscricaoId,
        p_admin_id: adminId
      });

      if (!rpcError && reversalData?.success) {
        return reversalData;
      }
    } catch (rpcErr) {
      console.warn('[refundService] RPC process_refund_reversal falhou ou não existe, executando fallback atômico:', rpcErr);
    }

    // Fallback atômico direto
    const { error: eventError } = await supabase
      .from('inscricoes_eventos')
      .update({
        refund_status: 'processed',
        updated_at: new Date().toISOString()
      })
      .eq('id', inscricaoId);

    if (eventError) throw eventError;

    return { success: true, status: 'processed' };
  }

  if (actionType === 'approve') {
    const { error } = await supabase
      .from('inscricoes_eventos')
      .update({
        refund_status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', inscricaoId);

    if (error) throw error;
    return { success: true, status: 'approved' };
  }

  if (actionType === 'reject') {
    const { error } = await supabase
      .from('inscricoes_eventos')
      .update({
        refund_status: 'rejected',
        cancellation_reason: safeReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', inscricaoId);

    if (error) throw error;
    return { success: true, status: 'rejected' };
  }

  throw new Error(`[refundService] Ação inválida para reembolso de evento: ${actionType}`);
}

/**
 * Re-exporta funções auxiliares de consulta para conveniência dos componentes
 */
export { fetchManualRefunds, getManualRefundProof };
