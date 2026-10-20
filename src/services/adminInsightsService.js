import { supabase } from '@/lib/customSupabaseClient';

/**
 * adminInsightsService — Serviço canônico para geração e cache de diagnósticos executivos
 * Conformidade estrita: ZERO PII (apenas agregados consolidados são transmitidos).
 */

const INSIGHTS_CACHE_KEY_PREFIX = 'doxologos_admin_insights_';

/**
 * Gera fallback determinístico caso a Edge Function / IA esteja inacessível.
 */
export function generateDeterministicInsights(metrics = {}) {
  const gmv = Number(metrics.gmvRealized || 0);
  const realized = Number(metrics.realizedCount || 0);
  const pending = Number(metrics.pendingCount || 0);
  const toReceive = Number(metrics.toReceive || 0);
  const takeRate = Number(metrics.takeRatePct || 40);
  const grossMargin = Number(metrics.grossMargin || (gmv * (takeRate / 100)));
  const deltaGmv = metrics.deltaGmvPct !== null && metrics.deltaGmvPct !== undefined ? Number(metrics.deltaGmvPct) : null;
  const periodLabel = metrics.periodLabel || 'Período Selecionado';

  let highlight = '';
  if (realized > 0) {
    highlight = `Operação ativa com receita retida estimada em ${formatBrl(grossMargin)} (${takeRate.toFixed(1)}% take rate) sobre ${realized} consulta(s).`;
  } else {
    highlight = 'Nenhum atendimento realizado no recorte de tempo atual.';
  }

  let attentionPoint = '';
  if (pending > 0) {
    attentionPoint = `Atenção para ${pending} cobrança(s) pendente(s) totalizando ${formatBrl(toReceive)} aguardando liquidação.`;
  } else if (metrics.occupancyPct !== null && metrics.occupancyPct < 40) {
    attentionPoint = `Taxa de ocupação da agenda em ${metrics.occupancyPct.toFixed(1)}%, indicando capacidade ociosa para novas consultas.`;
  } else {
    attentionPoint = 'Fluxo de liquidações operando com regularidade e sem gargalos críticos.';
  }

  let recommendation = '';
  if (pending > 0) {
    recommendation = 'Disparar régua de lembretes antes do vencimento do QR Code PIX para evitar perda de reservas.';
  } else if (deltaGmv !== null && deltaGmv < 0) {
    recommendation = 'Reavaliar horários disponíveis nos períodos de maior procura (noite/sábados) para recuperar volume.';
  } else {
    recommendation = 'Manter o ritmo de disponibilidade da equipe e incentivar o reagendamento contínuo da segunda sessão.';
  }

  return {
    summary: `Diagnóstico executivo (${periodLabel}): Faturamento realizado em ${formatBrl(gmv)} em ${realized} consulta(s) concluída(s).`,
    highlight,
    attentionPoint,
    recommendation,
    generatedAt: new Date().toISOString(),
    isAiGenerated: false
  };
}

function formatBrl(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Busca insights executivos via Edge Function ou gera fallback seguro.
 * @param {Object} metricsPayload
 * @returns {Promise<Object>}
 */
export async function fetchExecutiveInsights(metricsPayload = {}) {
  const cacheKey = `${INSIGHTS_CACHE_KEY_PREFIX}${metricsPayload.periodLabel || 'all'}_${Math.round(metricsPayload.gmvRealized || 0)}`;

  // Verificar cache de sessão recente (10 minutos)
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const isFresh = Date.now() - new Date(parsed.generatedAt).getTime() < 10 * 60 * 1000;
      if (isFresh) return parsed;
    }
  } catch (_) {
    // SessionStorage indisponível em SSR ou navegadores restritos
  }

  try {
    const { data, error } = await supabase.functions.invoke('admin-insights', {
      body: metricsPayload
    });

    if (!error && data && data.summary) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (_) {}
      return data;
    }
  } catch (err) {
    console.warn('[adminInsightsService] Fallback local ativado:', err?.message || err);
  }

  // Fallback determinístico instantâneo
  const fallback = generateDeterministicInsights(metricsPayload);
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(fallback));
  } catch (_) {}
  return fallback;
}
