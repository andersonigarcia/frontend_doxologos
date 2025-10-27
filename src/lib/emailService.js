// Email Service - Hostinger SMTP via Supabase Edge Function

class EmailService {
  constructor() {
    this.apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
    this.apiKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    this.fromEmail = import.meta.env.VITE_FROM_EMAIL || 'doxologos@doxologos.com.br';
    this.fromName = import.meta.env.VITE_FROM_NAME || 'Doxologos Psicologia';
    this.enabled = import.meta.env.VITE_ENABLE_EMAIL_NOTIFICATIONS !== 'false';
    this.isDev = import.meta.env.VITE_ENVIRONMENT === 'development';
    
    // Debug logs
    console.log('🔧 EmailService Config:', {
      apiUrl: this.apiUrl,
      hasApiKey: !!this.apiKey,
      fromEmail: this.fromEmail,
      enabled: this.enabled,
      isDev: this.isDev,
      environment: import.meta.env.VITE_ENVIRONMENT
    });
  }

  async sendEmail({ to, subject, html, replyTo = null, type = 'notification' }) {
    if (!this.enabled) {
      console.log('⚠️ Emails desabilitados');
      return { success: true, messageId: 'disabled', disabled: true };
    }
    
    try {
      console.log('📧 Enviando email via Supabase Edge Function:', { to, subject, type });
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          from: { email: this.fromEmail, name: this.fromName },
          to, subject, html,
          replyTo: replyTo || this.fromEmail
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP ao enviar email:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Email enviado com sucesso:', result);
      
      if (window.gtag) {
        window.gtag('event', 'email_sent', { email_type: type });
      }
      
      return result;
    } catch (error) {
      if (window.gtag) {
        window.gtag('event', 'email_failed', { email_type: type });
      }
      console.error('❌ Erro ao enviar email:', error);
      throw error;
    }
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async checkStatus() {
    if (!this.enabled) return { status: 'disabled' };
    if (this.isDev) return { status: 'development' };
    
    try {
      const response = await fetch(this.apiUrl, {
        method: 'OPTIONS',
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return { status: response.ok ? 'active' : 'error' };
    } catch {
      return { status: 'error' };
    }
  }
}

const emailService = new EmailService();
export default emailService;

export const sendEmail = (data) => emailService.sendEmail(data);
export const validateEmail = (email) => emailService.isValidEmail(email);
export const checkEmailService = () => emailService.checkStatus();
