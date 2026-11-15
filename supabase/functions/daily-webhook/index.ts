import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const event = body.event || body.type;
    const roomName = body.room || body.room_name || body.payload?.room;
    const payload = body.payload || {};

    console.log(`[daily-webhook] Recebido evento: ${event} para sala: ${roomName}`);

    if (!roomName) {
      return new Response(JSON.stringify({ received: true, note: 'No room specified' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Identificar o booking associado à sala
    let bookingId: string | null = null;

    // Tentativa 1: prefixo doxologos-<uuid>
    const match = roomName.match(/([0-9a-fA-F-]{36})/);
    if (match) {
      bookingId = match[1];
    } else {
      // Tentativa 2: buscar por video_room_name
      const { data: booking } = await supabase
        .from('bookings')
        .select('id')
        .eq('video_room_name', roomName)
        .maybeSingle();

      if (booking) {
        bookingId = booking.id;
      }
    }

    if (!bookingId) {
      console.warn(`[daily-webhook] Booking não encontrado para sala ${roomName}`);
      return new Response(JSON.stringify({ received: true, note: 'Booking not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Registrar telemetria de presença
    let telemetryEventType = 'heartbeat';
    if (event === 'participant.joined') telemetryEventType = 'joined';
    else if (event === 'participant.left') telemetryEventType = 'left';
    else if (event === 'meeting.ended') telemetryEventType = 'left';

    const participantRole = payload.is_owner ? 'professional' : 'patient';

    await supabase.from('consultation_telemetry').insert({
      booking_id: bookingId,
      participant_role: participantRole,
      event_type: telemetryEventType,
      metadata: {
        event,
        roomName,
        participant: payload.user_name || payload.user_id,
        duration: payload.duration,
        timestamp: new Date().toISOString(),
      },
    });

    // Atualizar bookings conforme o ciclo da sessão
    if (event === 'meeting.started' || event === 'participant.joined') {
      await supabase
        .from('bookings')
        .update({
          session_started_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .is('session_started_at', null);
    } else if (event === 'meeting.ended') {
      const durationSeconds = Number(payload.duration) || 0;
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

      await supabase
        .from('bookings')
        .update({
          session_ended_at: new Date().toISOString(),
          actual_duration_minutes: durationMinutes,
        })
        .eq('id', bookingId);

      console.log(`[daily-webhook] Sessão ${bookingId} encerrada. Duração: ${durationMinutes} min`);
    }

    return new Response(JSON.stringify({ success: true, booking_id: bookingId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    console.error('[daily-webhook] Erro:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
