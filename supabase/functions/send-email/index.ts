// Supabase Edge Function para envio de e-mails via SMTP Hostinger
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
    const { to, subject, html, from, replyTo, cc } = await req.json();

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
      from: ${fromName} <>,
      to: recipients.join(", "),
      subject,
      content: "text/html",
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
      JSON.stringify({ success: true, messageId: ${Date.now()} }),
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
