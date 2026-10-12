import { rumMonitor } from '../rumMonitoring';

describe('Real-User Monitoring (RUM) & Proactive Alerting (Onda 4)', () => {
  beforeEach(() => {
    rumMonitor.reset();
  });

  it('deve inicializar com métricas limpas e sistema saudável', () => {
    const health = rumMonitor.checkSystemHealth();
    expect(health.healthy).toBe(true);
    expect(health.score).toBe(100);
    expect(health.alerts).toHaveLength(0);
  });

  it('deve registrar chamadas de API e manter no buffer', () => {
    rumMonitor.recordApiMetric({
      url: '/rest/v1/bookings',
      method: 'GET',
      durationMs: 120,
      status: 200,
      ok: true
    });

    const metrics = rumMonitor.getMetrics();
    expect(metrics.apiCalls).toHaveLength(1);
    expect(metrics.apiCalls[0].url).toBe('/rest/v1/bookings');
    expect(metrics.apiCalls[0].ok).toBe(true);
  });

  it('deve gerar alerta quando a taxa de falha de chamadas de API exceder o threshold', () => {
    // 1 chamada de sucesso e 1 de erro = 50% de erro (acima de 5%)
    rumMonitor.recordApiMetric({
      url: '/rest/v1/bookings',
      method: 'GET',
      durationMs: 80,
      status: 200,
      ok: true
    });

    rumMonitor.recordApiMetric({
      url: '/rest/v1/payments',
      method: 'POST',
      durationMs: 95,
      status: 500,
      ok: false
    });

    const health = rumMonitor.checkSystemHealth();
    expect(health.healthy).toBe(false);
    expect(health.alerts.some(a => a.includes('Taxa de erro na API elevada'))).toBe(true);
    expect(health.score).toBeLessThan(100);
  });

  it('deve gerar alerta quando houver chamadas de API lentas acima de 3000ms', () => {
    rumMonitor.recordApiMetric({
      url: '/functions/v1/mp-webhook',
      method: 'POST',
      durationMs: 3500,
      status: 200,
      ok: true
    });

    const health = rumMonitor.checkSystemHealth();
    expect(health.healthy).toBe(false);
    expect(health.alerts.some(a => a.includes('latência superior a 3000ms'))).toBe(true);
  });

  it('deve registrar erros de cliente de forma estruturada', () => {
    rumMonitor.recordError({
      message: 'Network timeout',
      type: 'uncaught_error'
    });

    const metrics = rumMonitor.getMetrics();
    expect(metrics.errors).toHaveLength(1);
    expect(metrics.errors[0].message).toBe('Network timeout');
  });
});
