import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init.headers || {})
    }
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars');
    return jsonResponse({ error: 'Service not configured' }, { status: 500 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, { status: 401 });
  }

  const accessToken = authHeader.replace('Bearer ', '').trim();
  if (!accessToken) {
    return jsonResponse({ error: 'Invalid Authorization header' }, { status: 401 });
  }

  let body: {
    action?: 'check_in' | 'heartbeat' | 'check_out';
    eventoId?: string;
    inscricaoId?: string;
    presenceId?: string;
    durationIncrement?: number;
  } | null = null;

  try {
    body = await req.json();
  } catch (error) {
    console.error('Invalid JSON body', error);
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    console.error('Failed to validate token', userError);
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = userData.user;
  const action = body?.action || 'check_in';

  if (action === 'check_in') {
    const eventoId = body?.eventoId;
    if (!eventoId) {
      return jsonResponse({ error: 'eventoId is required for check_in' }, { status: 400 });
    }

    const { data: registration, error: regError } = await supabaseAdmin
      .from('inscricoes_eventos')
      .select('id, status')
      .eq('evento_id', eventoId)
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (regError || !registration) {
      return jsonResponse({ error: 'Confirmação de inscrição necessária para entrar na sala' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const { data: presence, error: presenceError } = await supabaseAdmin
      .from('presenca_eventos')
      .insert([
        {
          evento_id: eventoId,
          user_id: user.id,
          inscricao_id: registration.id,
          check_in_at: now,
          last_heartbeat_at: now,
          duration_seconds: 0,
          source: 'web'
        }
      ])
      .select('id, check_in_at')
      .single();

    if (presenceError) {
      console.error('Failed to create presence record', presenceError);
      return jsonResponse({ error: 'Failed to record check-in' }, { status: 500 });
    }

    return jsonResponse({ success: true, presenceId: presence.id, checkInAt: presence.check_in_at });
  }

  if (action === 'heartbeat') {
    const presenceId = body?.presenceId;
    if (!presenceId) {
      return jsonResponse({ error: 'presenceId is required for heartbeat' }, { status: 400 });
    }

    const durationIncrement = body?.durationIncrement || 30;
    const now = new Date().toISOString();

    const { data: current } = await supabaseAdmin
      .from('presenca_eventos')
      .select('duration_seconds, user_id')
      .eq('id', presenceId)
      .maybeSingle();

    if (!current || current.user_id !== user.id) {
      return jsonResponse({ error: 'Presence record not found or forbidden' }, { status: 404 });
    }

    const newDuration = (current.duration_seconds || 0) + durationIncrement;

    const { error: updateError } = await supabaseAdmin
      .from('presenca_eventos')
      .update({
        last_heartbeat_at: now,
        duration_seconds: newDuration,
        updated_at: now
      })
      .eq('id', presenceId);

    if (updateError) {
      console.error('Failed to update heartbeat', updateError);
      return jsonResponse({ error: 'Failed to record heartbeat' }, { status: 500 });
    }

    return jsonResponse({ success: true, presenceId, durationSeconds: newDuration });
  }

  if (action === 'check_out') {
    const presenceId = body?.presenceId;
    if (!presenceId) {
      return jsonResponse({ error: 'presenceId is required for check_out' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { data: current } = await supabaseAdmin
      .from('presenca_eventos')
      .select('user_id')
      .eq('id', presenceId)
      .maybeSingle();

    if (!current || current.user_id !== user.id) {
      return jsonResponse({ error: 'Presence record not found or forbidden' }, { status: 404 });
    }

    const { error: checkoutError } = await supabaseAdmin
      .from('presenca_eventos')
      .update({
        check_out_at: now,
        last_heartbeat_at: now,
        updated_at: now
      })
      .eq('id', presenceId);

    if (checkoutError) {
      console.error('Failed to record check-out', checkoutError);
      return jsonResponse({ error: 'Failed to record check-out' }, { status: 500 });
    }

    return jsonResponse({ success: true, presenceId, checkOutAt: now });
  }

  return jsonResponse({ error: 'Invalid action' }, { status: 400 });
});
