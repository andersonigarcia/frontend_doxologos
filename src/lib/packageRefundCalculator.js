/**
 * Calculadora de Reembolso Parcial de Pacotes (Doxologos Psicologia)
 * Regra: 80% do valor restante para sessões futuras a mais de 24h do horário agendado.
 */

export const HOURS_REFUND_LIMIT = 24;
export const REFUND_PERCENTAGE = 0.80;
export const PLATFORM_RETENTION_PERCENTAGE = 0.20;

/**
 * Avalia se um agendamento é elegível para reembolso (> 24h)
 * @param {string} bookingDate - Data no formato YYYY-MM-DD
 * @param {string} bookingTime - Horário no formato HH:MM
 * @param {Date} [now] - Data/hora de referência para cálculo
 * @returns {boolean}
 */
export function isBookingEligibleForRefund(bookingDate, bookingTime = '00:00', now = new Date()) {
  if (!bookingDate) return false;
  
  const [year, month, day] = bookingDate.split('-').map(Number);
  const [hours, minutes] = bookingTime.split(':').map(Number);

  const sessionDateTime = new Date(year, month - 1, day, hours || 0, minutes || 0);
  const diffInMs = sessionDateTime.getTime() - now.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);

  return diffInHours >= HOURS_REFUND_LIMIT;
}

/**
 * Calcula o resumo de reembolso para um pacote de consultas
 * @param {Array} bookings - Lista de agendamentos do pacote
 * @param {number} sessionPrice - Valor individual de cada sessão (ex: 150.00)
 * @param {Date} [now] - Data/hora de referência
 */
export function calculatePackageRefundSummary(bookings = [], sessionPrice = 150, now = new Date()) {
  let completedCount = 0;
  let nonRefundableCount = 0; // < 24h
  let eligibleCount = 0; // > 24h

  const processedBookings = bookings.map((b) => {
    const isCompleted = b.status === 'completed' || b.status === 'missed_unexcused';
    const isCancelled = b.status === 'cancelled' || b.status === 'cancelled_refunded';
    
    if (isCompleted) {
      completedCount++;
      return { ...b, refundEligible: false, refundReason: 'Sessão concluída' };
    }

    if (isCancelled) {
      return { ...b, refundEligible: false, refundReason: 'Já cancelada' };
    }

    const isEligible = isBookingEligibleForRefund(b.booking_date, b.booking_time, now);

    if (isEligible) {
      eligibleCount++;
      return { ...b, refundEligible: true, refundReason: 'Elegível para 80%' };
    } else {
      nonRefundableCount++;
      return { ...b, refundEligible: false, refundReason: 'Menos de 24h da consulta' };
    }
  });

  const grossEligibleAmount = eligibleCount * sessionPrice;
  const patientRefundAmount = grossEligibleAmount * REFUND_PERCENTAGE;
  const platformFeeAmount = grossEligibleAmount * PLATFORM_RETENTION_PERCENTAGE;

  return {
    totalSessions: bookings.length,
    completedCount,
    nonRefundableCount,
    eligibleCount,
    grossEligibleAmount,
    patientRefundAmount,
    platformFeeAmount,
    bookings: processedBookings,
  };
}
