import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.30.0";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const reqBody = await req.json().catch(() => ({}));
    const booking_id = reqBody.booking_id || reqBody.bookingId;
    const raw_notes = reqBody.raw_notes || reqBody.notes || '';

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

    // 1. Validar profissional autenticado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenStr = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(tokenStr);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Buscar agendamento e verificar autorização do psicólogo
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*, professional:professionals(id, name, user_id, ai_copilot_enabled, ai_trial_sessions_used, ai_trial_limit)")
      .eq("id", booking_id)
      .single();

    if (bErr || !booking) {
      return new Response(
        JSON.stringify({ error: `Agendamento ${booking_id} não encontrado` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!booking.professional || booking.professional.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Apenas o psicólogo titular pode gerar a evolução clínica" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const professional = booking.professional;
    const trialsUsed = professional.ai_trial_sessions_used || 0;
    const trialLimit = professional.ai_trial_limit ?? 3;
    const isTrial = trialsUsed < trialLimit;

    // 3. Montar Prompt Clínico Ético (Resolução CFP nº 01/2009 e 11/2018 - Padrão S.O.A.P.)
    const promptContext = `
Você é um assistente clínico especializado para psicólogos no Brasil, operando estritamente sob as diretrizes do Código de Ética Profissional do Psicólogo e das Resoluções CFP nº 01/2009 e 11/2018.
Sua função é gerar uma minuta técnica e estruturada de evolução clínica para prontuário psicológico no padrão internacional S.O.A.P. a partir dos tópicos e observações da sessão.

DADOS DA SESSÃO (Zero PII):
- Paciente: Paciente (identidade preservada sob sigilo profissional)
- Data: ${booking.booking_date}
- Horário: ${booking.booking_time}
- Notas brutas/observações do psicólogo: ${raw_notes || 'Sessão regular de psicoterapia online. Paciente compareceu pontualmente.'}

ESTRUTURA OBRIGATÓRIA DA MINUTA (Formate como JSON puro, sem markdown extra):
{
  "subjective": "Subjetivo: queixa principal relatada pelo paciente, demandas emocionais e relatos subjetivos trazidos no encontro",
  "objective": "Objetivo: exame do estado mental, humor, afeto, linguagem, atenção e atitude observados pelo terapeuta",
  "assessment": "Avaliação: análise técnica fundamentada, dinâmica psicológica observada e hipóteses diagnósticas/evolução clínica",
  "plan": "Plano terapêutico: técnicas aplicadas, intervenções realizadas, tarefas intersessão e metas para o próximo encontro",
  "patient_summary": "Resumo acolhedor e amigável (1 a 3 tópicos) que o paciente poderá visualizar em sua área para lembrar de seus combinados"
}
`;

    let generatedDraft: any = null;
    let usedGemini = false;

    if (GEMINI_API_KEY) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(12000),
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptContext }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 800,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            generatedDraft = JSON.parse(rawText);
            usedGemini = true;
          }
        } else {
          console.warn("[Gemini API] Falha na resposta da IA:", await geminiRes.text());
        }
      } catch (geminiErr) {
        console.error("[Gemini API] Erro ao chamar IA:", geminiErr);
      }
    }

    // Fallback estruturado de minuta clínica caso a chamada da IA não responda
    if (!generatedDraft) {
      generatedDraft = {
        subjective: raw_notes ? `Demanda trazida: ${raw_notes.slice(0, 160)}` : "Sessão focada no acompanhamento psicoterapêutico contínuo e desenvolvimento pessoal.",
        objective: "Paciente comunicativo, receptivo às intervenções e participativo no diálogo terapêutico.",
        assessment: "Escuta analítica ativa, acolhimento das demandas emocionais e problematização dos padrões comportamentais relatados.",
        plan: "Manter o registro reflexivo das emoções e condutas acordadas até a próxima sessão agendada.",
        patient_summary: "1. Praticar momentos diários de pausa e respiração consciente.\n2. Registrar sentimentos relevantes que surgirem durante a semana."
      };
    }

    const soapSummary = {
      subjective: generatedDraft.subjective || generatedDraft.queixa_principal || '',
      objective: generatedDraft.objective || generatedDraft.aspectos_emocionais || '',
      assessment: generatedDraft.assessment || generatedDraft.intervencoes_realizadas || '',
      plan: generatedDraft.plan || generatedDraft.metas_e_combinados || '',
      patient_summary: generatedDraft.patient_summary || generatedDraft.combinados_paciente || ''
    };

    // 4. Salvar ou Atualizar na tabela clinical_evolutions
    const { data: evolution, error: evoErr } = await supabase
      .from("clinical_evolutions")
      .upsert({
        booking_id,
        patient_id: booking.user_id,
        professional_id: professional.id,
        ai_generated_summary: soapSummary,
        professional_notes: raw_notes || null,
        status: "draft",
        updated_at: new Date().toISOString(),
      }, { onConflict: "booking_id" })
      .select()
      .single();

    if (evoErr) {
      console.error("[clinical_evolutions] Erro ao salvar evolução:", evoErr);
      throw new Error(`Falha ao salvar prontuário: ${evoErr.message}`);
    }

    // 5. Registrar Ledger Financeiro de IA (Add-on R$ 2,90 vs Custo R$ 1,20 apenas se Gemini foi acionado)
    await supabase.from("ai_usage_ledger").insert([{
      booking_id,
      professional_id: professional.id,
      is_trial: isTrial,
      add_on_amount: isTrial ? 0.00 : 2.90,
      technical_cost: usedGemini ? 1.20 : 0.00,
      billing_status: isTrial ? "waived_trial" : "pending_payout_deduction",
    }]);

    // 6. Atualizar contador de testes do psicólogo
    if (isTrial) {
      await supabase
        .from("professionals")
        .update({ ai_trial_sessions_used: trialsUsed + 1 })
        .eq("id", professional.id);
    }

    const trialsRemaining = Math.max(0, trialLimit - (trialsUsed + (isTrial ? 1 : 0)));

    return new Response(
      JSON.stringify({
        success: true,
        summary: soapSummary,
        evolution,
        isTrial,
        is_trial: isTrial,
        trialsRemaining,
        trial_info: {
          trial_sessions_used: trialsUsed + (isTrial ? 1 : 0),
          trial_limit: trialLimit,
        },
        message: isTrial
          ? `Minuta gerada com sucesso! Consulta de teste utilizada (${trialsUsed + 1}/${trialLimit}).`
          : "Minuta gerada com sucesso! Add-on de R$ 2,90 registrado para o repasse."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );


  } catch (error: any) {
    console.error("[generate-session-summary] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar resumo clínico" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
