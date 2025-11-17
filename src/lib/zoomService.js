/**
 * Serviço de Integração com Zoom
 * Gerencia autenticação OAuth e criação de salas de reunião
 */

import { secureLog } from './secureLogger';

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

  /**
   * Obtém token de acesso usando Server-to-Server OAuth
   */
  async getAccessToken() {
    // Verificar se já temos um token válido
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      secureLog.info('Usando token em cache');
      return this.accessToken;
    }

    if (!this.clientId || !this.clientSecret || !this.accountId) {
      const errorMsg = `Credenciais do Zoom incompletas: ClientID=${!!this.clientId}, ClientSecret=${!!this.clientSecret}, AccountID=${!!this.accountId}`;
      secureLog.error(errorMsg);
      throw new Error('Credenciais do Zoom não configuradas. Verifique VITE_ZOOM_CLIENT_ID, VITE_ZOOM_CLIENT_SECRET e VITE_ZOOM_ACCOUNT_ID');
    }

    try {
      secureLog.info('Obtendo novo token de acesso do Zoom...');
      secureLog.sensitive('Account ID:', this.accountId);

      // Criar Basic Auth header
      const credentials = btoa(`${this.clientId}:${this.clientSecret}`);
      const tokenUrl = `${this.tokenUrl}?grant_type=account_credentials&account_id=${this.accountId}`;
      
      secureLog.debug('Fazendo request para:', tokenUrl);
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      secureLog.debug('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        secureLog.error('Erro ao obter token:', response.status, errorText);
        throw new Error(`Falha na autenticação Zoom: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      // Token expira em 1 hora, vamos renovar 5 minutos antes
      this.tokenExpiry = Date.now() + ((data.expires_in - 300) * 1000);
      
      secureLog.success('Token obtido com sucesso (expira em', data.expires_in, 'segundos)');
      return this.accessToken;
    } catch (error) {
      secureLog.error('Erro ao obter token do Zoom:', error);
      secureLog.debug('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Cria uma reunião no Zoom
   * @param {Object} meetingData - Dados da reunião
   * @returns {Object} - Dados da reunião criada
   */
  async createMeeting(meetingData) {
    try {
      const token = await this.getAccessToken();
      
      const {
        topic,
        startTime,
        duration = 60, // duração em minutos
        timezone = 'America/Sao_Paulo',
        password = null,
        agenda = ''
      } = meetingData;

      secureLog.info('Criando reunião no Zoom:', { topic, startTime, duration });

      const meetingConfig = {
        topic: topic || 'Consulta Doxologos',
        type: 2, // Reunião agendada
        start_time: startTime, // formato ISO 8601: 2025-10-26T15:00:00Z
        duration: duration,
        timezone: timezone,
        agenda: agenda || 'Consulta de Psicologia Online',
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false, // Paciente não pode entrar antes do host
          mute_upon_entry: false,
          waiting_room: true, // Sala de espera ativada
          audio: 'voip', // Áudio via computador
          auto_recording: 'none', // Sem gravação automática
          approval_type: 0, // Aprovação automática
          registration_type: 1,
          enforce_login: false,
          alternative_hosts: '',
          close_registration: false,
          show_share_button: true,
          allow_multiple_devices: true,
          encryption_type: 'enhanced_encryption',
          meeting_authentication: false
        }
      };

      // Adicionar senha se fornecida
      if (password) {
        meetingConfig.password = password;
      }

      // Usar 'me' como userId para o usuário autenticado
      const response = await fetch(`${this.apiBaseUrl}/users/me/meetings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingConfig)
      });

      if (!response.ok) {
        const errorText = await response.text();
        secureLog.error('Erro ao criar reunião:', response.status, errorText);
        throw new Error(`Falha ao criar reunião Zoom: ${response.status}`);
      }

      const meeting = await response.json();
      
      secureLog.success('Reunião criada com sucesso:', {
        id: meeting.id,
        join_url: meeting.join_url
      });

      return {
        id: meeting.id,
        join_url: meeting.join_url,
        start_url: meeting.start_url,
        password: meeting.password || password,
        meeting_id: meeting.id,
        host_email: meeting.host_email
      };
    } catch (error) {
      secureLog.error('Erro ao criar reunião no Zoom:', error);
      throw error;
    }
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        secureLog.error('Supabase não configurado');
        return null;
      }

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-zoom-meeting`;
      
      secureLog.debug('[createBookingMeeting] Chamando Edge Function:', edgeFunctionUrl);

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          booking_date: booking.booking_date,
          booking_time: booking.booking_time,
          patient_name: booking.patient_name,
          service_name: booking.service_name || 'Consulta',
          professional_name: booking.professional_name || 'Profissional',
          professional_email: booking.professional_email || null,
          meeting_password: booking.meeting_password || null,
          duration: booking.duration || 60
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        secureLog.error('Erro HTTP da Edge Function:', response.status, errorText);
        return null;
      }

      const result = await response.json();
      
      if (!result.success) {
        secureLog.error('Edge Function retornou erro:', result.error);
        return null;
      }

      secureLog.success('[createBookingMeeting] Reunião criada com sucesso!', {
        meeting_link: result.data.meeting_link,
        has_password: !!result.data.meeting_password
      });

      return {
        meeting_link: result.data.meeting_link,
        meeting_password: result.data.meeting_password,
        meeting_id: result.data.meeting_id,
        start_url: result.data.start_url
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
