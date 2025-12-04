/**
 * Serviço de Integração com Zoom
 * Gerencia autenticação OAuth e criação de salas de reunião
 */

import { secureLog } from './secureLogger';
import { supabase } from '@/lib/customSupabaseClient';

class ZoomService {
  constructor() {
    this.clientId = import.meta.env.VITE_ZOOM_CLIENT_ID;
    this.clientSecret = import.meta.env.VITE_ZOOM_CLIENT_SECRET;
    this.accountId = import.meta.env.VITE_ZOOM_ACCOUNT_ID;
    this.apiBaseUrl = 'https://api.zoom.us/v2';
    this.tokenUrl = 'https://zoom.us/oauth/token';
    this.accessToken = null;
    this.tokenExpiry = null;

    secureLog.info('ZoomService inicializado', {
      hasClientId: !!this.clientId,
      hasClientSecret: !!this.clientSecret,
      hasAccountId: !!this.accountId
    });
  }

  async callSupabaseFunction(functionName, payload) {
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body: payload });
      if (error) {
        secureLog.error(`[${functionName}] Supabase function error`, error);
        throw new Error(error.message || 'Falha ao executar função');
      }
      secureLog.success(`[${functionName}] executada com sucesso`);
      return data;
    } catch (err) {
      secureLog.error(`[${functionName}] falhou`, err);
      throw err;
    }
  }

  /**
   * Cria uma reunião no Zoom
   * @param {Object} meetingData - Dados da reunião
   * @returns {Object} - Dados da reunião criada
   */
  async createEventMeeting(meetingData) {
    const payload = {
      topic: meetingData.topic,
      startTime: meetingData.startTime,
      duration: meetingData.duration || 60,
      timezone: meetingData.timezone || 'America/Sao_Paulo',
      agenda: meetingData.agenda || '',
      settings: meetingData.settings,
      eventoId: meetingData.eventoId
    };

    const data = await this.callSupabaseFunction('zoom-create-meeting', payload);
    return {
      id: data?.id,
      join_url: data?.join_url,
      start_url: data?.start_url,
      password: data?.password
    };
  }

  async createMeeting(meetingData) {
    return this.createEventMeeting(meetingData);
  }

  /**
   * Cria uma sala de reunião para um agendamento
   * @param {Object} booking - Dados do agendamento
   * @returns {Object} - Link e senha da reunião
   */
  async createBookingMeeting(booking) {
    try {
      secureLog.info('[createBookingMeeting] Iniciando criação de sala via Edge Function...', {
        patient_name: booking.patient_name,
        date: booking.booking_date,
        time: booking.booking_time
      });

      // Chamar Edge Function do Supabase ao invés de chamar diretamente a API do Zoom
      const payload = {
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        patient_name: booking.patient_name,
        service_name: booking.service_name || 'Consulta',
        professional_name: booking.professional_name || 'Profissional',
        professional_email: booking.professional_email || null,
        meeting_password: booking.meeting_password || null,
        duration: booking.duration || 60
      };

      const data = await this.callSupabaseFunction('create-zoom-meeting', payload);

      if (!data?.success) {
        secureLog.error('Edge Function retornou erro:', data?.error);
        return null;
      }

      secureLog.success('[createBookingMeeting] Reunião criada com sucesso!', {
        meeting_link: data.data?.meeting_link,
        has_password: !!data.data?.meeting_password
      });

      return {
        meeting_link: data.data?.meeting_link,
        meeting_password: data.data?.meeting_password,
        meeting_id: data.data?.meeting_id,
        start_url: data.data?.start_url
      };
    } catch (error) {
      secureLog.error('[createBookingMeeting] Erro ao criar reunião:', error);
      secureLog.debug('[createBookingMeeting] Stack trace:', error.stack);
      // Retornar null para não bloquear o fluxo
      return null;
    }
  }

  /**
   * Deleta uma reunião
   * @param {string} meetingId - ID da reunião
   */
  async deleteMeeting(meetingId) {
    try {
      const token = await this.getAccessToken();
      
      secureLog.info('Deletando reunião:', meetingId);

      const response = await fetch(`${this.apiBaseUrl}/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        secureLog.warn('Erro ao deletar reunião:', response.status, errorText);
        // Não lançar erro, apenas logar
        return false;
      }

      secureLog.success('Reunião deletada com sucesso');
      return true;
    } catch (error) {
      secureLog.error('Erro ao deletar reunião:', error);
      return false;
    }
  }

  /**
   * Atualiza uma reunião existente
   * @param {string} meetingId - ID da reunião
   * @param {Object} updateData - Dados a atualizar
   */
  async updateMeeting(meetingId, updateData) {
    try {
      const token = await this.getAccessToken();
      
      secureLog.info('Atualizando reunião:', meetingId);

      const response = await fetch(`${this.apiBaseUrl}/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        secureLog.warn('Erro ao atualizar reunião:', response.status, errorText);
        throw new Error(`Falha ao atualizar reunião: ${response.status}`);
      }

      secureLog.success('Reunião atualizada com sucesso');
      return true;
    } catch (error) {
      secureLog.error('Erro ao atualizar reunião:', error);
      throw error;
    }
  }
}

export const zoomService = new ZoomService();
export default zoomService;
