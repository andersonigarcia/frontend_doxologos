import {
  buildDoubleEntryPair,
  buildReversalEntries,
  computeLedgerRevenueSummary
} from '@/services/ledgerService';

describe('ledgerService — Imutabilidade, Partidas Dobradas e Apuração Líquida (P0)', () => {
  describe('buildDoubleEntryPair', () => {
    it('gera par balanceado DEBIT + CREDIT com o mesmo transaction_id', () => {
      const entries = buildDoubleEntryPair({
        debitAccount: 'CASH_BANK',
        creditAccount: 'REVENUE_SERVICE',
        amount: 150.5,
        description: 'Ajuste conciliação',
        userId: 'admin-1',
        transactionId: 'tx-123'
      });

      expect(entries).toHaveLength(2);
      expect(entries[0]).toMatchObject({
        transaction_id: 'tx-123',
        entry_type: 'DEBIT',
        account_code: 'CASH_BANK',
        amount: 150.5
      });
      expect(entries[1]).toMatchObject({
        transaction_id: 'tx-123',
        entry_type: 'CREDIT',
        account_code: 'REVENUE_SERVICE',
        amount: 150.5
      });
      expect(entries[0].description).toContain('(Manual)');
    });

    it('rejeita valor <= 0 ou contas idênticas', () => {
      expect(() =>
        buildDoubleEntryPair({
          debitAccount: 'CASH_BANK',
          creditAccount: 'REVENUE_SERVICE',
          amount: 0,
          description: 'Inválido'
        })
      ).toThrow();

      expect(() =>
        buildDoubleEntryPair({
          debitAccount: 'CASH_BANK',
          creditAccount: 'CASH_BANK',
          amount: 100,
          description: 'Mesma conta'
        })
      ).toThrow();
    });
  });

  describe('buildReversalEntries', () => {
    it('inverte DEBIT <-> CREDIT preservando valores e rastreabilidade', () => {
      const original = [
        { id: 'e1', transaction_id: 'tx-orig', entry_type: 'DEBIT', account_code: 'CASH_BANK', amount: 100, description: 'Entrada (Manual)' },
        { id: 'e2', transaction_id: 'tx-orig', entry_type: 'CREDIT', account_code: 'REVENUE_SERVICE', amount: 100, description: 'Entrada (Manual)' }
      ];

      const reversal = buildReversalEntries(original, {
        reason: 'Lançamento duplicado',
        userId: 'admin-1',
        reversalTransactionId: 'tx-rev'
      });

      expect(reversal).toHaveLength(2);
      expect(reversal[0].entry_type).toBe('CREDIT');
      expect(reversal[0].account_code).toBe('CASH_BANK');
      expect(reversal[0].amount).toBe(100);
      expect(reversal[0].metadata.reversal_of).toBe('tx-orig');

      expect(reversal[1].entry_type).toBe('DEBIT');
      expect(reversal[1].account_code).toBe('REVENUE_SERVICE');
      expect(reversal[1].amount).toBe(100);
    });
  });

  describe('computeLedgerRevenueSummary', () => {
    it('desconta DEBITs de estorno da receita e dos repasses (regressão: antes só somava CREDIT)', () => {
      const summary = computeLedgerRevenueSummary([
        // Consulta 1 paga: R$ 150 (R$ 60 plataforma + R$ 90 profissional)
        { transaction_id: 'tx-1', entry_type: 'CREDIT', account_code: 'REVENUE_SERVICE', amount: 60 },
        { transaction_id: 'tx-1', entry_type: 'CREDIT', account_code: 'LIABILITY_PROFESSIONAL', amount: 90 },
        // Consulta 2 paga: R$ 150
        { transaction_id: 'tx-2', entry_type: 'CREDIT', account_code: 'REVENUE_SERVICE', amount: 60 },
        { transaction_id: 'tx-2', entry_type: 'CREDIT', account_code: 'LIABILITY_PROFESSIONAL', amount: 90 },
        // Estorno integral da Consulta 2
        { transaction_id: 'tx-2-rev', entry_type: 'DEBIT', account_code: 'REVENUE_SERVICE', amount: 60 },
        { transaction_id: 'tx-2-rev', entry_type: 'DEBIT', account_code: 'LIABILITY_PROFESSIONAL', amount: 90 }
      ]);

      expect(summary.platformMargin).toBe(60);
      expect(summary.totalPayouts).toBe(90);
      expect(summary.totalRevenue).toBe(150);
      expect(summary.marginPercentage).toBeCloseTo(40, 2);
    });
  });
});

