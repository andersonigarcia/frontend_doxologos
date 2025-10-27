/**
 * Helper para Envio de E-mails de Agendamento
 * Simplifica o uso dos templates e do serviço de e-mail
 */

import emailService from './emailService.js';
import emailTemplates from './emailTemplates.js';
import { logger } from './logger.js';

/**
 * Classe para gerenciar envio de e-mails relacionados a agendamentos
 */
class BookingEmailManager {
  constructor() {
    this.emailService = emailService;
    this.templates = emailTemplates;
  }

  /**
   * Envia e-mail de confirmação de agendamento
   */
  async sendConfirmation(bookingData) {
    try {
      const { patient_email, patient_name, service, professional, booking_date, booking_time, id } = bookingData;

      const html = this.templates.bookingConfirmation({
        patientName: patient_name,
        serviceName: service?.name || 'Serviço',
        professionalName: professional?.name || 'Profissional',
        bookingDate: this.formatDate(booking_date),
        bookingTime: booking_time,
        bookingId: id
      });

      const result = await this.emailService.sendEmail({
        to: patient_email,
        subject: 'Agendamento Confirmado - Doxologos',
        html
      });

      if (result.success) {
        logger.success('E-mail de confirmação enviado', { to: patient_email, bookingId: id });
      } else {
        logger.error('Erro ao enviar e-mail de confirmação', result.error, { bookingId: id });
      }

      return result;
    } catch (error) {
      logger.error('Erro ao processar envio de confirmação', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envia e-mail de aprovação (após pagamento)
   */
  async sendApproval(bookingData, meetingLink = null) {
    try {
      const { patient_email, patient_name, service, professional, booking_date, booking_time } = bookingData;

      const html = this.templates.bookingApproved({
        patientName: patient_name,
        serviceName: service?.name || 'Serviço',
        professionalName: professional?.name || 'Profissional',
        bookingDate: this.formatDate(booking_date),
        bookingTime: booking_time,
        meetingLink
      });

      const result = await this.emailService.sendEmail({
        to: patient_email,
        subject: '🎉 Pagamento Confirmado - Doxologos',
        html
      });

      if (result.success) {
        logger.success('E-mail de aprovação enviado', { to: patient_email });
      }

      return result;
    } catch (error) {
      logger.error('Erro ao enviar e-mail de aprovação', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envia e-mail de reagendamento
   */
  async sendReschedule(bookingData, oldBookingData, reason = null) {
    try {
      const { patient_email, patient_name, service, professional, booking_date, booking_time } = bookingData;

      const html = this.templates.bookingRescheduled({
        patientName: patient_name,
        serviceName: service?.name || 'Serviço',
        professionalName: professional?.name || 'Profissional',
        oldDate: this.formatDate(oldBookingData.booking_date),
        oldTime: oldBookingData.booking_time,
        newDate: this.formatDate(booking_date),
        newTime: booking_time,
        reason
      });

      const result = await this.emailService.sendEmail({
        to: patient_email,
        subject: 'Agendamento Reagendado - Doxologos',
        html
      });

      if (result.success) {
        logger.success('E-mail de reagendamento enviado', { to: patient_email });
      }

      return result;
    } catch (error) {
      logger.error('Erro ao enviar e-mail de reagendamento', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envia e-mail de cancelamento
   */
  async sendCancellation(bookingData, reason = null, cancellationBy = null) {
    try {
      const { patient_email, patient_name, service, booking_date, booking_time } = bookingData;

      const html = this.templates.bookingCancelled({
        patientName: patient_name,
        serviceName: service?.name || 'Serviço',
        bookingDate: this.formatDate(booking_date),
        bookingTime: booking_time,
        reason,
        cancellationBy
      });

      const result = await this.emailService.sendEmail({
        to: patient_email,
        subject: 'Agendamento Cancelado - Doxologos',
        html
      });

      if (result.success) {
        logger.success('E-mail de cancelamento enviado', { to: patient_email });
      }

      return result;
    } catch (error) {
      logger.error('Erro ao enviar e-mail de cancelamento', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envia lembrete de agendamento (24h antes)
   */
  async sendReminder(bookingData, meetingLink = null) {
    try {
      const { patient_email, patient_name, service, professional, booking_date, booking_time } = bookingData;

      const html = this.templates.bookingReminder({
        patientName: patient_name,
        serviceName: service?.name || 'Serviço',
        professionalName: professional?.name || 'Profissional',
        bookingDate: this.formatDate(booking_date),
        bookingTime: booking_time,
        meetingLink
      });

      const result = await this.emailService.sendEmail({
        to: patient_email,
        subject: '⏰ Lembrete: Sua Consulta é Amanhã - Doxologos',
        html
      });

      if (result.success) {
        logger.success('E-mail de lembrete enviado', { to: patient_email });
      }

      return result;
    } catch (error) {
      logger.error('Erro ao enviar e-mail de lembrete', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envia e-mail de agradecimento
   */
  async sendThankYou(bookingData) {
    try {
      const { patient_email, patient_name, service, professional, booking_date } = bookingData;

      const html = this.templates.bookingThankYou({
        patientName: patient_name,
        serviceName: service?.name || 'Serviço',
        professionalName: professional?.name || 'Profissional',
        bookingDate: this.formatDate(booking_date)
      });

      const result = await this.emailService.sendEmail({
        to: patient_email,
        subject: '🙏 Obrigado por Confiar em Nós - Doxologos',
        html
      });

      if (result.success) {
        logger.success('E-mail de agradecimento enviado', { to: patient_email });
      }

      return result;
    } catch (error) {
      logger.error('Erro ao enviar e-mail de agradecimento', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Formata data para exibição em português
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  // Alias para compatibilidade
  async sendBookingConfirmation(bookingData) {
    return this.sendConfirmation(bookingData);
  }
}

// Exportar instância singleton
export const bookingEmailManager = new BookingEmailManager();

// Exportar classe para testes
export { BookingEmailManager };
export default BookingEmailManager;
