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
    console.warn('Unauthorized role attempting manual refund proof', userRole, user.email);
    return jsonResponse(403, { error: 'Access denied for this role' });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (error) {
    console.error('Invalid JSON payload', error);
    return jsonResponse(400, { error: 'Invalid JSON payload' });
  }

  const refundId = typeof body.refund_id === 'string' ? body.refund_id.trim() : '';
  if (!refundId) {
    return jsonResponse(400, { error: 'refund_id is required' });
  }

  const { data: refund, error: refundError } = await supabaseAdmin
    .from('payment_refunds')
    .select('id, payment_id, proof_bucket, proof_path, proof_checksum, created_at')
    .eq('id', refundId)
    .maybeSingle();

  if (refundError) {
    console.error('Failed to load manual refund record', refundError.message);
    return jsonResponse(500, { error: 'Failed to load manual refund record' });
  }

  if (!refund) {
    return jsonResponse(404, { error: 'Manual refund not found' });
  }

  const fileName = refund.proof_path.split('/').pop() ?? 'comprovante-refund';

  const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
    .from(refund.proof_bucket)
    .createSignedUrl(refund.proof_path, 300, { download: fileName });

  if (signedUrlError) {
    console.error('Failed to issue signed URL for manual refund proof', signedUrlError.message);
    return jsonResponse(500, { error: 'Não foi possível gerar link temporário para o comprovante' });
  }

  return jsonResponse(200, {
    refund: {
      id: refund.id,
      payment_id: refund.payment_id,
      created_at: refund.created_at,
      proof_checksum: refund.proof_checksum,
    },
    signed_url: signedUrlData?.signedUrl ?? null,
    expires_at: signedUrlData?.expiration ?? null,
  });
});
