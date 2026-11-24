// Edge Function leve para receber erros críticos do frontend (funciona mesmo com AdBlocker ativo)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'OPTIONS, POST',
};

const ALLOWED_SEVERITIES = new Set(['warning', 'error', 'critical']);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const service = typeof body?.service === 'string' ? body.service.slice(0, 120) : 'frontend';
    const severity = ALLOWED_SEVERITIES.has(body?.severity) ? body.severity : 'error';
    const message = typeof body?.message === 'string' ? body.message.slice(0, 2000) : 'Unknown frontend error';
    const errorCode = typeof body?.errorCode === 'string' ? body.errorCode.slice(0, 100) : null;
    const stackTrace = typeof body?.stack === 'string' ? body.stack.slice(0, 4000) : null;
    const url = typeof body?.url === 'string' ? body.url.slice(0, 500) : null;
    const context = body?.context && typeof body.context === 'object' ? body.context : {};

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL') ??
      (Deno.env.get('SUPABASE_REFERENCE_ID')
        ? `https://${Deno.env.get('SUPABASE_REFERENCE_ID')}.supabase.co`
        : '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing Supabase config' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error: insertError } = await supabaseAdmin.from('system_error_logs').insert({
      source: 'frontend',
      service,
      severity,
      message,
      error_code: errorCode,
      stack_trace: stackTrace,
      context,
      user_id: typeof body?.userId === 'string' ? body.userId : null,
      url,
      user_agent: req.headers.get('user-agent')?.slice(0, 500) || null,
    });

    if (insertError) {
      console.error('[log-client-error] Erro ao inserir log:', insertError);
    }

    // Dispara webhook apenas para erros críticos de fluxos sensíveis (pagamento/auth)
    const webhookUrl = Deno.env.get('ALERT_WEBHOOK_URL');
    if (webhookUrl && severity === 'critical') {
      const text = `[CRITICAL] [frontend:${service}] ${message}${url ? ` | ${url}` : ''}`;
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          content: text,
          source: 'frontend',
          service,
          severity,
          message,
          context,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[log-client-error] Erro inesperado:', err);
    return new Response(JSON.stringify({ ok: false }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

