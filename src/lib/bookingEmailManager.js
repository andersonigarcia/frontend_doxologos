/**
 * Helper para Envio de E-mails de Agendamento
 * Gerencia todos os emails do fluxo de agendamento
 */

import emailService from './emailService.js';
import emailTemplates from './emailTemplates.js';
import { logger } from './logger.js';

class BookingEmailManager {
  constructor() {
    this.emailService = emailService;
    this.templates = emailTemplates;
  }

  /**
   * 1. Email de Confirmação de Agendamento
   * Enviado imediatamente após o registro
   */
  async sendConfirmation(bookingData, sendCopy = true) {
    try {
      const html = this.templates.bookingConfirmation({
        patient_name: bookingData.patient_name,
        service_name: bookingData.service_name || bookingData.service?.name,
        professional_name: bookingData.professional_name || bookingData.professional?.name,
        appointment_date: bookingData.appointment_date || bookingData.booking_date,
        appointment_time: bookingData.appointment_time || bookingData.booking_time,
      });

      const emailConfig = {
        to: bookingData.patient_email,
        subject: '✅ Agendamento Confirmado - Doxologos',
        html,
        type: 'booking_confirmation'
      };
      
      // Adiciona cópia para Doxologos se solicitado
      if (sendCopy) {
        emailConfig.cc = 'doxologos@doxologos.com.br';
      }

      const result = await this.emailService.sendEmail(emailConfig);

      if (result.success) {
        logger.success('📧 Email de confirmação enviado', { to: bookingData.patient_email });
      }
      return result;
    } catch (error) {
      logger.error('❌ Erro ao enviar confirmação', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 2. Email de Pagamento Aprovado
   * Enviado após confirmação do pagamento
   */
  async sendPaymentApproved(bookingData, sendCopy = true) {
    try {
      const html = this.templates.paymentApproved({
        patient_name: bookingData.patient_name,
        service_name: bookingData.service_name || bookingData.service?.name,
        professional_name: bookingData.professional_name || bookingData.professional?.name,
        appointment_date: bookingData.appointment_date || bookingData.booking_date,
        appointment_time: bookingData.appointment_time || bookingData.booking_time,
        meeting_link: bookingData.meeting_link
      });

      const emailConfig = {
        to: bookingData.patient_email,
        subject: '💳 Pagamento Aprovado - Consulta Confirmada - Doxologos',
        html,
        type: 'payment_approved'
      };
      
      if (sendCopy) {
        emailConfig.cc = 'doxologos@doxologos.com.br';
      }

      const result = await this.emailService.sendEmail(emailConfig);

      if (result.success) {
        logger.success('📧 Email de pagamento aprovado enviado', { to: bookingData.patient_email });
      }
      return result;
    } catch (error) {
      logger.error('❌ Erro ao enviar pagamento aprovado', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 3. Email de Reagendamento
   * Enviado quando a data/hora é alterada
   */
  async sendRescheduled(bookingData, oldDate, oldTime, reason = null, sendCopy = true) {
    try {
      const html = this.templates.bookingRescheduled(
        {
          patient_name: bookingData.patient_name,
          professional_name: bookingData.professional_name || bookingData.professional?.name,
          appointment_date: bookingData.appointment_date || bookingData.booking_date,
          appointment_time: bookingData.appointment_time || bookingData.booking_time,
        },
        oldDate,
        oldTime,
        reason
      );

      const emailConfig = {
        to: bookingData.patient_email,
        subject: '📅 Agendamento Reagendado - Doxologos',
        html,
        type: 'booking_rescheduled'
      };
      
      if (sendCopy) {
        emailConfig.cc = 'doxologos@doxologos.com.br';
      }

      const result = await this.emailService.sendEmail(emailConfig);

      if (result.success) {
        logger.success('📧 Email de reagendamento enviado', { to: bookingData.patient_email });
      }
      return result;
    } catch (error) {
      logger.error('❌ Erro ao enviar reagendamento', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 4. Email de Cancelamento
   * Enviado quando o agendamento é cancelado
   */
  async sendCancellation(bookingData, reason = null, refundInfo = null, sendCopy = true) {
    try {
      const html = this.templates.bookingCancellation(
        {
          patient_name: bookingData.patient_name,
          service_name: bookingData.service_name || bookingData.service?.name,
          appointment_date: bookingData.appointment_date || bookingData.booking_date,
          appointment_time: bookingData.appointment_time || bookingData.booking_time,
        },
        reason,
        refundInfo
      );

      const emailConfig = {
        to: bookingData.patient_email,
        subject: '❌ Agendamento Cancelado - Doxologos',
        html,
        type: 'booking_cancelled'
      };
      
      if (sendCopy) {
        emailConfig.cc = 'doxologos@doxologos.com.br';
      }

      const result = await this.emailService.sendEmail(emailConfig);

      if (result.success) {
        logger.success('📧 Email de cancelamento enviado', { to: bookingData.patient_email });
      }
      return result;
    } catch (error) {
      logger.error('❌ Erro ao enviar cancelamento', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 5. Email de Lembrete (24h antes)
   * Enviado automaticamente 1 dia antes da consulta
   */
  async sendReminder(bookingData, sendCopy = false) {
    try {
      const html = this.templates.bookingReminder({
        patient_name: bookingData.patient_name,
        professional_name: bookingData.professional_name || bookingData.professional?.name,
        appointment_date: bookingData.appointment_date || bookingData.booking_date,
        appointment_time: bookingData.appointment_time || bookingData.booking_time,
        meeting_link: bookingData.meeting_link
      });

      const emailConfig = {
        to: bookingData.patient_email,
        subject: '⏰ Lembrete: Sua Consulta é Amanhã! - Doxologos',
        html,
        type: 'booking_reminder'
      };
      
      if (sendCopy) {
        emailConfig.cc = 'doxologos@doxologos.com.br';
      }

      const result = await this.emailService.sendEmail(emailConfig);

      if (result.success) {
        logger.success('📧 Email de lembrete enviado', { to: bookingData.patient_email });
      }
      return result;
    } catch (error) {
      logger.error('❌ Erro ao enviar lembrete', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 6. Email de Agradecimento
   * Enviado após a conclusão da consulta
   */
  async sendThankYou(bookingData, sendCopy = false) {
    try {
      const html = this.templates.bookingThankYou({
        patient_name: bookingData.patient_name,
        professional_name: bookingData.professional_name || bookingData.professional?.name,
      });

      const emailConfig = {
        to: bookingData.patient_email,
        subject: '🙏 Obrigado pela sua Consulta - Doxologos',
        html,
        type: 'booking_thankyou'
      };
      
      if (sendCopy) {
        emailConfig.cc = 'doxologos@doxologos.com.br';
      }

      const result = await this.emailService.sendEmail(emailConfig);

      if (result.success) {
        logger.success('📧 Email de agradecimento enviado', { to: bookingData.patient_email });
      }
      return result;
    } catch (error) {
      logger.error('❌ Erro ao enviar agradecimento', error);
      return { success: false, error: error.message };
    }
  }

  // Alias para compatibilidade
  async sendBookingConfirmation(bookingData, sendCopy = true) {
    return this.sendConfirmation(bookingData, sendCopy);
  }
}

// Exportar instância singleton
export const bookingEmailManager = new BookingEmailManager();

// Exportar classe para testes
export { BookingEmailManager };

export default new BookingEmailManager();
