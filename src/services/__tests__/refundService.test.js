import {
  sanitizeRefundReason,
  evaluatePatientCancellationEligibility,
  evaluatePackageRefund,
  checkPayoutIntegrityForRefund,
  recordRefundLedgerEntries,
  processEventRefundReversal,
  HOURS_CANCELLATION_LIMIT,
  PACKAGE_REFUND_PERCENTAGE,
  PACKAGE_PLATFORM_RETENTION,
  ALLOWED_PAYMENT_REFUND_FIELDS,
  ALLOWED_PAYMENT_LEDGER_FIELDS
} from '../refundService';
import { supabase } from '@/lib/customSupabaseClient';

jest.mock('@/lib/customSupabaseClient', () => {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    supabase: {
      from: jest.fn(() => queryBuilder),
      rpc: jest.fn().mockResolvedValue({ data: { success: true }, error: null }),
      functions: {
        invoke: jest.fn().mockResolvedValue({ data: { success: true }, error: null })
      }
    }
  };
});

describe('refundService — Canonical Domain Tests (Fase 4 - Unificação)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constantes e Whitelists', () => {
    it('deve conter as constantes fundamentais de negócio', () => {
      expect(HOURS_CANCELLATION_LIMIT).toBe(24);
      expect(PACKAGE_REFUND_PERCENTAGE).toBe(0.80);
      expect(PACKAGE_PLATFORM_RETENTION).toBe(0.20);
    });

    it('ALLOWED_PAYMENT_REFUND_FIELDS e ALLOWED_PAYMENT_LEDGER_FIELDS devem ser válidos', () => {
      expect(ALLOWED_PAYMENT_REFUND_FIELDS).toContain('payment_id');
      expect(ALLOWED_PAYMENT_REFUND_FIELDS).toContain('proof_bucket');
      expect(ALLOWED_PAYMENT_REFUND_FIELDS).toContain('proof_checksum');
      expect(ALLOWED_PAYMENT_LEDGER_FIELDS).toContain('account_code');
      expect(ALLOWED_PAYMENT_LEDGER_FIELDS).toContain('entry_type');
    });
  });

  describe('Sanitização Zero-PII e Sigilo Clínico (CFP Art. 9º / LGPD Art. 11)', () => {
    it('deve retornar o fallback padrão se o motivo for nulo ou vazio', () => {
      expect(sanitizeRefundReason(null)).toBe('Solicitação administrativa de cancelamento/reembolso');
      expect(sanitizeRefundReason('')).toBe('Solicitação administrativa de cancelamento/reembolso');
      expect(sanitizeRefundReason('   ')).toBe('Solicitação administrativa de cancelamento/reembolso');
    });

    it('deve preservar motivos administrativos legítimos sem termos clínicos', () => {
      const safeReason = 'Paciente solicitou cancelamento por incompatibilidade de agenda';
      expect(sanitizeRefundReason(safeReason)).toBe(safeReason);
    });

    it('deve interceptar e substituir termos clínicos/psiquiátricos por texto neutro', () => {
      expect(sanitizeRefundReason('Paciente teve crise de ansiedade')).toBe('Solicitação administrativa de cancelamento/reembolso');
      expect(sanitizeRefundReason('Cancelado devido a surto bipolar e CID F31')).toBe('Solicitação administrativa de cancelamento/reembolso');
      expect(sanitizeRefundReason('Alteração de medicação e consulta clínica')).toBe('Solicitação administrativa de cancelamento/reembolso');
    });

    it('deve remover tags HTML e scripts maliciosos (Cenário 9.2 QA)', () => {
      const maliciousInput = '<script>alert(1)</script> Solicitação do paciente por motivo de viagem';
      expect(sanitizeRefundReason(maliciousInput)).toBe('Solicitação do paciente por motivo de viagem');
      expect(sanitizeRefundReason('<img src=x onerror=alert(1)>Reembolso integral')).toBe('Reembolso integral');
    });
  });

  describe('Módulo 2: Cancelamento e Crédito de Consultas (> 24h vs < 24h)', () => {
    it('deve classificar como elegível para crédito quando antecedência for > 24h', () => {
      const now = new Date('2026-10-21T10:00:00Z');
      const bookingDate = '2026-10-23';
      const bookingTime = '14:00';

      const result = evaluatePatientCancellationEligibility(bookingDate, bookingTime, now);
      expect(result.isEligibleForCredit).toBe(true);
      expect(result.hoursUntilSession).toBeGreaterThan(24);
      expect(result.message).toContain('creditado em sua carteira');
    });

    it('deve classificar como não-elegível para crédito quando antecedência for < 24h', () => {
      const now = new Date('2026-10-21T10:00:00Z');
      const bookingDate = '2026-10-21';
      const bookingTime = '18:00';

      const result = evaluatePatientCancellationEligibility(bookingDate, bookingTime, now);
      expect(result.isEligibleForCredit).toBe(false);
      expect(result.hoursUntilSession).toBeLessThan(24);
      expect(result.message).toContain('impossibilitando a geração de créditos ou reembolso');
    });
  });

  describe('Módulo 3: Pacotes Multi-Sessão & Eventos', () => {
    it('deve calcular corretamente 80% de reembolso e 20% de taxa de retenção para pacotes', () => {
      const now = new Date('2026-10-21T10:00:00Z');
      const bookings = [
        { booking_date: '2026-10-20', booking_time: '14:00', status: 'completed' }, // já realizada
        { booking_date: '2026-10-21', booking_time: '15:00', status: 'confirmed' }, // < 24h
        { booking_date: '2026-10-25', booking_time: '10:00', status: 'confirmed' }, // > 24h elegível
        { booking_date: '2026-10-28', booking_time: '11:00', status: 'confirmed' }, // > 24h elegível
      ];

      const summary = evaluatePackageRefund(bookings, 150, now);
      expect(summary.totalSessions).toBe(4);
      expect(summary.completedCount).toBe(1);
      expect(summary.nonRefundableCount).toBe(1);
      expect(summary.eligibleCount).toBe(2);
      expect(summary.grossEligibleAmount).toBe(300); // 2 * 150
      expect(summary.patientRefundAmount).toBe(240); // 300 * 0.8
      expect(summary.platformFeeAmount).toBe(60);   // 300 * 0.2
    });

    it('deve processar reversão de evento com sucesso', async () => {
      const result = await processEventRefundReversal({
        inscricaoId: 'insc-123',
        adminId: 'admin-456',
        actionType: 'approve',
        reason: 'Cancelamento formal aprovado'
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('approved');
    });
  });

  describe('Módulo 1: Integridade de Repasses e Escrituração no Ledger', () => {
    it('deve alertar se a consulta a ser reembolsada já teve repasse pago ao profissional', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: {
            booking_id: 'booking-777',
            payment: {
              id: 'payout-888',
              status: 'paid',
              total_amount: 150.00
            }
          },
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const integrity = await checkPayoutIntegrityForRefund({ bookingId: 'booking-777' });
      expect(integrity.hasPaidPayout).toBe(true);
      expect(integrity.warningMessage).toContain('já foram pagos ao profissional');
    });

    it('não deve emitir alerta se não houver repasse concluído', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const integrity = await checkPayoutIntegrityForRefund({ bookingId: 'booking-999' });
      expect(integrity.hasPaidPayout).toBe(false);
      expect(integrity.warningMessage).toBeNull();
    });

    it('deve registrar partidas dobradas balanceadas no ledger contábil', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [{ id: 'ledger-1' }, { id: 'ledger-2' }], error: null })
      });
      supabase.from.mockReturnValue({ insert: mockInsert });

      const entries = await recordRefundLedgerEntries({
        paymentId: 'pay-123',
        amount: 150,
        description: 'Estorno de consulta',
        adminId: 'admin-1'
      });

      expect(entries).toHaveLength(2);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            transaction_id: 'pay-123',
            entry_type: 'DEBIT',
            account_code: 'REFUNDS_EXPENSE',
            amount: 150
          }),
          expect.objectContaining({
            transaction_id: 'pay-123',
            entry_type: 'CREDIT',
            account_code: 'CASH_BANK',
            amount: 150
          })
        ])
      );
    });
  });
});
