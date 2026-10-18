// Supabase Edge Function para envio de e-mails via SMTP Hostinger
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 1. Guardrail de Segurança: Validação Obrigatória de Autorização (Anti-Open-Relay)
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  const apiKeyHeader = req.headers.get("apikey");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  const rawToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : (apiKeyHeader || '');

  if (!rawToken) {
    console.warn('🔒 [send-email] Requisição rejeitada: token de autorização ausente.');
    return new Response(
      JSON.stringify({ error: "Unauthorized - Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const isServiceKey = serviceKey && rawToken === serviceKey;
  const isAnonKey = anonKey && rawToken === anonKey;

  // Se não for service key nem anon key, validar se é JWT válido de usuário autenticado
  if (!isServiceKey && !isAnonKey) {
    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(rawToken);
    if (userError || !user) {
      console.warn('🔒 [send-email] Requisição rejeitada: token inválido.');
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  try {
    let { to, subject, html, from, replyTo, cc, professional_id, user_id } = await req.json();

    // Fallback: Se "to" estiver ausente ou vazio, resolver via professional_id ou user_id
    if (!to && (professional_id || user_id)) {
      try {
        if (supabaseUrl && serviceKey) {
          const supabaseAdmin = createClient(supabaseUrl, serviceKey);
          let targetUserId = user_id;

          if (!targetUserId && professional_id) {
            const { data: prof } = await supabaseAdmin
              .from('professionals')
              .select('user_id')
              .eq('id', professional_id)
              .maybeSingle();
            targetUserId = prof?.user_id;
          }

          if (targetUserId) {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
            if (authUser?.user?.email) {
              to = authUser.user.email;
            }
          }
        }
      } catch (lookupErr) {
        console.warn('[send-email] Falha ao resolver destinatário por ID:', lookupErr);
      }
    }

    // Validar dados obrigatórios
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Dados obrigatórios ausentes: to, subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Anti-Injection: Sanitização de assunto (RFC 2822)
    const cleanSubject = String(subject).replace(/[\r\n]/g, ' ').slice(0, 100).trim();

    // Configurar SMTP com variáveis de ambiente do Supabase
    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    // Anti-Spoofing: O e-mail de envio é sempre estritamente o do domínio autorizado da clínica
    const fromEmail = Deno.env.get("FROM_EMAIL") || smtpUser || "doxologos@doxologos.com.br";
    const fromName = from?.name ? String(from.name).replace(/[\r\n]/g, '').slice(0, 50) : "Doxologos";

    if (!smtpUser || !smtpPassword) {
      return new Response(
        JSON.stringify({ error: "SMTP não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mascaramento PII para logs
    const maskEmail = (em: string) => {
      if (!em || typeof em !== 'string') return '***';
      const [userPart, domainPart] = em.split('@');
      return userPart ? `${userPart.substring(0, 2)}***@${domainPart || ''}` : '***@***';
    };

    const rawRecipients = Array.isArray(to) ? to : [to];
    const recipients = rawRecipients.map(r => String(r).trim()).filter(Boolean);

    if (recipients.length === 0 || recipients.length > 10) {
      return new Response(
        JSON.stringify({ error: "Número inválido de destinatários (máximo 10 por requisição)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📧 Enviando email para:", recipients.map(maskEmail), "| Assunto:", cleanSubject);

    // Criar cliente SMTP
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPassword,
        },
      },
    });

    // Preparar estrutura do email
    const emailContent: any = {
      from: `${fromName} <${fromEmail}>`,
      to: recipients.join(", "),
      subject: cleanSubject,
      html,
    };

    // Adicionar CC se fornecido
    if (cc) {
      const ccRecipients = (Array.isArray(cc) ? cc : [cc]).map(c => String(c).trim()).filter(Boolean);
      emailContent.cc = ccRecipients.join(", ");
      console.log(" Com cópia para:", ccRecipients.map(maskEmail));
    }

    // Adicionar ReplyTo se fornecido
    if (replyTo) {
      emailContent.replyTo = replyTo;
    }

    // Enviar email
    await client.send(emailContent);
    await client.close();

    console.log(" Email enviado com sucesso");

    return new Response(
      JSON.stringify({ success: true, messageId: String(Date.now()) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(" Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({ 
        error: "Falha ao enviar email", 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
