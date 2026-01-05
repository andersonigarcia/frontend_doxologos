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

  let body: { eventoId?: string; evento_id?: string } | null = null;
  try {
    body = await req.json();
  } catch (error) {
    console.error('Invalid JSON body', error);
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const eventoId = body?.eventoId || body?.evento_id;
  if (!eventoId) {
    return jsonResponse({ error: 'eventoId is required' }, { status: 400 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    console.error('Failed to validate token', userError);
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = userData.user;
  const role = (user.user_metadata?.role || user.app_metadata?.role || '').toString().toLowerCase();
  const isAdmin = ['admin', 'superadmin'].includes(role);

  if (!isAdmin) {
    const { data: registration, error: registrationError } = await supabaseAdmin
      .from('inscricoes_eventos')
      .select('status')
      .eq('evento_id', eventoId)
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .order('data_inscricao', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (registrationError) {
      console.error('Failed to verify registration', registrationError);
      return jsonResponse({ error: 'Unable to validate registration' }, { status: 500 });
    }

    if (!registration || registration.status !== 'confirmed') {
      return jsonResponse({ error: 'Access denied' }, { status: 403 });
    }
  }

  const { data: meeting, error: meetingError } = await supabaseAdmin
    .from('event_meetings')
    .select('meeting_link, meeting_password, meeting_id, host_start_url')
    .eq('evento_id', eventoId)
    .maybeSingle();

  if (meetingError) {
    console.error('Failed to load meeting data', meetingError);
    return jsonResponse({ error: 'Unable to load meeting data' }, { status: 500 });
  }

  let resolvedMeeting = meeting;

  if (!resolvedMeeting) {
    const { data: legacyMeeting, error: legacyError } = await supabaseAdmin
      .from('eventos')
      .select('meeting_link, meeting_password, meeting_id, meeting_start_url')
      .eq('id', eventoId)
      .maybeSingle();

    if (legacyError) {
      console.error('Failed to load legacy meeting data', legacyError);
      return jsonResponse({ error: 'Unable to load meeting data' }, { status: 500 });
    }

    if (!legacyMeeting || !legacyMeeting.meeting_link) {
      return jsonResponse({ error: 'Meeting not found' }, { status: 404 });
    }

    resolvedMeeting = {
      meeting_link: legacyMeeting.meeting_link,
      meeting_password: legacyMeeting.meeting_password,
      meeting_id: legacyMeeting.meeting_id,
      host_start_url: legacyMeeting.meeting_start_url
    };

    const { error: backfillError } = await supabaseAdmin
      .from('event_meetings')
      .upsert({
        evento_id: eventoId,
        meeting_link: legacyMeeting.meeting_link,
        meeting_password: legacyMeeting.meeting_password,
        meeting_id: legacyMeeting.meeting_id,
        host_start_url: legacyMeeting.meeting_start_url
      });

    if (backfillError) {
      console.error('Failed to backfill event_meetings row', backfillError);
    }
  }

  return jsonResponse({
    meetingLink: resolvedMeeting.meeting_link,
    meetingPassword: resolvedMeeting.meeting_password,
    meetingId: resolvedMeeting.meeting_id,
    hostStartUrl: isAdmin ? resolvedMeeting.host_start_url : null
  });
});
