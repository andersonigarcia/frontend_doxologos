/**
 * Serviço Canônico do Razão Contábil (Ledger — payment_ledger_entries)
 * Single Source of Truth (SSOT) para partidas dobradas, estornos imutáveis e apuração de receita líquida.
 *
 * Regras Contábeis:
 *  1. Imutabilidade: Lançamentos no razão NUNCA sofrem UPDATE ou DELETE físico. Correções ocorrem via estorno (reversal).
 *  2. Partidas Dobradas: Todo lançamento manual gera exatamente 2 pernas balanceadas (DEBIT + CREDIT) no mesmo transaction_id.
 *  3. Apuração Líquida: Receita e Passivo são créditos líquidos de débitos (CREDIT - DEBIT).
 */

import { supabase } from '@/lib/customSupabaseClient';
import { toCents, fromCents } from '@/lib/money';
import { auditLogger, AuditAction, LogLevel } from '@/lib/auditLogger';

export const ALLOWED_LEDGER_FIELDS = [
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

export const LEDGER_ACCOUNTS = [
  { code: 'CASH_BANK', label: 'Conta Banco / Caixa (Ativo)', nature: 'DEBIT' },
  { code: 'REVENUE_SERVICE', label: 'Receita Plataforma (Receita)', nature: 'CREDIT' },
  { code: 'LIABILITY_PROFESSIONAL', label: 'A Pagar Profissional (Passivo)', nature: 'CREDIT' },
  { code: 'PACKAGE_ESCROW', label: 'Custódia de Pacotes (Passivo)', nature: 'CREDIT' },
  { code: 'EXPENSE_FEE', label: 'Taxa Bancária / Gateway (Despesa)', nature: 'DEBIT' },
  { code: 'EXPENSE_OPERATIONAL', label: 'Despesa Operacional (Despesa)', nature: 'DEBIT' },
  { code: 'EQUITY_ADJUSTMENT', label: 'Ajuste de Capital (PL)', nature: 'CREDIT' },
  { code: 'REVENUE_GROSS', label: 'Receita Bruta Legado (Receita)', nature: 'CREDIT' }
];

/**
 * Constrói o par balanceado de partidas dobradas (DEBIT + CREDIT) para inserção no razão.
 */
export function buildDoubleEntryPair({
  debitAccount,
  creditAccount,
  amount,
  description,
  userId = null,
  transactionId = null,
  metadata = {}
}) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Valor do lançamento deve ser maior que zero.');
  }
  if (!debitAccount || !creditAccount) {
    throw new Error('Selecione a conta de débito e a conta de crédito.');
  }
  if (debitAccount === creditAccount) {
    throw new Error('A conta de débito e a conta de crédito devem ser diferentes.');
  }
  const cleanDesc = String(description || '').trim();
  if (!cleanDesc) {
    throw new Error('Descrição obrigatória.');
  }

  const finalDesc = cleanDesc.includes('(Manual)') ? cleanDesc : `${cleanDesc} (Manual)`;
  const txId = transactionId || crypto.randomUUID();
  const baseMetadata = { source: 'manual_reconciliation', ...metadata };
  const nowIso = new Date().toISOString();

  return [
    {
      transaction_id: txId,
      entry_type: 'DEBIT',
      account_code: debitAccount,
      amount: numericAmount,
      description: finalDesc,
      metadata: baseMetadata,
      created_by: userId,
      created_at: nowIso
    },
    {
      transaction_id: txId,
      entry_type: 'CREDIT',
      account_code: creditAccount,
      amount: numericAmount,
      description: finalDesc,
      metadata: baseMetadata,
      created_by: userId,
      created_at: nowIso
    }
  ];
}

/**
 * Registra lançamento manual em partidas dobradas no Supabase e grava trilha de auditoria.
 */
export async function createDoubleEntryManualTransaction(params) {
  let currentUserId = params?.userId || null;
  if (!currentUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id || null;
  }

  const entries = buildDoubleEntryPair({ ...params, userId: currentUserId });
  const { data, error } = await supabase
    .from('payment_ledger_entries')
    .insert(entries)
    .select();

  if (error) throw error;

  await auditLogger.log(AuditAction.PAYMENT_CREATE, {
    level: LogLevel.INFO,
    resourceType: 'payment_ledger_entries',
    resourceId: entries[0].transaction_id,
    userId: currentUserId,
    details: {
      source: 'manual_reconciliation',
      debit_account: params.debitAccount,
      credit_account: params.creditAccount,
      amount: entries[0].amount
    }
  });

  return { data: data || entries, transactionId: entries[0].transaction_id };
}

