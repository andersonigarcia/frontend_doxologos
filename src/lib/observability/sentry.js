import * as Sentry from '@sentry/react';

const SENSITIVE_KEYS = [
  'password',
  'senha',
  'token',
  'secret',
  'authorization',
  'cpf',
  'card',
  'cvv',
  'access_token',
  'refresh_token',
];

const RECENT_ERROR_CACHE = new Map();
const DEDUP_WINDOW_MS = 10_000;

let sentryInitialized = false;

function getEnv(key) {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key] !== undefined) {
      return import.meta.env[key];
    }
  } catch {
    // ignore in non-ESM test environments
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

function isProdEnv() {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return Boolean(import.meta.env.PROD);
    }
  } catch {
    // ignore
  }
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
}

export function sanitizePayload(data, depth = 0) {
  if (!data || typeof data !== 'object' || depth > 4) return data;
  if (Array.isArray(data)) {
    return data.slice(0, 20).map((item) => sanitizePayload(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sensitive) => lower.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizePayload(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function initSentry() {
  if (sentryInitialized || typeof window === 'undefined') return false;

  const dsn = getEnv('VITE_SENTRY_DSN');
  const enabled = isProdEnv() || getEnv('VITE_SENTRY_ENABLED') === 'true';

  if (!dsn || !enabled) {
    return false;
  }

  Sentry.init({
    dsn,
    environment: getEnv('VITE_APP_ENV') || (isProdEnv() ? 'production' : 'development'),
    release: getEnv('VITE_APP_VERSION') || undefined,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: Number(getEnv('VITE_SENTRY_TRACES_SAMPLE_RATE') ?? 0.1),
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      'net::ERR_BLOCKED_BY_CLIENT',
    ],
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.authorization;
        delete event.request.headers.Cookie;
      }
      if (event.extra) {
        event.extra = sanitizePayload(event.extra);
      }
      if (event.contexts) {
        event.contexts = sanitizePayload(event.contexts);
      }
      return event;
    },
  });

  sentryInitialized = true;
  return true;
}

export function setSentryUser(user) {
  if (!sentryInitialized) return;
  if (!user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: user.id,
    role: user.role || undefined,
  });
}

export function captureError(error, context = {}) {
  const safeContext = sanitizePayload(context);
  if (sentryInitialized) {
    Sentry.withScope((scope) => {
      if (safeContext?.flow) scope.setTag('flow', safeContext.flow);
      if (safeContext?.service) scope.setTag('service', safeContext.service);
      if (safeContext?.page) scope.setTag('page', safeContext.page);
      scope.setExtras(safeContext);
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(typeof error === 'string' ? error : JSON.stringify(error), 'error');
      }
    });
  }
}

export function captureMessage(message, level = 'info', context = {}) {
  if (!sentryInitialized) return;
  Sentry.withScope((scope) => {
    const safeContext = sanitizePayload(context);
    if (safeContext?.flow) scope.setTag('flow', safeContext.flow);
    if (safeContext?.service) scope.setTag('service', safeContext.service);
    scope.setExtras(safeContext);
    Sentry.captureMessage(message, level);
  });
}

function shouldSkipDuplicate(dedupKey) {
  const now = Date.now();
  const last = RECENT_ERROR_CACHE.get(dedupKey);
  if (last && now - last < DEDUP_WINDOW_MS) {
    return true;
  }
  RECENT_ERROR_CACHE.set(dedupKey, now);
  if (RECENT_ERROR_CACHE.size > 100) {
    const oldestKey = RECENT_ERROR_CACHE.keys().next().value;
    RECENT_ERROR_CACHE.delete(oldestKey);
  }
  return false;
}

/**
 * Reporta erros operacionais críticos (Pagamento, Auth/Recuperação de Senha, API 5xx)
 * para o Sentry E para a Edge Function `log-client-error` no Supabase (resiliente a AdBlockers).
 */
export function reportOperationalError({
  service = 'frontend',
  flow = 'general',
  severity = 'error',
  message,
  error,
  errorCode,
  context = {},
  userId = null,
}) {
  if (typeof window === 'undefined') return;

  const finalMessage = message || (error instanceof Error ? error.message : String(error || 'Unknown operational error'));
  const dedupKey = `${service}:${flow}:${errorCode || ''}:${finalMessage}`;
  if (shouldSkipDuplicate(dedupKey)) return;

  const safeContext = sanitizePayload({ ...context, flow });

  // 1. Sentry (se configurado e não bloqueado)
  if (error instanceof Error) {
    captureError(error, { ...safeContext, service, flow, errorCode });
  } else {
    captureMessage(finalMessage, severity === 'warning' ? 'warning' : 'error', {
      ...safeContext,
      service,
      flow,
      errorCode,
    });
  }

  // 2. Fallback/espelho próprio no Supabase (funciona mesmo com AdBlocker)
  const shouldSendRemote = isProdEnv() || getEnv('VITE_ENABLE_REMOTE_ERROR_LOGS') === 'true';
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

  if (!shouldSendRemote || !supabaseUrl || !supabaseAnonKey || typeof fetch !== 'function') {
    return;
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/log-client-error`;
  const payload = {
    service,
    severity,
    message: finalMessage.slice(0, 2000),
    errorCode: errorCode ? String(errorCode).slice(0, 100) : null,
    stack: error instanceof Error && error.stack ? error.stack.slice(0, 4000) : null,
    context: safeContext,
    userId,
    url: window.location?.href?.slice(0, 500) || null,
  };

  try {
    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Nunca quebrar o fluxo do usuário por falha no envio de telemetria
    });
  } catch {
    // ignore
  }
}

