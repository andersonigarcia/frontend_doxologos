/**
 * Módulo de Observabilidade Real-User (RUM) & Resiliência de Erros (Onda 4)
 * Captura Core Web Vitals, latência de chamadas à API (Supabase / Mercado Pago)
 * e anomalias de execução do cliente.
 */

import { reportOperationalError } from './sentry';

const IGNORED_TELEMETRY_URLS = [
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'analytics.google.com',
  'stats.g.doubleclick.net',
  '/gtag/',
  '/collect',
  '/r/collect',
  'sentry.io',
  '/functions/v1/log-client-error',
];

function shouldIgnoreTelemetryUrl(url) {
  if (!url) return true;
  const urlString = String(url);
  return IGNORED_TELEMETRY_URLS.some((ignored) => urlString.includes(ignored));
}

class RumMonitoringService {
  constructor() {
    this.initialized = false;
    this.apiErrorListeners = [];
    this.metrics = {
      webVitals: {
        LCP: null,
        FID: null,
        CLS: null,
        FCP: null,
        TTFB: null,
      },
      apiCalls: [],
      errors: [],
      lastHealthCheck: null,
    };

    this.thresholds = {
      LCP_MAX_MS: 2500,
      API_LATENCY_WARN_MS: 3000,
      ERROR_RATE_WARN_PERCENT: 5,
    };
  }

  /**
   * Inicializa o monitoramento RUM no navegador
   */
  init({ enableNetworkTracking = true } = {}) {
    if (this.initialized || typeof window === 'undefined') {
      return this;
    }

    this.initialized = true;
    this.captureNavigationTiming();
    this.capturePerformanceObservers();

    if (enableNetworkTracking) {
      this.attachFetchInterceptor();
    }

    this.attachGlobalErrorHandlers();
    return this;
  }

  captureNavigationTiming() {
    try {
      if (typeof window !== 'undefined' && window.performance && window.performance.getEntriesByType) {
        const navEntries = window.performance.getEntriesByType('navigation');
        if (navEntries && navEntries.length > 0) {
          const nav = navEntries[0];
          this.metrics.webVitals.TTFB = Math.round(nav.responseStart - nav.requestStart);
        }
      }
    } catch {
      // Ignorar silenciosamente em ambientes restritos
    }
  }

