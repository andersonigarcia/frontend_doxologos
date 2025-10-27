import { serve } from "https://deno.land/std@0.168.0/http/server.ts";// Supabase Edge Function para envio de e-mails via SMTP Hostinger// Supabase Edge Function para envio de e-mails via SMTP Hostinger

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {

  "Access-Control-Allow-Origin": "*",import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",

};



serve(async (req) => {const corsHeaders = {const corsHeaders = {

  if (req.method === "OPTIONS") {

    return new Response("ok", { headers: corsHeaders });  "Access-Control-Allow-Origin": "*",  "Access-Control-Allow-Origin": "*",

  }

  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",

  try {

    const { to, subject, html, from, replyTo } = await req.json();};};



    if (!to || !subject || !html) {

      return new Response(

        JSON.stringify({ error: "Dados obrigatórios ausentes" }),serve(async (req) => {serve(async (req) => {

        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }

      );  // Handle CORS preflight  // Handle CORS preflight

    }

  if (req.method === "OPTIONS") {  if (req.method === "OPTIONS") {

    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";

    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");    return new Response("ok", { headers: corsHeaders });    return new Response("ok", { headers: corsHeaders });

    const smtpUser = Deno.env.get("SMTP_USER");

    const smtpPassword = Deno.env.get("SMTP_PASSWORD");  }  }

    const fromEmail = from?.email || Deno.env.get("FROM_EMAIL") || smtpUser;

    const fromName = from?.name || "Doxologos";



    if (!smtpUser || !smtpPassword) {  try {  try {

      return new Response(

        JSON.stringify({ error: "SMTP não configurado" }),    const { to, subject, html, from, replyTo } = await req.json();    const { to, subject, html, from, replyTo } = await req.json();

        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }

      );

    }

    // Validar dados obrigatórios    // Validar dados obrigatórios

    console.log("Enviando email:", to);

    if (!to || !subject || !html) {    if (!to || !subject || !html) {

    const client = new SMTPClient({

      connection: {      return new Response(      return new Response(

        hostname: smtpHost,

        port: smtpPort,        JSON.stringify({ error: "Dados obrigatórios ausentes: to, subject, html" }),        JSON.stringify({ error: "Dados obrigatórios ausentes: to, subject, html" }),

        tls: true,

        auth: {        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }

          username: smtpUser,

          password: smtpPassword,      );      );

        },

      },    }    }

    });



    await client.send({

      from: `${fromName} <${fromEmail}>`,    // Configurar cliente SMTP    // Configurar cliente SMTP

      to: to,

      subject: subject,    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";

      content: html,

      html: html,    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");

    });

    const smtpUser = Deno.env.get("SMTP_USER");    const smtpUser = Deno.env.get("SMTP_USER");

    await client.close();

    const smtpPassword = Deno.env.get("SMTP_PASSWORD");    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    return new Response(

      JSON.stringify({ success: true, messageId: `${Date.now()}` }),    const fromEmail = from?.email || Deno.env.get("FROM_EMAIL") || smtpUser;    const fromEmail = from?.email || Deno.env.get("FROM_EMAIL") || smtpUser;

      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }

    );    const fromName = from?.name || Deno.env.get("FROM_NAME") || "Doxologos";    const fromName = from?.name || Deno.env.get("FROM_NAME") || "Doxologos";

  } catch (error) {

    console.error("Erro email:", error);    const replyToEmail = replyTo || Deno.env.get("REPLY_TO_EMAIL") || fromEmail;    const replyToEmail = replyTo || Deno.env.get("REPLY_TO_EMAIL") || fromEmail;

    return new Response(

      JSON.stringify({ error: "Falha ao enviar", details: error.message }),

      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }

    );    if (!smtpUser || !smtpPassword) {    if (!smtpUser || !smtpPassword) {

  }

});      return new Response(      return new Response(


        JSON.stringify({ error: "Credenciais SMTP não configuradas" }),        JSON.stringify({ error: "Credenciais SMTP não configuradas" }),

        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }

      );      );

    }    }



    console.log("📧 Enviando email para:", to, "via", smtpHost);    console.log("📧 Enviando email para:", to, "via", smtpHost);



    // Criar cliente SMTP    // Configurar SMTP com variáveis de ambiente do Supabase  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with, accept",

    const client = new SMTPClient({

      connection: {    const smtpConfig = {  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",

        hostname: smtpHost,

        port: smtpPort,      host: Deno.env.get('SMTP_HOST') || 'smtp.hostinger.com',  "Access-Control-Max-Age": "86400", // 24 hours

        tls: true,

        auth: {      port: parseInt(Deno.env.get('SMTP_PORT') || '465'),};

          username: smtpUser,

          password: smtpPassword,      secure: Deno.env.get('SMTP_SECURE') === 'true',serve(async (req)=>{

        },

      },      user: Deno.env.get('SMTP_USER'),  // CORS preflight

    });

      pass: Deno.env.get('SMTP_PASS'),  if (req.method === "OPTIONS") {

    // Enviar email

    await client.send({    };    return new Response("ok", {

      from: `${fromName} <${fromEmail}>`,

      to: to,      headers: corsHeaders

      subject: subject,

      content: html,    // Validar configuração SMTP    });

      html: html,

    });    if (!smtpConfig.user || !smtpConfig.pass) {  }



    await client.close();      console.error('SMTP credentials not configured');  // Parse body safely



    console.log("✅ Email enviado com sucesso para:", to);      return new Response(  let body;



    return new Response(        JSON.stringify({ error: 'SMTP não configurado' }),  try {

      JSON.stringify({

        success: true,        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }    body = await req.json();

        messageId: `${Date.now()}-${to}`,

        timestamp: new Date().toISOString(),      );  } catch (err) {

      }),

      {    }    console.error("Invalid or missing JSON body", err);

        status: 200,

        headers: { ...corsHeaders, "Content-Type": "application/json" },    return new Response(JSON.stringify({

      }

    );    // Enviar e-mail usando fetch para API SMTP externa      error: "Invalid or missing JSON body"

  } catch (error) {

    console.error("❌ Erro ao enviar email:", error);    // Nota: Deno não tem nodemailer nativo, então usamos uma API REST SMTP    }), {



    return new Response(    const emailData = {      status: 400,

      JSON.stringify({

        error: "Falha ao enviar email",      from: from || {      headers: {

        details: error.message,

      }),        email: Deno.env.get('FROM_EMAIL') || 'noreply@doxologos.com.br',        ...corsHeaders,

      {

        status: 500,        name: Deno.env.get('FROM_NAME') || 'Doxologos'        "Content-Type": "application/json"

        headers: { ...corsHeaders, "Content-Type": "application/json" },

      }      },      }

    );

  }      to,    });

});

      subject,  }

      html,  // Resolve recipient from common fields

      replyTo: replyTo || Deno.env.get('REPLY_TO_EMAIL'),  const recipient = body?.to || body?.email || body?.recipient || body?.user?.email;

    };  if (!recipient) {

    console.error("Recipient email missing in payload", {

    // Log para debug (remover em produção)      bodyPreview: JSON.stringify(body).slice(0, 500)

    console.log('Sending email to:', to);    });

    return new Response(JSON.stringify({

    // IMPORTANTE: Para Supabase Edge Functions, você precisa usar um serviço SMTP API      error: 'Recipient email missing. Provide "to" or "email" in the JSON body.'

    // como SendGrid, Resend, ou implementar um worker separado    }), {

    // Por enquanto, retornamos sucesso simulado em desenvolvimento      status: 400,

          headers: {

    const isDev = Deno.env.get('ENVIRONMENT') === 'development';        ...corsHeaders,

            "Content-Type": "application/json"

    if (isDev) {      }

      console.log('📧 [DEV] Email simulado:', emailData);    });

      return new Response(  }

        JSON.stringify({   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

          success: true,   if (!emailRegex.test(recipient)) {

          messageId: `dev_${Date.now()}`,    console.error("Recipient email invalid", {

          dev: true       recipient

        }),    });

        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }    return new Response(JSON.stringify({

      );      error: "Invalid recipient email format."

    }    }), {

      status: 400,

    // Em produção, você precisa integrar com um serviço SMTP API      headers: {

    // Exemplo com Resend (recomendado para Supabase):        ...corsHeaders,

    // const response = await fetch('https://api.resend.com/emails', {        "Content-Type": "application/json"

    //   method: 'POST',      }

    //   headers: {    });

    //     'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,  }

    //     'Content-Type': 'application/json',  // Validate required fields: subject and html (text optional)

    //   },  const subject = body?.subject;

    //   body: JSON.stringify(emailData),  const html = body?.html;

    // });  const text = body?.text;

  if (!subject || !html) {

    return new Response(    return new Response(JSON.stringify({

      JSON.stringify({       error: "Campos obrigatórios: to, subject, html"

        success: true,    }), {

        message: 'Email enviado com sucesso',      status: 400,

        messageId: `prod_${Date.now()}`      headers: {

      }),        ...corsHeaders,

      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }        "Content-Type": "application/json"

    );      }

    });

  } catch (error) {  }

    console.error('Error in send-email function:', error);  // Validate SMTP credentials

    return new Response(  const smtpUser = Deno.env.get("SMTP_USER");

      JSON.stringify({   const smtpPassword = Deno.env.get("SMTP_PASSWORD");

        error: 'Erro ao enviar e-mail',  if (!smtpUser || !smtpPassword) {

        details: error.message     return new Response(JSON.stringify({

      }),      error: "Credenciais SMTP não configuradas"

      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }    }), {

    );      status: 500,

  }      headers: {

});        ...corsHeaders,

        "Content-Type": "application/json"
      }
    });
  }
  // Build SMTP client
  const host = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";
  const port = parseInt(Deno.env.get("SMTP_PORT") || "587");
  // Expect SMTP_SECURE as "true" or "false" (default true)
  const secureEnv = Deno.env.get("SMTP_SECURE");
  const useTls = secureEnv === "false" ? false : true;
  const client = new SMTPClient({
    connection: {
      hostname: host,
      port: port,
      tls: useTls,
      auth: {
        username: smtpUser,
        password: smtpPassword
      }
    }
  });
  // From and replyTo fallbacks
  const fromField = body?.from && (typeof body.from === "string" ? body.from : body.from.email) || Deno.env.get("FROM_EMAIL") || "contato@doxologos.com.br";
  const replyTo = body?.replyTo || Deno.env.get("REPLY_TO_EMAIL") || undefined;
  try {
    await client.send({
      from: fromField,
      to: recipient,
      subject,
      content: text || undefined,
      html,
      replyTo
    });
    await client.close();
    return new Response(JSON.stringify({
      success: true,
      message: "E-mail enviado",
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    // Fechar cliente se necessário
    try {
      await client.close();
    } catch (_) {}
    return new Response(JSON.stringify({
      error: "Falha ao enviar e-mail",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
