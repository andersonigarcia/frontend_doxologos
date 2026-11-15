import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.30.0";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/**
 * admin-insights: Gera insights estratégicos e executivos para o gestor da clínica.
 * Conformidade: ZERO PII (apenas agregados de negócio são enviados ao modelo).
 * Fallback: Gera análise determinística robusta caso o Gemini API não responda.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Credenciais do Supabase ausentes no runtime");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Validar autenticação e papel de admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autorização necessária" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenStr = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(tokenStr);
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const role = user.app_metadata?.role || user.user_metadata?.role;
    if (role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Acesso restrito ao administrador do sistema" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Extrair métricas agregadas (sem qualquer dado pessoal ou clínico)
    const body = await req.json().catch(() => ({}));
    const metrics = {
      periodLabel: body.periodLabel || "Últimos 30 dias",
      gmvRealized: Number(body.gmvRealized || 0),
      grossMargin: Number(body.grossMargin || 0),
      takeRatePct: body.takeRatePct !== null && body.takeRatePct !== undefined ? Number(body.takeRatePct) : 40,
      realizedCount: Number(body.realizedCount || 0),
      pendingCount: Number(body.pendingCount || 0),
      toReceive: Number(body.toReceive || 0),
      occupancyPct: body.occupancyPct !== null && body.occupancyPct !== undefined ? Number(body.occupancyPct) : null,
      activeProfessionals: Number(body.activeProfessionals || 1),
      deltaGmvPct: body.deltaGmvPct !== null && body.deltaGmvPct !== undefined ? Number(body.deltaGmvPct) : null,
    };

    // 3. Montar Prompt Executivo Estrito (Sem PII, Token Budget enxuto)
    const promptText = `
Você é o Copiloto Estratégico do Gestor da Doxologos Psicologia (plataforma de psicologia clínica).
Analise as seguintes métricas consolidadas do período e devolva um diagnóstico executivo em JSON:

DADOS AGREGADOS DO PERÍODO (${metrics.periodLabel}):
- GMV Realizado (Consultas Pagas/Concluídas): R$ ${metrics.gmvRealized.toFixed(2)}
- Variação do GMV vs período anterior: ${metrics.deltaGmvPct !== null ? `${metrics.deltaGmvPct}%` : 'Sem base histórica'}
- Margem Bruta da Clínica (Take Rate): R$ ${metrics.grossMargin.toFixed(2)} (${metrics.takeRatePct.toFixed(1)}%)
- Consultas Realizadas: ${metrics.realizedCount}
- Cobranças Pendentes / Aguardando PIX: ${metrics.pendingCount} (Total R$ ${metrics.toReceive.toFixed(2)})
- Taxa de Ocupação da Agenda: ${metrics.occupancyPct !== null ? `${metrics.occupancyPct.toFixed(1)}%` : 'Em instrumentação'}
- Psicólogos Ativos na Equipe: ${metrics.activeProfessionals}

REGRAS:
1. Resposta estritamente no formato JSON fornecido abaixo.
2. Seja objetivo, profissional e focado em retorno financeiro, taxa de ocupação e redução de atrito.
3. Não invente dados ou promessas irreais.

FORMATO JSON OBRIGATÓRIO:
{
  "summary": "Resumo executivo de 1 a 2 frases avaliando a saúde do faturamento e ritmo de atendimentos.",
  "highlight": "Destaque positivo mais relevante dos números.",
  "attentionPoint": "Ponto de atenção operacional que requer cuidado (ex: cobranças pendentes, ociosidade ou falta de base).",
  "recommendation": "Ação prática recomendada para a semana visando rentabilidade ou preenchimento de agenda."
}
`;

    let resultJson = null;

    if (GEMINI_API_KEY) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            resultJson = JSON.parse(rawText);
          }
        } else {
          console.warn("[Gemini Insights] Falha na API do Gemini:", await geminiRes.text());
        }
      } catch (err) {
        console.error("[Gemini Insights] Erro de inferência:", err);
      }
    }

    // 4. Fallback Analítico Determinístico (Garante disponibilidade se a IA falhar)
    if (!resultJson) {
      const isPositive = (metrics.deltaGmvPct ?? 0) >= 0;
      resultJson = {
        summary: `No período analisado (${metrics.periodLabel}), a clínica consolidou R$ ${metrics.gmvRealized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em GMV com ${metrics.realizedCount} atendimento(s) realizado(s).`,
        highlight: metrics.realizedCount > 0
          ? `Operação ativa com receita retida da clínica em R$ ${metrics.grossMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${metrics.takeRatePct.toFixed(1)}% take rate).`
          : "Base operacional pronta para receber novos agendamentos e campanhas de conversão.",
        attentionPoint: metrics.pendingCount > 0
          ? `Há ${metrics.pendingCount} agendamento(s) com pagamento pendente somando R$ ${metrics.toReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
          : "Nenhuma pendência financeira crítica detectada no momento.",
        recommendation: metrics.pendingCount > 0
          ? "Ativar réguas automáticas de lembrete PIX para recuperar conversões pendentes antes da expiração dos slots."
          : "Incentivar abertura de horários nos dias de maior procura e acompanhar o retorno para a segunda sessão."
      };
    }

    return new Response(
      JSON.stringify({
        ...resultJson,
        generatedAt: new Date().toISOString(),
        isAiGenerated: !!GEMINI_API_KEY,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[admin-insights] Erro interno:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno ao processar insights" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
