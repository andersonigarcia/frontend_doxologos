// Email Service - Hostinger SMTP via Supabase Edge Function
// SECURITY: Usa apenas a anon key para autenticar chamadas HTTP à Edge Function.
// A Edge Function usa suas próprias env vars server-side para operar com privilégios.

class EmailService {
  constructor() {
    // Suporte Isomórfico: Node.js (Netlify Functions) vs Vite (Browser)
    const isNode = typeof process !== 'undefined' && process.env;

    this.apiUrl = `${isNode ? process.env.VITE_SUPABASE_URL : import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;
    this.apiKey = isNode ? process.env.VITE_SUPABASE_ANON_KEY : import.meta.env.VITE_SUPABASE_ANON_KEY;
    this.fromEmail = (isNode ? process.env.VITE_FROM_EMAIL : import.meta.env.VITE_FROM_EMAIL) || 'contato@doxologos.com.br';
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

  sanitizeSubject(subject) {
    if (!subject) return 'Notificacao Doxologos';
    // Remove emojis, quebras de linha e caracteres especiais de controle que corrompem cabeçalhos MIME no Hostinger SMTP
    return subject
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .replace(/[\r\n\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async sendEmail({ to, subject, html, replyTo = null, cc = null, attachments = null, type = 'notification' }) {
    if (!this.enabled) {
      console.log('⚠️ Emails desabilitados');
      return { success: true, messageId: 'disabled', disabled: true };
    }

    const cleanSubject = this.sanitizeSubject(subject);

    try {
      console.log('📧 Enviando email via Supabase Edge Function:', {
        to, cc, subject: cleanSubject, type,
        hasAttachments: !!attachments && attachments.length > 0
      });

      const emailPayload = {
        from: { email: this.fromEmail, name: this.fromName },
        to,
        subject: cleanSubject,
        html,
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
