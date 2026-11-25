/**
 * Serviço Canônico de Conciliação Financeira & Fiscal (4 Pontas)
 * Cruza: Agendamentos (bookings) × Gateway (payments) × Razão (payment_ledger_entries) × Fiscal (nfse_emissions) × Repasses (payment_bookings).
 *
 * Somente leitura + detecção pura de exceções para Gestão por Exceção no Painel Admin.
 */

import { supabase } from '@/lib/customSupabaseClient';
import { toCents, fromCents } from '@/lib/money';

export const EXCEPTION_TYPES = {
  PAID_BOOKING_WITHOUT_PAYMENT: {
    code: 'PAID_BOOKING_WITHOUT_PAYMENT',
    label: 'Consulta Paga sem Pagamento MP',
    severity: 'critical',
    targetTab: 'bookings',
    actionLabel: 'Ver Agendamentos'
  },
  PAYMENT_WITHOUT_LEDGER: {
    code: 'PAYMENT_WITHOUT_LEDGER',
    label: 'Pagamento Aprovado sem Ledger',
    severity: 'critical',
    targetTab: 'livro-caixa',
    actionLabel: 'Abrir Livro Caixa'
  },
  UNBALANCED_LEDGER_TX: {
    code: 'UNBALANCED_LEDGER_TX',
    label: 'Transação Desbalanceada no Ledger',
    severity: 'high',
    targetTab: 'livro-caixa',
    actionLabel: 'Auditar Livro Caixa'
  },
  MISSING_OR_FAILED_NFSE: {
    code: 'MISSING_OR_FAILED_NFSE',
    label: 'Pendência / Falha de NFS-e',
    severity: 'high',
    targetTab: 'nfse',
    actionLabel: 'Resolver NFS-e'
  },
  COMPLETED_WITHOUT_PAYOUT: {
    code: 'COMPLETED_WITHOUT_PAYOUT',
    label: 'Sessão Concluída sem Repasse Vinculado',
    severity: 'medium',
    targetTab: 'payments',
    actionLabel: 'Ir para Repasses'
  },
  REFUND_WITHOUT_LEDGER_REVERSAL: {
    code: 'REFUND_WITHOUT_LEDGER_REVERSAL',
    label: 'Reembolso/Chargeback sem Estorno no Ledger',
    severity: 'critical',
    targetTab: 'livro-caixa',
    actionLabel: 'Verificar Estorno'
  }
};

const REALIZED_BOOKING_STATUSES = new Set(['paid', 'confirmed', 'completed', 'no_show_unjustified']);
const COMPLETED_FOR_PAYOUT_STATUSES = new Set(['completed', 'no_show_unjustified']);
const VALID_NFSE_OK_STATUSES = new Set(['issued', 'manual_resolved', 'pending', 'processing']);
const REFUNDED_PAYMENT_STATUSES = new Set(['refunded', 'charged_back']);

/**
 * Função pura e testável que detecta exceções de conciliação nas 4 pontas.
 */
