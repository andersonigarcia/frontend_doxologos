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

type NotificationPayload = {
  recipient_email?: string;
  cc_emails?: unknown;
  subject?: string;
  message?: string;
};

type DecodedFile = {
  bytes: Uint8Array;
  contentType: string;
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

const sanitizeFilename = (value: string) => {
  const safe = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  return safe.length > 0 ? safe : 'comprovante';
};

const inferContentType = (base64: string | null, filename: string | null): string => {
  if (base64 && base64.startsWith('data:')) {
    const match = base64.match(/^data:([^;]+);/);
    if (match?.[1]) {
      return match[1];
    }
  }

  if (filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (extension) {
      const lookup: Record<string, string> = {
        pdf: 'application/pdf',
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        heic: 'image/heic',
        heif: 'image/heif',
      };
      if (lookup[extension]) {
        return lookup[extension];
      }
    }
  }

  return 'application/octet-stream';
};

const decodeBase64File = (value: string, filename: string): DecodedFile => {
  const normalized = value.includes(',') ? value.split(',').pop() ?? '' : value;
  const cleaned = normalized.trim().replace(/\s/g, '');

  let binary: string;
  try {
    binary = atob(cleaned);
  } catch (_error) {
    throw new Error('Invalid base64 payload');
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return {
    bytes,
    contentType: inferContentType(value, filename),
  };
};

const bufferToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const ensureBucketExists = async (supabase: ReturnType<typeof createClient>, bucket: string) => {
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (!error && data) {
    return;
  }

  const status = (error as { status?: number } | null)?.status;
  if (status && status !== 404) {
    throw error;
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
  });

  const createStatus = (createError as { status?: number } | null)?.status;
  if (createError && createStatus !== 409) {
    throw createError;
  }
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

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

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
    console.warn('Unauthorized role attempting manual refund', userRole, user.email);
    return jsonResponse(403, { error: 'Access denied for this role' });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (error) {
    console.error('Invalid JSON payload', error);
    return jsonResponse(400, { error: 'Invalid JSON payload' });
  }

  const paymentId = body.payment_id as string | undefined;
  if (!paymentId) {
    return jsonResponse(400, { error: 'payment_id is required' });
  }

  const amountRaw = body.amount as number | string | undefined;
  const amount =
    amountRaw === undefined || amountRaw === null ? null : Number(amountRaw);
  if (amount !== null && (Number.isNaN(amount) || amount <= 0)) {
    return jsonResponse(400, { error: 'amount must be a positive number' });
  }

  const currency = (body.currency as string | undefined)?.trim() ?? null;
  const reason = (body.reason as string | undefined)?.trim() ?? null;
  const proofBase64 = body.proof_base64 as string | undefined;
  const proofFilenameRaw = body.proof_filename as string | undefined;
  const metadata =
    typeof body.metadata === 'object' && body.metadata !== null
      ? (body.metadata as JsonRecord)
      : null;
  const notification =
    typeof body.notification === 'object' && body.notification !== null
      ? (body.notification as NotificationPayload)
      : {};

  if (!proofBase64 || !proofFilenameRaw) {
    return jsonResponse(400, {
      error: 'proof_base64 and proof_filename are required',
    });
  }

  const proofFilename = sanitizeFilename(proofFilenameRaw);
  const proofBucket =
    (body.proof_bucket as string | undefined)?.trim() || 'finance-refunds';

  let decoded: DecodedFile;
  try {
    decoded = decodeBase64File(proofBase64, proofFilenameRaw);
  } catch (error) {
    console.error('Failed to decode proof file', error);
    return jsonResponse(400, { error: 'Invalid proof_base64 payload' });
  }

  const proofArrayBuffer = decoded.bytes.buffer.slice(
    decoded.bytes.byteOffset,
    decoded.bytes.byteOffset + decoded.bytes.byteLength,
  ) as ArrayBuffer;
  const checksum = bufferToHex(
    await crypto.subtle.digest('SHA-256', proofArrayBuffer),
  );

  const providedChecksum =
    (body.proof_checksum as string | undefined)?.toLowerCase() ?? null;
  if (providedChecksum && providedChecksum !== checksum) {
    return jsonResponse(400, {
      error: 'proof_checksum mismatch',
      expected: checksum,
      received: providedChecksum,
    });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const proofPath = `${paymentId}/${timestamp}-${proofFilename}`;

  try {
    await ensureBucketExists(supabaseAdmin, proofBucket);
  } catch (error) {
    console.error('Failed to ensure storage bucket', error);
    return jsonResponse(500, { error: 'Failed to prepare storage bucket' });
  }

  const uploadResult = await supabaseAdmin.storage
    .from(proofBucket)
    .upload(proofPath, decoded.bytes, {
      contentType: decoded.contentType,
      upsert: false,
      cacheControl: '3600',
    });

  if (uploadResult.error) {
    console.error('Proof upload failed', uploadResult.error.message);
    const status = (uploadResult.error as { status?: number }).status ?? 500;
    return jsonResponse(status, {
      error: 'Failed to upload proof file',
      details: uploadResult.error.message,
    });
  }

  const notificationCc = Array.isArray(notification.cc_emails)
    ? notification.cc_emails.filter((item): item is string => typeof item === 'string')
    : null;

  const rpcPayload = {
    p_payment_id: paymentId,
    p_amount: amount,
    p_currency: currency,
    p_reason: reason,
    p_proof_bucket: proofBucket,
    p_proof_path: proofPath,
    p_proof_checksum: checksum,
    p_metadata: metadata,
    p_processed_by: user.id,
    p_notification_recipient: notification.recipient_email ?? null,
    p_notification_cc: notificationCc && notificationCc.length > 0 ? notificationCc : null,
    p_notification_subject: notification.subject ?? null,
    p_notification_message: notification.message ?? null,
  };

  let refundData: unknown;
  try {
    const { data, error } = await supabaseAdmin.rpc(
      'perform_manual_refund',
      rpcPayload,
    );

    if (error) {
      console.error('perform_manual_refund error', error.message);
      await supabaseAdmin.storage.from(proofBucket).remove([proofPath]);
      const status = (error as { code?: string }).code === 'P0001' ? 400 : 500;
      return jsonResponse(status, {
        error: 'Manual refund failed',
        details: error.message,
      });
    }

    refundData = data;
  } catch (error) {
    console.error('Unexpected refund execution error', error);
    await supabaseAdmin.storage.from(proofBucket).remove([proofPath]);
    return jsonResponse(500, { error: 'Unexpected error executing refund' });
  }

  return jsonResponse(201, {
    refund: refundData,
    proof: {
      bucket: proofBucket,
      path: proofPath,
      checksum,
      content_type: decoded.contentType,
    },
    processed_by: {
      id: user.id,
      email: user.email,
      role: userRole,
    },
  });
});