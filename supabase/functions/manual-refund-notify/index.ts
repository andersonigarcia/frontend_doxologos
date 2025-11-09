// @ts-ignore: Remote import for Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: Remote import for Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

// Edge Function responsável por enviar notificações de reembolso manual pendentes.

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const MAX_ATTEMPTS = Number(Deno.env.get('MANUAL_REFUND_NOTIFY_MAX_ATTEMPTS') ?? '5');
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const sendEmail = async (
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  html: string,
  cc: string[] | null,
) => {
  const personalization: Record<string, unknown> = {
    to: [{ email: toEmail }],
  };

  if (cc && cc.length > 0) {
    personalization.cc = cc.map((email) => ({ email }));
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [personalization],
      from: { email: fromEmail },
      subject,
      content: [
        {
          type: 'text/html',
          value: html,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid error (${response.status}): ${errorText}`);
  }

  return response.headers.get('x-message-id') ?? null;
};

type NotificationRow = {
  id: string;
  refund_id: string;
  recipient_email: string;
  cc_emails: string[] | null;
  subject: string | null;
  message: string | null;
  metadata: Record<string, unknown> | null;
  attempts: number;
  scheduled_at: string;
  last_error: string | null;
  refund: {
    amount: number;
    currency: string | null;
    reason: string | null;
    metadata: Record<string, unknown> | null;
    processed_by: string;
    payment: {
      id: string;
      payer_name: string | null;
      payer_email: string | null;
      description: string | null;
      amount: number | null;
      currency: string | null;
      booking_id: string | null;
    } | null;
  } | null;
};

const buildFallbackHtml = (notification: NotificationRow): string => {
  const amountFormatted = notification.refund
    ? new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: notification.refund.currency ?? 'BRL',
      }).format(notification.refund.amount)
    : '';

  const reason = notification.refund?.reason ?? 'Reembolso manual processado.';

  const payerName =
    notification.refund?.payment?.payer_name ??
    notification.refund?.payment?.payer_email ??
    'Paciente';

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Reembolso confirmado</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f6f9fc; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 0 auto; padding: 40px 24px; background: #ffffff; }
      h1 { color: #1a202c; font-size: 20px; margin-bottom: 16px; }
      p { color: #2d3748; font-size: 15px; line-height: 1.5; }
      .amount { font-size: 18px; font-weight: bold; color: #1a202c; margin: 16px 0; }
      .footer { margin-top: 32px; font-size: 12px; color: #718096; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Olá, ${payerName}!</h1>
      <p>Seu reembolso foi concluído com sucesso.</p>
      ${amountFormatted ? `<p class="amount">Valor: ${amountFormatted}</p>` : ''}
      <p>${reason}</p>
      <p>Qualquer dúvida, responda este e-mail ou fale com nossa equipe financeira.</p>
      <p class="footer">Envio automático do sistema Doxologos</p>
    </div>
  </body>
</html>`;
};
const ensureHtml = (raw: string | null, notification: NotificationRow): string => {
  if (!raw || raw.trim().length === 0) {
    return buildFallbackHtml(notification);
  }

  const trimmed = raw.trim();
  const containsHtml = /<([a-z][\s\S]*?)>/i.test(trimmed);
  if (containsHtml) {
    return trimmed;
  }

  const escaped = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) =>
      `<p>${line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</p>`
    )
    .join('');

  return `<!doctype html><html><body>${
    escaped || '<p>Reembolso processado com sucesso.</p>'
  }</body></html>`;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed. Use POST.' });
  }

  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ??
    `https://${Deno.env.get('SUPABASE_REFERENCE_ID')}.supabase.co`;
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase credentials not configured');
    return jsonResponse(500, { error: 'Supabase credentials not configured' });
  }

  const sendgridKey = Deno.env.get('SENDGRID_API_KEY') ?? '';
  const sendgridFrom = Deno.env.get('SENDGRID_FROM_EMAIL') ?? '';

  if (!sendgridKey || !sendgridFrom) {
    console.error('SendGrid credentials not configured');
    return jsonResponse(500, { error: 'SendGrid credentials not configured' });
  }

  const requiredKey = Deno.env.get('MANUAL_REFUND_NOTIFY_KEY') ?? '';
  if (requiredKey) {
    const providedKey = req.headers.get('x-function-key')?.trim();
    if (!providedKey || providedKey !== requiredKey) {
      return jsonResponse(403, { error: 'Invalid function key' });
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown> = {};
  const contentLengthHeader = req.headers.get('content-length');
  const shouldParseBody = contentLengthHeader ? Number(contentLengthHeader) > 0 : false;

  if (shouldParseBody) {
    try {
      body = await req.json();
    } catch (error) {
      console.error('Invalid JSON payload', error);
      return jsonResponse(400, { error: 'Invalid JSON payload' });
    }
  }

  const limit = clamp(Number(body.limit ?? 10) || 10, 1, 50);
  const dryRun = Boolean(body.dry_run);
  const specificId = typeof body.notification_id === 'string' ? body.notification_id : null;

  const query = supabaseAdmin
    .from('payment_refund_notifications')
    .select(
      `id, refund_id, recipient_email, cc_emails, subject, message, metadata, attempts, scheduled_at, last_error,
       refund:payment_refunds(
         amount,
         currency,
         reason,
         metadata,
         processed_by,
         payment:payments(
           id,
           payer_name,
           payer_email,
           description,
           amount,
           currency,
           booking_id
         )
       )`
    )
    .order('scheduled_at', { ascending: true });

  if (specificId) {
    query.eq('id', specificId);
  } else {
    query.eq('status', 'pending');
    query.lte('scheduled_at', new Date().toISOString());
    query.lt('attempts', MAX_ATTEMPTS);
    query.limit(limit);
  }

  const { data: notifications, error: fetchError } = await query;

  if (fetchError) {
    console.error('Failed to load notifications', fetchError);
    return jsonResponse(500, { error: 'Failed to load notifications', details: fetchError.message });
  }

  if (!notifications || notifications.length === 0) {
    return jsonResponse(200, { processed: 0, dry_run: dryRun, notifications: [] });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const notification of notifications as NotificationRow[]) {
    if (dryRun) {
      results.push({ id: notification.id, status: 'dry_run' });
      continue;
    }

    try {
      const html = ensureHtml(notification.message, notification);

      const ccEmails = Array.isArray(notification.cc_emails)
        ? notification.cc_emails.filter((email): email is string => typeof email === 'string' && email.length > 0)
        : null;

      const sendgridMessageId = await sendEmail(
        sendgridKey,
        sendgridFrom,
        notification.recipient_email,
        notification.subject ?? 'Reembolso concluído',
        html,
        ccEmails,
      );

      const { error: updateError } = await supabaseAdmin
        .from('payment_refund_notifications')
        .update({
          status: 'sent',
          attempts: notification.attempts + 1,
          sent_at: new Date().toISOString(),
          last_error: null,
          metadata: {
            ...(notification.metadata ?? {}),
            sendgrid_message_id: sendgridMessageId,
          },
        })
        .eq('id', notification.id);

      if (updateError) {
        throw updateError;
      }

      if (notification.refund) {
        const auditPayload = {
          refund_id: notification.refund_id,
          performed_by: notification.refund.processed_by,
          action: 'notification_sent',
          payload: {
            notification_id: notification.id,
            recipient_email: notification.recipient_email,
            cc_emails: notification.cc_emails,
            sendgrid_message_id: sendgridMessageId,
          },
        };

        const { error: auditError } = await supabaseAdmin
          .from('payment_refund_audit_log')
          .insert(auditPayload);

        if (auditError) {
          console.error('Failed to insert audit log', auditError.message);
        }
      }

      results.push({ id: notification.id, status: 'sent', sendgrid_message_id: sendgridMessageId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to send refund notification', notification.id, message);

      const attempts = notification.attempts + 1;
      const status = attempts >= MAX_ATTEMPTS ? 'error' : 'pending';

      const { error: updateError } = await supabaseAdmin
        .from('payment_refund_notifications')
        .update({
          status,
          attempts,
          last_error: message.slice(0, 500),
        })
        .eq('id', notification.id);

      if (updateError) {
        console.error('Failed to update notification after error', updateError.message);
      }

      results.push({ id: notification.id, status: 'failed', error: message });
    }
  }

  return jsonResponse(200, {
    processed: results.filter((item) => item.status === 'sent').length,
    dry_run: dryRun,
    results,
  });
});
