import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ZOOM_CLIENT_ID = Deno.env.get('ZOOM_CLIENT_ID');
const ZOOM_CLIENT_SECRET = Deno.env.get('ZOOM_CLIENT_SECRET');
const ZOOM_ACCOUNT_ID = Deno.env.get('ZOOM_ACCOUNT_ID');

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
    console.error('Supabase env vars missing');
    return jsonResponse({ error: 'Service misconfigured' }, { status: 500 });
  }

  if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET || !ZOOM_ACCOUNT_ID) {
    console.error('Zoom env vars missing');
    return jsonResponse({ error: 'Zoom credentials missing' }, { status: 500 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header' }, { status: 401 });
  }

  const accessToken = authHeader.replace('Bearer ', '').trim();
  if (!accessToken) {
    return jsonResponse({ error: 'Invalid authorization header' }, { status: 401 });
  }

  let body: {
    topic?: string;
    startTime?: string;
    duration?: number;
    timezone?: string;
    agenda?: string;
    settings?: Record<string, unknown>;
    eventoId?: string;
  } | null = null;

  try {
    body = await req.json();
  } catch (error) {
    console.error('Invalid JSON body', error);
    return jsonResponse({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.topic || !body?.startTime) {
    return jsonResponse({ error: 'topic and startTime are required' }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData?.user) {
    console.error('Failed to validate user', userError);
    return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (userData.user.user_metadata?.role || userData.user.app_metadata?.role || '').toString().toLowerCase();
  const isAdmin = ['admin', 'superadmin'].includes(role);
  if (!isAdmin) {
    return jsonResponse({ error: 'Only admins can create meetings' }, { status: 403 });
  }

  const zoomTokenResponse = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  if (!zoomTokenResponse.ok) {
    const errorText = await zoomTokenResponse.text();
    console.error('Zoom token error', errorText);
    return jsonResponse({ error: 'Failed to get Zoom token', details: errorText }, { status: 502 });
  }

  const { access_token: zoomAccessToken } = await zoomTokenResponse.json();
  if (!zoomAccessToken) {
    console.error('Zoom token missing in response');
    return jsonResponse({ error: 'Zoom token missing' }, { status: 502 });
  }

  const zoomPayload = {
    topic: body.topic,
    type: 2,
    start_time: body.startTime,
    duration: body.duration || 60,
    timezone: body.timezone || 'America/Sao_Paulo',
    agenda: body.agenda || '',
    settings: body.settings || {
      join_before_host: false,
      waiting_room: true,
      approval_type: 0,
      mute_upon_entry: true,
      auto_recording: 'none'
    }
  };

  const zoomResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${zoomAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(zoomPayload)
  });

  if (!zoomResponse.ok) {
    const errorBody = await zoomResponse.text();
    console.error('Zoom create meeting error', errorBody);
    return jsonResponse({ error: 'Failed to create Zoom meeting', details: errorBody }, { status: 502 });
  }

  const meetingData = await zoomResponse.json();

  if (body.eventoId) {
    const { error: updateError } = await supabase
      .from('eventos')
      .update({
        meeting_link: meetingData.join_url,
        meeting_password: meetingData.password,
        meeting_id: String(meetingData.id),
        meeting_start_url: meetingData.start_url
      })
      .eq('id', body.eventoId);

    if (updateError) {
      console.error('Failed to persist meeting info to event', updateError);
    }
  }

  return jsonResponse({
    join_url: meetingData.join_url,
    start_url: meetingData.start_url,
    password: meetingData.password,
    id: meetingData.id
  });
});
