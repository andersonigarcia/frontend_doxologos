import { detectReconciliationExceptions } from '@/services/reconciliationService';

describe('reconciliationService — Conciliação por Exceção (4 Pontas)', () => {
  it('retorna zero exceções quando booking, payment, ledger, nfse e repasse estão consistentes', () => {
    const result = detectReconciliationExceptions({
      bookings: [
        {
          id: 'bk-1',
          booking_date: '2026-11-10',
          booking_time: '14:00',
          patient_name: 'Maria Silva',
          status: 'completed',
          valor_consulta: 150,
          valor_repasse_profissional: 90,
          professional: { name: 'Dr. João' }
        }
      ],
      payments: [
        {
          id: 'pay-1',
          booking_id: 'bk-1',
          mp_payment_id: 'mp-123',
          status: 'approved',
          amount: 150
        }
      ],
      ledgerEntries: [
        { id: 'l-1', transaction_id: 'pay-1', entry_type: 'DEBIT', account_code: 'CASH_BANK', amount: 150 },
        { id: 'l-2', transaction_id: 'pay-1', entry_type: 'CREDIT', account_code: 'REVENUE_SERVICE', amount: 60 },
        { id: 'l-3', transaction_id: 'pay-1', entry_type: 'CREDIT', account_code: 'LIABILITY_PROFESSIONAL', amount: 90 }
      ],
      nfseEmissions: [
        { id: 'nf-1', booking_id: 'bk-1', payment_id: 'pay-1', status: 'issued', nfse_number: '2026001' }
      ],
      paymentBookings: [
        { id: 'pb-1', booking_id: 'bk-1', payment_id: 'prof-pay-1', amount: 90 }
      ]
    });

    expect(result.exceptions).toHaveLength(0);
    expect(result.summary.total).toBe(0);
    expect(result.summary.totalAmountAtRisk).toBe(0);
  });

  it('detecta todas as 6 categorias de exceção corretamente', () => {
    const result = detectReconciliationExceptions({
      bookings: [
        {
          id: 'bk-no-pay',
          booking_date: '2026-11-11',
          booking_time: '10:00',
          patient_name: 'Ana Costa',
          status: 'completed',
          valor_consulta: 150,
          valor_repasse_profissional: 90,
          professional: { name: 'Dra. Paula' }
        }
      ],
      payments: [
        {
          id: 'pay-no-ledger',
          booking_id: 'bk-other',
          mp_payment_id: 'mp-999',
          status: 'approved',
          amount: 200,
          payer_name: 'Carlos'
        },
        {
          id: 'pay-refund',
          booking_id: 'bk-ref',
          status: 'refunded',
          amount: 150,
          refund_amount: 150,
          payer_name: 'Lucas'
        }
      ],
      ledgerEntries: [
        // transação desbalanceada (150 DEBIT vs 100 CREDIT)
        { id: 'l-u1', transaction_id: 'tx-unbal', entry_type: 'DEBIT', account_code: 'CASH_BANK', amount: 150 },
        { id: 'l-u2', transaction_id: 'tx-unbal', entry_type: 'CREDIT', account_code: 'REVENUE_SERVICE', amount: 100 },
        // reembolso que só tem CREDIT, sem DEBIT de estorno
        { id: 'l-r1', transaction_id: 'pay-refund', entry_type: 'CREDIT', account_code: 'REVENUE_SERVICE', amount: 60 },
        { id: 'l-r2', transaction_id: 'pay-refund', entry_type: 'DEBIT', account_code: 'CASH_BANK', amount: 60 }
      ],
      nfseEmissions: [],
      paymentBookings: []
    });

    const codes = result.exceptions.map((e) => e.code);
    expect(codes).toContain('PAID_BOOKING_WITHOUT_PAYMENT');
    expect(codes).toContain('MISSING_OR_FAILED_NFSE');
    expect(codes).toContain('COMPLETED_WITHOUT_PAYOUT');
    expect(codes).toContain('PAYMENT_WITHOUT_LEDGER');
    expect(codes).toContain('REFUND_WITHOUT_LEDGER_REVERSAL');
    expect(codes).toContain('UNBALANCED_LEDGER_TX');
    expect(result.summary.critical).toBe(3);
  });
});

