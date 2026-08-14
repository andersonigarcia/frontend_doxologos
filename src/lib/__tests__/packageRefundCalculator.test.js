import { isBookingEligibleForRefund, calculatePackageRefundSummary } from '../packageRefundCalculator';

describe('packageRefundCalculator', () => {
  const referenceTime = new Date('2026-08-13T12:00:00Z');

  describe('isBookingEligibleForRefund', () => {
    test('deve retornar true para sessão agendada para daqui a mais de 24h', () => {
      // 2 dias no futuro
      const isEligible = isBookingEligibleForRefund('2026-08-15', '15:00', referenceTime);
      expect(isEligible).toBe(true);
    });

    test('deve retornar false para sessão agendada para daqui a menos de 24h', () => {
      // Mesma data ou menos de 24h
      const isEligible = isBookingEligibleForRefund('2026-08-13', '18:00', referenceTime);
      expect(isEligible).toBe(false);
    });
  });

  describe('calculatePackageRefundSummary', () => {
    test('deve calcular corretamente reembolso de 80% e retenção de 20%', () => {
      const bookings = [
        { id: '1', booking_date: '2026-08-10', booking_time: '14:00', status: 'completed' }, // Já feita
        { id: '2', booking_date: '2026-08-13', booking_time: '16:00', status: 'confirmed' }, // < 24h
        { id: '3', booking_date: '2026-08-20', booking_time: '14:00', status: 'confirmed' }, // > 24h (elegível)
        { id: '4', booking_date: '2026-08-27', booking_time: '14:00', status: 'confirmed' }, // > 24h (elegível)
      ];

      const summary = calculatePackageRefundSummary(bookings, 150, referenceTime);

      expect(summary.totalSessions).toBe(4);
      expect(summary.completedCount).toBe(1);
      expect(summary.nonRefundableCount).toBe(1);
      expect(summary.eligibleCount).toBe(2);

      // 2 sessões elegíveis x 150 = 300 bruto
      expect(summary.grossEligibleAmount).toBe(300);
      // 80% de 300 = 240
      expect(summary.patientRefundAmount).toBe(240);
      // 20% de 300 = 60
      expect(summary.platformFeeAmount).toBe(60);
    });
  });
});