export function detectReconciliationExceptions({
  bookings = [],
  payments = [],
  ledgerEntries = [],
  nfseEmissions = [],
  paymentBookings = []
} = {}) {
  const exceptions = [];

  const paymentsByBookingId = new Map();
  for (const p of payments) {
    if (!p?.booking_id) continue;
    const list = paymentsByBookingId.get(p.booking_id) || [];
    list.push(p);
    paymentsByBookingId.set(p.booking_id, list);
  }

  const ledgerByTxId = new Map();
  for (const entry of ledgerEntries) {
    if (!entry?.transaction_id) continue;
    const list = ledgerByTxId.get(entry.transaction_id) || [];
    list.push(entry);
    ledgerByTxId.set(entry.transaction_id, list);
  }

  const nfseByBookingId = new Map();
  const nfseByPaymentId = new Map();
  for (const n of nfseEmissions) {
    if (n?.booking_id) {
      const list = nfseByBookingId.get(n.booking_id) || [];
      list.push(n);
      nfseByBookingId.set(n.booking_id, list);
    }
    if (n?.payment_id) {
      const list = nfseByPaymentId.get(n.payment_id) || [];
      list.push(n);
      nfseByPaymentId.set(n.payment_id, list);
    }
  }

  const payoutBookingIds = new Set(
    (paymentBookings || []).map((pb) => pb?.booking_id).filter(Boolean)
  );

  // 1. Verificar agendamentos realizados vs Pagamentos, NFS-e e Repasses
  for (const b of bookings) {
    if (!b?.id) continue;
    const status = String(b.status || '').toLowerCase();
    if (!REALIZED_BOOKING_STATUSES.has(status)) continue;

    const amount = Number(b.valor_consulta || 0);
    const linkedPayments = paymentsByBookingId.get(b.id) || [];
    const hasApprovedPayment =
      linkedPayments.some((p) => String(p.status || '').toLowerCase() === 'approved') ||
      Boolean(b.marketplace_payment_id);

    // 1a. Consulta paga/confirmada sem pagamento aprovado (ignora consultas de pacote ou cortesia R$ 0)
    if (amount > 0 && !b.package_id && !hasApprovedPayment) {
      exceptions.push({
        id: `no-pay-${b.id}`,
        ...EXCEPTION_TYPES.PAID_BOOKING_WITHOUT_PAYMENT,
        referenceId: b.id,
        date: b.booking_date || b.created_at,
        title: b.patient_name || 'Paciente',
        subtitle: `Agendamento ${b.booking_date || ''} ${b.booking_time || ''} • Status: ${b.status}`,
        amount,
        detail: 'Agendamento marcado como realizado/confirmado sem pagamento aprovado vinculado.'
      });
    }

    // 1b. Pendência ou falha de NFS-e (para consultas avulsas pagas > 0)
    if (amount > 0 && !b.package_id) {
      const relatedNfse = [
        ...(nfseByBookingId.get(b.id) || []),
        ...linkedPayments.flatMap((p) => nfseByPaymentId.get(p.id) || [])
      ];
      const hasOkNfse = relatedNfse.some((n) => VALID_NFSE_OK_STATUSES.has(String(n.status || '').toLowerCase()));
      const failedNfse = relatedNfse.find((n) => String(n.status || '').toLowerCase() === 'error');

      if (!hasOkNfse) {
        exceptions.push({
          id: `nfse-${b.id}`,
          ...EXCEPTION_TYPES.MISSING_OR_FAILED_NFSE,
          referenceId: b.id,
          date: b.booking_date || b.created_at,
          title: b.patient_name || 'Paciente',
          subtitle: failedNfse
            ? `Erro NFS-e (${failedNfse.error_category || 'PBH'})`
            : 'Nenhuma NFS-e emitida/enfileirada',
          amount,
          detail: failedNfse?.error_message || 'Consulta realizada/paga sem emissão fiscal correspondente.'
        });
      }
    }

    // 1c. Sessão concluída sem repasse vinculado em payment_bookings
    const payoutAmount = Number(b.valor_repasse_profissional || 0);
    if (COMPLETED_FOR_PAYOUT_STATUSES.has(status) && payoutAmount > 0 && !payoutBookingIds.has(b.id)) {
      exceptions.push({
        id: `no-payout-${b.id}`,
        ...EXCEPTION_TYPES.COMPLETED_WITHOUT_PAYOUT,
        referenceId: b.id,
        date: b.booking_date || b.created_at,
        title: b.professional?.name || 'Profissional',
        subtitle: `Paciente: ${b.patient_name || '—'} • ${b.booking_date || ''}`,
        amount: payoutAmount,
        detail: 'Sessão concluída/no-show sem vínculo em lote de repasse (payment_bookings).'
      });
    }
  }

  // 2. Verificar pagamentos aprovados/reembolsados vs Ledger
  for (const p of payments) {
    if (!p?.id) continue;
    const pStatus = String(p.status || '').toLowerCase();
    const txEntries = ledgerByTxId.get(p.id) || [];

    if (pStatus === 'approved' && txEntries.length === 0) {
      exceptions.push({
        id: `no-ledger-${p.id}`,
        ...EXCEPTION_TYPES.PAYMENT_WITHOUT_LEDGER,
        referenceId: p.id,
        date: p.date_approved || p.created_at,
        title: p.payer_name || p.payer_email || `MP #${p.mp_payment_id || p.id.slice(0, 8)}`,
        subtitle: `Payment ID: ${p.id.slice(0, 8)} • MP: ${p.mp_payment_id || '—'}`,
        amount: Number(p.amount || 0),
        detail: 'Pagamento aprovado no gateway sem partidas registradas no Livro Caixa.'
      });
    }

    if (REFUNDED_PAYMENT_STATUSES.has(pStatus)) {
      const hasCredit = txEntries.some((e) => e.entry_type === 'CREDIT');
      const hasReversalDebit = txEntries.some(
        (e) =>
          e.entry_type === 'DEBIT' &&
          ['REVENUE_SERVICE', 'LIABILITY_PROFESSIONAL', 'PACKAGE_ESCROW'].includes(e.account_code)
      );
      if (hasCredit && !hasReversalDebit) {
        exceptions.push({
          id: `refund-no-rev-${p.id}`,
          ...EXCEPTION_TYPES.REFUND_WITHOUT_LEDGER_REVERSAL,
          referenceId: p.id,
          date: p.refunded_at || p.created_at,
          title: p.payer_name || p.payer_email || `Pagamento ${p.id.slice(0, 8)}`,
          subtitle: `Status gateway: ${p.status}`,
          amount: Number(p.refund_amount || p.amount || 0),
          detail: 'Pagamento reembolsado/chargeback sem lançamento de estorno (DEBIT) nas contas de receita/repasse.'
        });
      }
    }
  }

  // 3. Verificar balanceamento de partidas dobradas por transaction_id no Ledger
  for (const [txId, txEntries] of ledgerByTxId.entries()) {
    let debitCents = 0;
    let creditCents = 0;
    for (const e of txEntries) {
      const c = toCents(e.amount);
      if (e.entry_type === 'DEBIT') debitCents += c;
      else if (e.entry_type === 'CREDIT') creditCents += c;
    }
    const diffCents = Math.abs(debitCents - creditCents);
    if (diffCents > 1) {
      exceptions.push({
        id: `unbalanced-${txId}`,
        ...EXCEPTION_TYPES.UNBALANCED_LEDGER_TX,
        referenceId: txId,
        date: txEntries[0]?.created_at,
        title: `Transação ${String(txId).slice(0, 8)}`,
        subtitle: `Débitos: R$ ${fromCents(debitCents).toFixed(2)} × Créditos: R$ ${fromCents(creditCents).toFixed(2)}`,
        amount: fromCents(diffCents),
        detail: 'Soma de débitos difere da soma de créditos nesta transação do Livro Caixa.'
      });
    }
  }

  // Ordenar por severidade (critical -> high -> medium) e data mais recente
  const severityRank = { critical: 0, high: 1, medium: 2 };
  exceptions.sort((a, b) => {
    const rankDiff = (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
    if (rankDiff !== 0) return rankDiff;
    return String(b.date || '').localeCompare(String(a.date || ''));
  });

  const summary = {
    total: exceptions.length,
    critical: exceptions.filter((e) => e.severity === 'critical').length,
    high: exceptions.filter((e) => e.severity === 'high').length,
    medium: exceptions.filter((e) => e.severity === 'medium').length,
    totalAmountAtRisk: fromCents(exceptions.reduce((acc, e) => acc + toCents(e.amount), 0)),
    checkedBookings: bookings.length,
    checkedPayments: payments.length,
    checkedLedgerEntries: ledgerEntries.length
  };

  return { exceptions, summary };
}

/**
 * Busca snapshot recente das 4 pontas no Supabase para conciliação por exceção.
 */
export async function fetchReconciliationSnapshot({ days = 90 } = {}) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceIso = sinceDate.toISOString();
  const sinceYmd = sinceIso.slice(0, 10);

  const [bookingsRes, paymentsRes, ledgerRes, nfseRes, paymentBookingsRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, booking_date, booking_time, created_at, patient_name, status, payment_status, valor_consulta, valor_repasse_profissional, marketplace_payment_id, package_id, professional:professionals(name)')
      .gte('booking_date', sinceYmd)
      .in('status', ['paid', 'confirmed', 'completed', 'no_show_unjustified'])
      .order('booking_date', { ascending: false })
      .limit(500),
    supabase
      .from('payments')
      .select('id, booking_id, mp_payment_id, status, amount, refund_amount, refund_status, refunded_at, date_approved, created_at, payer_name, payer_email')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('payment_ledger_entries')
      .select('id, transaction_id, entry_type, account_code, amount, created_at')
      .gte('created_at', sinceIso)
      .limit(2000),
    supabase
      .from('nfse_emissions')
      .select('id, booking_id, payment_id, status, nfse_number, error_category, error_message, created_at')
      .gte('created_at', sinceIso)
      .limit(500),
    supabase
      .from('payment_bookings')
      .select('id, booking_id, payment_id, amount')
      .gte('created_at', sinceIso)
      .limit(1000)
  ]);

  const errors = [
    bookingsRes.error,
    paymentsRes.error,
    ledgerRes.error,
    nfseRes.error,
    paymentBookingsRes.error
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors[0].message || 'Falha ao consultar dados de conciliação');
  }

  return detectReconciliationExceptions({
    bookings: bookingsRes.data || [],
    payments: paymentsRes.data || [],
    ledgerEntries: ledgerRes.data || [],
    nfseEmissions: nfseRes.data || [],
    paymentBookings: paymentBookingsRes.data || []
  });
}

