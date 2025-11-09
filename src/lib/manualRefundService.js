import { supabase } from '@/lib/customSupabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const FUNCTION_PATH = '/functions/v1/manual-refund';
const OVERVIEW_FUNCTION_PATH = '/functions/v1/manual-refund-overview';
const PROOF_FUNCTION_PATH = '/functions/v1/manual-refund-proof';

const defaultErrorMessage = 'Não foi possível registrar o reembolso manual. Tente novamente.';

const parseResponseBody = async (response, context) => {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    console.error(`Erro ao interpretar resposta da função ${context}:`, error);
    return { raw: rawText };
  }
};

export const MAX_MANUAL_REFUND_PROOF_SIZE = 20 * 1024 * 1024; // 20MB (limite do bucket configurado)

function assertSupabaseUrl() {
  if (!SUPABASE_URL) {
    throw new Error('Supabase URL não configurada nas variáveis de ambiente.');
  }
}

async function getAccessTokenOrThrow(sessionErrorMessage = 'Sessão expirada. Faça login novamente.') {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Erro ao recuperar sessão atual:', sessionError);
    throw new Error(sessionErrorMessage);
  }

  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error(sessionErrorMessage);
  }

  return accessToken;
}

async function invokeManualRefundFunction(functionPath, payload, fallbackErrorMessage, sessionErrorMessage) {
  assertSupabaseUrl();

  const accessToken = await getAccessTokenOrThrow(
    sessionErrorMessage ?? 'Sessão expirada. Faça login novamente.',
  );

  const endpoint = `${SUPABASE_URL}${functionPath}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await parseResponseBody(response, functionPath);

  if (!response.ok) {
    const errorMessage = typeof data?.error === 'string' ? data.error : fallbackErrorMessage;
    const details = typeof data?.details === 'string' ? data.details : null;
    throw new Error(details ? `${errorMessage} (${details})` : errorMessage);
  }

  return data;
}

export async function submitManualRefund(payload) {
  const data = await invokeManualRefundFunction(
    FUNCTION_PATH,
    payload,
    defaultErrorMessage,
    'Sessão expirada. Faça login novamente para registrar o reembolso.',
  );

  return data;
}

export async function fetchManualRefunds(paymentId) {
  if (!paymentId) {
    throw new Error('Informe o identificador do pagamento para consultar os reembolsos.');
  }

  const data = await invokeManualRefundFunction(
    OVERVIEW_FUNCTION_PATH,
    { payment_id: paymentId },
    'Não foi possível carregar os reembolsos manualmente registrados.',
  );

  return Array.isArray(data?.refunds) ? data.refunds : [];
}

export async function getManualRefundProof(refundId) {
  if (!refundId) {
    throw new Error('Reembolso inválido para gerar link do comprovante.');
  }

  const data = await invokeManualRefundFunction(
    PROOF_FUNCTION_PATH,
    { refund_id: refundId },
    'Não foi possível gerar o link para o comprovante.',
  );

  if (!data?.signed_url) {
    throw new Error('Link temporário indisponível para o comprovante.');
  }

  return data;
}
