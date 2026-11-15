import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.30.0";
import { corsHeaders } from "../_shared/cors.ts";

const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { booking_id } = await req.json();

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Obter agendamento, serviço, profissional e paciente
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*, service:services(id, name, duration_minutes), professional:professionals(id, name, user_id, personal_meet_link)")
      .eq("id", booking_id)
      .single();

    if (bErr || !booking) {
      return new Response(
        JSON.stringify({ error: `Agendamento ${booking_id} não encontrado` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Identificar usuário autenticado e papel (Profissional vs Paciente)
    const authHeader = req.headers.get("Authorization");
    let isProf = false;
    let userId: string | null = null;
    let userName = booking.patient_name || "Paciente";

    if (authHeader) {
      const tokenStr = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(tokenStr);
      if (user) {
        userId = user.id;
        if (booking.professional && booking.professional.user_id === user.id) {
          isProf = true;
          userName = booking.professional.name || "Psicólogo(a)";
        }
      }
    }

    const durationMinutes = Number(booking.service?.duration_minutes) || 50;
    const fallbackLink = booking.meeting_link || booking.professional?.personal_meet_link || null;

    // ── 3. CIRCUIT BREAKER / RESILIÊNCIA ──────────────────────────────────────
    // Se a API Key não estiver configurada ou se o agendamento já estiver marcado como contingência:
    if (!DAILY_API_KEY || booking.consultation_mode === "fallback_phase1") {
      console.warn(`[CircuitBreaker] Ativando modo contingência Fase 1 para booking ${booking_id}.`);
      
      // Registrar telemetria do circuit breaker
      await supabase.from("consultation_telemetry").insert([{
        booking_id,
        participant_role: isProf ? "professional" : "patient",
        user_id: userId,
        event_type: "circuit_breaker_triggered",
        metadata: { reason: !DAILY_API_KEY ? "DAILY_API_KEY_NOT_CONFIGURED" : "FORCED_FALLBACK_MODE" }
      }]).catch((e: any) => console.error("Erro ao gravar telemetria:", e));

      return new Response(
        JSON.stringify({
          mode: "fallback_phase1",
          fallbackUrl: fallbackLink,
          durationMinutes,
          message: "Atendimento operando via Sala de Contingência protegida (Fase 1)."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. DAILY.CO ENGINE (SALA EFÊMERA & TOKENS) ───────────────────────────
    try {
      const roomName = `dox-${booking.id.slice(0, 8)}`;
      // Expira em: Duração da consulta + 15 min de tolerância após o horário
      const expTimestamp = Math.floor(Date.now() / 1000) + ((durationMinutes + 15) * 60);

      let roomUrl = booking.video_room_url;

      // 4.1 Criar a sala no Daily caso ainda não exista
      if (!roomUrl) {
        const createRoomRes = await fetch("https://api.daily.co/v1/rooms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DAILY_API_KEY}`,
          },
          body: JSON.stringify({
            name: roomName,
            privacy: "private",
            properties: {
              exp: expTimestamp,
              enable_chat: true,
              enable_screenshare: isProf,
              enable_prejoin_ui: true,
              lang: "pt",
              meeting_join_hook: `${SUPABASE_URL}/functions/v1/daily-webhook`,
            },
          }),
        });

        if (!createRoomRes.ok) {
          const errBody = await createRoomRes.text();
          throw new Error(`Daily API error (${createRoomRes.status}): ${errBody}`);
        }

        const roomData = await createRoomRes.json();
        roomUrl = roomData.url;

        // Atualizar no banco
        await supabase.from("bookings").update({
          video_room_name: roomName,
          video_room_url: roomUrl,
          consultation_mode: "embedded"
        }).eq("id", booking_id);
      }

      // 4.2 Gerar Meeting Token com papéis e permissões
      const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            room_name: roomName,
            is_owner: isProf,
            user_name: userName,
            user_id: userId || undefined,
            enable_screenshare: isProf,
            start_video_off: false,
            start_audio_off: false,
          },
        }),
      });

      if (!tokenRes.ok) {
        const tokenErrBody = await tokenRes.text();
        throw new Error(`Daily Meeting Token error (${tokenRes.status}): ${tokenErrBody}`);
      }

      const tokenData = await tokenRes.json();

      // Gravar log de telemetria de entrada
      await supabase.from("consultation_telemetry").insert([{
        booking_id,
        participant_role: isProf ? "professional" : "patient",
        user_id: userId,
        event_type: "joined",
        metadata: { client: "daily_prebuilt", room_name: roomName }
      }]).catch((e: any) => console.error("Erro ao gravar telemetria:", e));

      return new Response(
        JSON.stringify({
          mode: "embedded",
          roomUrl,
          token: tokenData.token,
          isOwner: isProf,
          durationMinutes,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (dailyErr: any) {
      // Fallback gracioso automático ao vivo (Circuit Breaker)
      console.error("[CircuitBreaker] Falha na chamada Daily.co. Ativando Fallback Fase 1:", dailyErr);

      // Notificar Admin sobre a ocorrência para monitoramento
      await supabase.from("notifications").insert([{
        type: "system:daily_quota_fallback",
        title: "⚠️ Falha de Provedor de Vídeo Daily - Fallback Fase 1 Ativado",
        message: `Consulta #${booking_id} redirecionada para contingência da Fase 1. Detalhes: ${dailyErr.message}`,
        link: `/admin?tab=bookings&booking_id=${booking_id}`,
        metadata: { booking_id, error: dailyErr.message }
      }]).catch((e: any) => console.error("Erro ao criar alerta admin:", e));

      return new Response(
        JSON.stringify({
          mode: "fallback_phase1",
          fallbackUrl: fallbackLink,
          durationMinutes,
          message: "Consulta redirecionada com segurança para sala de contingência protegida."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: any) {
    console.error("[create-video-room] Erro inesperado:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno ao processar sala de vídeo" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
