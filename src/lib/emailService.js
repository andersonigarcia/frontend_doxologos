// Email Service - Hostinger SMTP via Supabase Edge Function
// SECURITY: Usa apenas a anon key para autenticar chamadas HTTP à Edge Function.
// A Edge Function usa suas próprias env vars server-side para operar com privilégios.

class EmailService {
  constructor() {
    // Suporte Isomórfico: Node.js (Netlify Functions) vs Vite (Browser)
    const isNode = typeof process !== 'undefined' && process.env;

    this.apiUrl = `${isNode ? process.env.VITE_SUPABASE_URL : import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
    this.apiKey = isNode ? process.env.VITE_SUPABASE_ANON_KEY : import.meta.env.VITE_SUPABASE_ANON_KEY;
    this.fromEmail = (isNode ? process.env.VITE_FROM_EMAIL : import.meta.env.VITE_FROM_EMAIL) || 'doxologos@doxologos.com.br';
    this.fromName = (isNode ? process.env.VITE_FROM_NAME : import.meta.env.VITE_FROM_NAME) || 'Doxologos Psicologia';
    this.enabled = (isNode ? process.env.VITE_ENABLE_EMAIL_NOTIFICATIONS : import.meta.env.VITE_ENABLE_EMAIL_NOTIFICATIONS) !== 'false';
    this.isDev = (isNode ? process.env.VITE_ENVIRONMENT : import.meta.env.VITE_ENVIRONMENT) === 'development';

    const isDevEnv = isNode ? (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) : import.meta.env.DEV;
    if (isDevEnv) {
      console.log('🔧 EmailService Config:', {
        apiUrl: this.apiUrl,
        fromEmail: this.fromEmail,
        enabled: this.enabled,
      });
    }
  }

  async sendEmail({ to, subject, html, replyTo = null, cc = null, attachments = null, type = 'notification' }) {
    if (!this.enabled) {
      console.log('⚠️ Emails desabilitados');
      return { success: true, messageId: 'disabled', disabled: true };
    }

    try {
      console.log('📧 Enviando email via Supabase Edge Function:', {
        to, cc, subject, type,
        hasAttachments: !!attachments && attachments.length > 0
      });

      const emailPayload = {
        from: { email: this.fromEmail, name: this.fromName },
        to, subject, html,
        replyTo: replyTo || this.fromEmail
      };

      // Adiciona CC se fornecido
      if (cc) {
        emailPayload.cc = cc;
      }

      // Adiciona anexos se fornecidos
      if (attachments && attachments.length > 0) {
        emailPayload.attachments = attachments;
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
