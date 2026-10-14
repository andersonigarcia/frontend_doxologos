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

  try {
    let { to, subject, html, from, replyTo, cc, professional_id, user_id } = await req.json();

    // Fallback: Se "to" estiver ausente ou vazio, resolver via professional_id ou user_id
    if (!to && (professional_id || user_id)) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supabaseUrl && supabaseServiceKey) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
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
              console.log(`[send-email] Destinatário resolvido via Auth para: ${to}`);
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

    // Configurar SMTP com variáveis de ambiente do Supabase
    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const fromEmail = from?.email || Deno.env.get("FROM_EMAIL") || smtpUser;
    const fromName = from?.name || "Doxologos";

    if (!smtpUser || !smtpPassword) {
      return new Response(
        JSON.stringify({ error: "SMTP não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(" Enviando email:", { to, cc, subject });

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

    // Preparar destinatários
    const recipients = Array.isArray(to) ? to : [to];
    
    // Preparar estrutura do email
    const emailContent = {
      from: `${fromName} <${fromEmail}>`,
      to: recipients.join(", "),
      subject,
      html,
    };


    // Adicionar CC se fornecido
    if (cc) {
      const ccRecipients = Array.isArray(cc) ? cc : [cc];
      emailContent.cc = ccRecipients.join(", ");
      console.log(" Com cópia para:", emailContent.cc);
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
