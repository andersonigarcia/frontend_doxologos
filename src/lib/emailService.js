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

  async sendEmail({ to, subject, html, replyTo = null, cc = null, type = 'notification' }) {
    if (!this.enabled) {
      console.log('⚠️ Emails desabilitados');
      return { success: true, messageId: 'disabled', disabled: true };
    }
    
    try {
      console.log('📧 Enviando email via Supabase Edge Function:', { to, cc, subject, type });
      
      const emailPayload = {
        from: { email: this.fromEmail, name: this.fromName },
        to, subject, html,
        replyTo: replyTo || this.fromEmail
      };
      
      // Adiciona CC se fornecido
      if (cc) {
        emailPayload.cc = cc;
      }
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(emailPayload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro HTTP ao enviar email:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Email enviado com sucesso:', result);
      
      // Enviar evento para Google Analytics (se disponível)
      try {
        if (window.gtag) {
          window.gtag('event', 'email_sent', { email_type: type });
        }
      } catch (gtagError) {
        console.warn('⚠️ Erro ao enviar evento para GA:', gtagError);
      }
      
      return result;
    } catch (error) {
      // Enviar evento de erro para Google Analytics (se disponível)
      try {
        if (window.gtag) {
          window.gtag('event', 'email_failed', { email_type: type });
        }
      } catch (gtagError) {
        console.warn('⚠️ Erro ao enviar evento para GA:', gtagError);
      }
      
      console.error('❌ Erro ao enviar email:', error);
      throw error;
    }
  }
}

const emailService = new EmailService();
export default emailService;
