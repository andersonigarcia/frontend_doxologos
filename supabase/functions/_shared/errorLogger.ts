// Shared structured error logger + optional webhook alerting for Supabase Edge Functions
declare const Deno: any;

export type ErrorSeverity = 'warning' | 'error' | 'critical';

export interface EdgeErrorLogParams {
  service: string;
  severity?: ErrorSeverity;
  message: string;
  error?: unknown;
  errorCode?: string;
  context?: Record<string, unknown>;
  userId?: string | null;
  req?: Request;
}

function sanitizeContext(ctx: Record<string, unknown> = {}): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cpf', 'card', 'cvv', 'access_token'];
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(ctx)) {
    const lower = key.toLowerCase();
    if (sensitiveKeys.some((s) => lower.includes(s))) {
      clean[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      clean[key] = sanitizeContext(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

async function sendAlertWebhook(payload: {
  source: string;
  service: string;
  severity: string;
  message: string;
  errorCode?: string;
  context?: Record<string, unknown>;
}) {
  const webhookUrl = Deno.env.get('ALERT_WEBHOOK_URL');
  if (!webhookUrl) return;

  try {
    const text = `[${payload.severity.toUpperCase()}] [${payload.source}:${payload.service}] ${payload.message}${
      payload.errorCode ? ` (code: ${payload.errorCode})` : ''
    }`;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        content: text, // Compatível com Slack e Discord
        ...payload,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (webhookErr) {
    console.error('[errorLogger] Falha ao enviar alerta webhook:', webhookErr);
  }
}

export async function logEdgeError(params: EdgeErrorLogParams): Promise<void> {
  const {
    service,
    severity = 'error',
    message,
    error,
    errorCode,
    context = {},
    userId = null,
    req,
  } = params;

  const stackTrace = error instanceof Error ? error.stack : undefined;
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined;
  const fullMessage = errorMessage && !message.includes(errorMessage) ? `${message}: ${errorMessage}` : message;

  // Sempre manter log estruturado no stdout do Deno (Supabase Logs)
  console.error(
    JSON.stringify({
      level: severity,
      source: 'edge_function',
      service,
      message: fullMessage,
      errorCode,
      context: sanitizeContext(context),
      timestamp: new Date().toISOString(),
    })
  );

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ??
    (Deno.env.get('SUPABASE_REFERENCE_ID')
      ? `https://${Deno.env.get('SUPABASE_REFERENCE_ID')}.supabase.co`
      : '');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? '';

  const sanitizedContext = sanitizeContext(context);

  if (supabaseUrl && serviceRoleKey) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/system_error_logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          source: 'edge_function',
          service,
          severity,
          message: fullMessage.slice(0, 2000),
          error_code: errorCode || null,
          stack_trace: stackTrace ? stackTrace.slice(0, 4000) : null,
          context: sanitizedContext,
          user_id: userId,
          url: req?.url || null,
          user_agent: req?.headers.get('user-agent') || null,
        }),
      });
    } catch (dbErr) {
      console.error('[errorLogger] Falha ao gravar em system_error_logs:', dbErr);
    }
  }

  if (severity === 'critical' || severity === 'error') {
    await sendAlertWebhook({
      source: 'edge_function',
      service,
      severity,
      message: fullMessage,
      errorCode,
      context: sanitizedContext,
    });
  }
}

