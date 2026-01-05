// @ts-ignore: Remote import for Supabase Edge Functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: Remote import for Supabase Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

type JsonRecord = Record<string, unknown>;

type ManualRefundRecord = {
  id: string;
  payment_id: string;
  processed_by: string;
  amount: number;
  currency: string;
  reason: string | null;
  proof_bucket: string;
  proof_path: string;
  proof_checksum: string | null;
  metadata: JsonRecord;
  created_at: string;
  updated_at: string;
};

type NotificationRecord = {
  id: string;
  refund_id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  recipient_email: string;
  cc_emails: string[];
  subject: string | null;
  message: string | null;
  metadata: JsonRecord;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

const allowedRoles = new Set([
  'admin',
  'finance_admin',
  'finance_supervisor',
  'finance_team',
]);

const jsonResponse = (status: number, body: JsonRecord | JsonRecord[]) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const sanitizeIds = (values: unknown): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  const unique = new Set<string>();
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      unique.add(value.trim());
    }
  }

  return Array.from(unique);
};

const getSupabaseCredentials = () => {
  const supabaseUrl =
    Deno.env.get('SUPABASE_URL') ??
    `https://${Deno.env.get('SUPABASE_REFERENCE_ID')}.supabase.co`;
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase credentials not configured');
  }

  return { supabaseUrl, serviceRoleKey };
};

const fetchProcessedUsers = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  userIds: string[],
) => {
  const processedBy = new Map<string, { id: string; email: string | null; full_name: string | null }>();

  await Promise.all(
    userIds.map(async (userId) => {
      try {
        const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (data?.user) {
          processedBy.set(userId, {
            id: data.user.id,
            email: data.user.email ?? null,
            full_name: (data.user.user_metadata?.full_name as string | null) ?? null,
          });
        } else {
          processedBy.set(userId, { id: userId, email: null, full_name: null });
        }
      } catch (error) {
        console.warn('Failed to resolve processed_by user', userId, error);
        processedBy.set(userId, { id: userId, email: null, full_name: null });
      }
    }),
  );

  return processedBy;
};

const buildRefundPayload = (
  refunds: ManualRefundRecord[],
  notifications: NotificationRecord[],
  processedUsers: Map<string, { id: string; email: string | null; full_name: string | null }>,
) => {
  const notificationsByRefund = new Map<string, NotificationRecord[]>();
  notifications.forEach((notification) => {
    const current = notificationsByRefund.get(notification.refund_id) ?? [];
    current.push(notification);
    notificationsByRefund.set(notification.refund_id, current);
  });

  return refunds.map((refund) => {
    const processed = processedUsers.get(refund.processed_by) ?? {
      id: refund.processed_by,
      email: null,
      full_name: null,
    };

    const entries = notificationsByRefund.get(refund.id) ?? [];
    entries.sort((a, b) => (a.updated_at > b.updated_at ? -1 : 1));
    const latestNotification = entries[0] ?? null;

    return {
      refund: {
        id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount,
        currency: refund.currency,
        reason: refund.reason,
        metadata: refund.metadata ?? {},
        proof: {
          bucket: refund.proof_bucket,
          path: refund.proof_path,
          checksum: refund.proof_checksum,
        },
        created_at: refund.created_at,
        updated_at: refund.updated_at,
      },
      processed_by: processed,
      notification: latestNotification
        ? {
            id: latestNotification.id,
            status: latestNotification.status,
            attempts: latestNotification.attempts,
            last_error: latestNotification.last_error,
            recipient_email: latestNotification.recipient_email,
            cc_emails: latestNotification.cc_emails,
            subject: latestNotification.subject,
            message: latestNotification.message,
            metadata: latestNotification.metadata ?? {},
            scheduled_at: latestNotification.scheduled_at,
            sent_at: latestNotification.sent_at,
            updated_at: latestNotification.updated_at,
          }
        : null,
    };
  });
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed. Use POST.' });
  }

  let supabaseAdmin;
  try {
    const { supabaseUrl, serviceRoleKey } = getSupabaseCredentials();
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch (error) {
    console.error('Supabase credentials not configured', error);
    return jsonResponse(500, { error: 'Supabase credentials not configured' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse(401, { error: 'Authorization header required' });
  }

  const token = authHeader.replace('Bearer', '').trim();
  if (!token) {
    return jsonResponse(401, { error: 'Authorization token malformed' });
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    console.warn('Failed to authenticate user', userError?.message);
    return jsonResponse(401, { error: 'Invalid or expired token' });
  }

  const userRole =
    (user.user_metadata?.role as string | undefined) ??
    (user.app_metadata?.role as string | undefined) ??
    'user';

  if (!allowedRoles.has(userRole)) {
    console.warn('Unauthorized role attempting manual refund overview', userRole, user.email);
    return jsonResponse(403, { error: 'Access denied for this role' });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (error) {
    console.error('Invalid JSON payload', error);
    return jsonResponse(400, { error: 'Invalid JSON payload' });
  }

  const paymentIds = sanitizeIds(body.payment_ids);
  const singlePaymentId = typeof body.payment_id === 'string' ? body.payment_id.trim() : '';
  if (singlePaymentId) {
    paymentIds.push(singlePaymentId);
  }

  const uniquePaymentIds = Array.from(new Set(paymentIds));
  if (uniquePaymentIds.length === 0) {
    return jsonResponse(400, { error: 'payment_id or payment_ids is required' });
  }

  if (uniquePaymentIds.length > 25) {
    return jsonResponse(400, { error: 'Maximum of 25 payment_ids per request' });
  }

  const { data: refunds, error: refundsError } = await supabaseAdmin
    .from('payment_refunds')
    .select('*')
    .in('payment_id', uniquePaymentIds)
    .order('created_at', { ascending: false });

  if (refundsError) {
    console.error('Failed to load manual refunds', refundsError.message);
    return jsonResponse(500, { error: 'Failed to load manual refunds' });
  }

  const refundRecords = (refunds ?? []) as ManualRefundRecord[];
  if (refundRecords.length === 0) {
    return jsonResponse(200, { refunds: [] });
  }

  const refundIds = Array.from(new Set(refundRecords.map((record) => record.id)));

  const { data: notifications, error: notificationsError } = await supabaseAdmin
    .from('payment_refund_notifications')
    .select('*')
    .in('refund_id', refundIds)
    .order('updated_at', { ascending: false });

  if (notificationsError) {
    console.error('Failed to load refund notifications', notificationsError.message);
    return jsonResponse(500, { error: 'Failed to load refund notifications' });
  }

  const processedUserIds = Array.from(new Set(refundRecords.map((record) => record.processed_by)));
  const processedUsers = await fetchProcessedUsers(supabaseAdmin, processedUserIds);

  const payload = buildRefundPayload(
    refundRecords,
    (notifications ?? []) as NotificationRecord[],
    processedUsers,
  );

  return jsonResponse(200, { refunds: payload });
});