  capturePerformanceObservers() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Paint metrics (FCP)
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.webVitals.FCP = Math.round(entry.startTime);
          }
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });

      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.metrics.webVitals.LCP = Math.round(lastEntry.startTime);
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            this.metrics.webVitals.CLS = Number(clsValue.toFixed(4));
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch {
      // PerformanceObserver pode falhar em testes ou browsers legados
    }
  }

  attachFetchInterceptor() {
    if (typeof window === 'undefined' || !window.fetch) return;

    const originalFetch = window.fetch;
    const self = this;

    window.fetch = async function (...args) {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
      const method = args[1]?.method || 'GET';

      try {
        const response = await originalFetch.apply(this, args);
        const duration = Math.round(performance.now() - startTime);

        if (!shouldIgnoreTelemetryUrl(url)) {
          self.recordApiMetric({
            url,
            method,
            durationMs: duration,
            status: response.status,
            ok: response.ok,
          });

          if (!response.ok) {
            self.notifyApiErrorListeners({
              url,
              method,
              status: response.status,
              statusText: response.statusText,
              durationMs: duration,
            });

            if (response.status >= 500 || response.status === 429) {
              const isPayment = url.includes('mp-') || url.includes('mercadopago');
              const isAuth = url.includes('/auth/v1/');
              reportOperationalError({
                service: isPayment ? 'payment_api' : isAuth ? 'supabase_auth' : 'api_fetch',
                flow: isPayment ? 'payment' : isAuth ? 'auth' : 'network',
                severity: isPayment && response.status >= 500 ? 'critical' : 'error',
                message: `HTTP ${response.status} em ${method} ${url.split('?')[0]}`,
                errorCode: String(response.status),
                context: { method, status: response.status, durationMs: duration },
              });
            }
          }
        }

        return response;
      } catch (err) {
        const duration = Math.round(performance.now() - startTime);
        if (!shouldIgnoreTelemetryUrl(url)) {
          self.recordApiMetric({
            url,
            method,
            durationMs: duration,
            status: 0,
            ok: false,
            error: err.message,
          });
          self.notifyApiErrorListeners({
            url,
            method,
            status: 0,
            error: err.message,
            durationMs: duration,
          });
        }
        throw err;
      }
    };
  }

  addApiErrorListener(listener) {
    if (typeof listener === 'function') {
      this.apiErrorListeners.push(listener);
      return () => {
        this.apiErrorListeners = this.apiErrorListeners.filter((fn) => fn !== listener);
      };
    }
    return () => {};
  }

  notifyApiErrorListeners(errorMetric) {
    this.apiErrorListeners.forEach((fn) => {
      try {
        fn(errorMetric);
      } catch {
        // ignore listener errors
      }
    });
  }

  attachGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.recordError({
        message: event.message,
        source: event.filename,
        lineno: event.lineno,
        type: 'uncaught_error',
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        message: event.reason?.message || String(event.reason),
        type: 'unhandled_promise_rejection',
      });
    });
  }

  recordApiMetric(metric) {
    if (!metric) return;
    this.metrics.apiCalls.push({
      ...metric,
      timestamp: Date.now(),
    });

    // Manter buffer circular de até 100 chamadas
    if (this.metrics.apiCalls.length > 100) {
      this.metrics.apiCalls.shift();
    }
  }

  recordError(errorInfo) {
    if (!errorInfo) return;
    this.metrics.errors.push({
      ...errorInfo,
      timestamp: Date.now(),
    });

    if (this.metrics.errors.length > 50) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Avalia a saúde operacional do cliente e gera alertas proativos
   * @returns {Object} Resumo de integridade e alertas
   */
  checkSystemHealth() {
    const alerts = [];
    const totalCalls = this.metrics.apiCalls.length;
    const failedCalls = this.metrics.apiCalls.filter((c) => !c.ok).length;
    const slowCalls = this.metrics.apiCalls.filter((c) => c.durationMs > this.thresholds.API_LATENCY_WARN_MS);

    let errorRate = 0;
    if (totalCalls > 0) {
      errorRate = (failedCalls / totalCalls) * 100;
      if (errorRate >= this.thresholds.ERROR_RATE_WARN_PERCENT) {
        alerts.push(`Taxa de erro na API elevada: ${errorRate.toFixed(1)}% (${failedCalls}/${totalCalls})`);
      }
    }

    if (slowCalls.length > 0) {
      alerts.push(`${slowCalls.length} chamada(s) de API com latência superior a ${this.thresholds.API_LATENCY_WARN_MS}ms`);
    }

    if (this.metrics.webVitals.LCP && this.metrics.webVitals.LCP > this.thresholds.LCP_MAX_MS) {
      alerts.push(`LCP degradado: ${this.metrics.webVitals.LCP}ms (meta: < ${this.thresholds.LCP_MAX_MS}ms)`);
    }

    const isHealthy = alerts.length === 0;
    const healthReport = {
      healthy: isHealthy,
      score: isHealthy ? 100 : Math.max(0, 100 - alerts.length * 25),
      alerts,
      metrics: {
        webVitals: { ...this.metrics.webVitals },
        totalApiCalls: totalCalls,
        failedApiCalls: failedCalls,
        slowApiCalls: slowCalls.length,
        totalErrors: this.metrics.errors.length,
      },
      evaluatedAt: new Date().toISOString(),
    };

    this.metrics.lastHealthCheck = healthReport;
    return healthReport;
  }

  addHealthAlertListener(listener) {
    if (typeof listener === 'function') {
      this.healthAlertListeners = this.healthAlertListeners || [];
      this.healthAlertListeners.push(listener);
    }
  }

  notifyHealthAlerts(alerts) {
    if (this.healthAlertListeners && alerts.length > 0) {
      this.healthAlertListeners.forEach(fn => {
        try { fn(alerts); } catch {}
      });
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset() {
    this.metrics.apiCalls = [];
    this.metrics.errors = [];
    this.metrics.lastHealthCheck = null;
    this.metrics.webVitals = {
      LCP: null,
      FID: null,
      CLS: null,
      FCP: null,
      TTFB: null,
    };
  }
}

export const rumMonitor = new RumMonitoringService();
export const initRumMonitoring = (options) => rumMonitor.init(options);
export const recordMetric = (name, value, unit) => rumMonitor.recordMetric(name, value, unit);
export const trackApiLatency = (endpoint, durationMs, status) => rumMonitor.trackApiCall(endpoint, durationMs, status);
export const getRumHealthScore = () => rumMonitor.evaluateHealth();
export const addHealthAlertListener = (listener) => rumMonitor.addHealthAlertListener(listener);

export default rumMonitor;