/**
 * Constrói as partidas de estorno inversas (DEBIT <-> CREDIT) para uma transação existente.
 */
export function buildReversalEntries(originalEntries = [], { reason = 'Estorno administrativo', userId = null, reversalTransactionId = null } = {}) {
  if (!Array.isArray(originalEntries) || originalEntries.length === 0) {
    throw new Error('Nenhum lançamento encontrado para estornar.');
  }

  const txId = reversalTransactionId || crypto.randomUUID();
  const originalTxId = originalEntries[0]?.transaction_id || null;
  const cleanReason = String(reason || 'Estorno administrativo').trim();
  const nowIso = new Date().toISOString();

  return originalEntries.map((orig) => ({
    transaction_id: txId,
    entry_type: orig.entry_type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
    account_code: orig.account_code,
    amount: Number(orig.amount || 0),
    description: `ESTORNO: ${orig.description || 'Lançamento'} (${cleanReason})`,
    metadata: {
      source: 'manual_reversal',
      reversal_of: originalTxId,
      original_entry_id: orig.id,
      reason: cleanReason
    },
    created_by: userId,
    created_at: nowIso
  }));
}

/**
 * Estorna uma transação inteira no razão criando partidas inversas imutáveis.
 */
export async function reverseLedgerTransaction(transactionId, { reason = 'Estorno administrativo' } = {}) {
  if (!transactionId) throw new Error('ID da transação é obrigatório para estorno.');

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id || null;

  const { data: originalEntries, error: fetchError } = await supabase
    .from('payment_ledger_entries')
    .select('*')
    .eq('transaction_id', transactionId);

  if (fetchError) throw fetchError;
  if (!originalEntries || originalEntries.length === 0) {
    throw new Error('Transação não encontrada no Livro Caixa.');
  }

  // Impedir estorno duplicado da mesma transação
  const { data: existingReversal } = await supabase
    .from('payment_ledger_entries')
    .select('id')
    .contains('metadata', { reversal_of: transactionId })
    .limit(1);

  if (existingReversal && existingReversal.length > 0) {
    throw new Error('Esta transação já foi estornada anteriormente.');
  }

  const reversalEntries = buildReversalEntries(originalEntries, {
    reason,
    userId: currentUserId
  });

  const { data, error: insertError } = await supabase
    .from('payment_ledger_entries')
    .insert(reversalEntries)
    .select();

  if (insertError) throw insertError;

  await auditLogger.log(AuditAction.PAYMENT_REFUND, {
    level: LogLevel.WARNING,
    resourceType: 'payment_ledger_entries',
    resourceId: transactionId,
    userId: currentUserId,
    details: {
      action: 'ledger_reversal',
      reversal_transaction_id: reversalEntries[0].transaction_id,
      reason,
      entries_count: reversalEntries.length
    }
  });

  return { data: data || reversalEntries, reversalTransactionId: reversalEntries[0].transaction_id };
}

/**
 * Apura receita líquida e repasses líquidos a partir do razão (considerando CREDIT - DEBIT).
 */
export function computeLedgerRevenueSummary(entries = []) {
  let platformRevenueCents = 0;
  let totalPayoutsCents = 0;
  const uniqueTransactions = new Set();

  for (const e of entries || []) {
    const cents = toCents(e?.amount);
    const sign = e?.entry_type === 'CREDIT' ? 1 : e?.entry_type === 'DEBIT' ? -1 : 0;
    if (sign === 0) continue;

    if (e.account_code === 'REVENUE_SERVICE' || e.account_code === 'REVENUE_CANCELLATION_FEE') {
      platformRevenueCents += sign * cents;
      if (e.transaction_id && e.entry_type === 'CREDIT') {
        uniqueTransactions.add(e.transaction_id);
      }
    } else if (e.account_code === 'LIABILITY_PROFESSIONAL') {
      totalPayoutsCents += sign * cents;
    }
  }

  const grossRevenueCents = platformRevenueCents + totalPayoutsCents;
  const totalRevenue = fromCents(grossRevenueCents);
  const totalPayouts = fromCents(totalPayoutsCents);
  const platformMargin = fromCents(platformRevenueCents);
  const marginPercentage = grossRevenueCents > 0
    ? (platformRevenueCents / grossRevenueCents) * 100
    : 0;

  return {
    totalRevenue,
    totalPayouts,
    platformMargin,
    marginPercentage,
    bookingsCount: uniqueTransactions.size
  };
}

