import analytics from '../analytics';

describe('Funnel Analytics & Virtual Pageviews Suite', () => {
  let originalGtag;
  let originalDataLayer;
  let originalLocation;
  let capturedEvents;
  let capturedPageViews;

  beforeEach(() => {
    capturedEvents = [];
    capturedPageViews = [];

    // Reset deduplication state in analytics singleton
    analytics.lastTrackedStep = null;
    analytics.lastTrackedStepAt = 0;
    analytics.lastTrackedPage = null;
    analytics.lastTrackedAt = 0;
    analytics.isProduction = true; // Ensure production mode is simulated

    // Mock gtag and dataLayer
    originalGtag = global.gtag;
    originalDataLayer = global.dataLayer;
    global.dataLayer = [];

    global.gtag = jest.fn((action, eventName, params) => {
      if (action === 'event') {
        if (eventName === 'page_view') {
          capturedPageViews.push(params);
        } else {
          capturedEvents.push({ eventName, params });
        }
      }
    });

    // Mock window.location
    delete window.location;
    window.location = {
      pathname: '/agendamento',
      origin: 'https://doxologos.com.br',
      search: ''
    };

    // Clean localStorage
    localStorage.clear();
  });

  afterEach(() => {
    global.gtag = originalGtag;
    global.dataLayer = originalDataLayer;
  });

  it('deve disparar evento canônico, evento legado e virtual pageview para o Step 1 (Serviço)', () => {
    analytics.trackBookingStep(1, 'prof_123', 'serv_psico');

    // 1. Verificar evento canônico
    const step1Event = capturedEvents.find(e => e.eventName === 'booking_step_1_service');
    expect(step1Event).toBeDefined();
    expect(step1Event.params.step_number).toBe(1);
    expect(step1Event.params.professional_id).toBe('prof_123');
    expect(step1Event.params.service_id).toBe('serv_psico');

    // 2. Verificar evento legado de compatibilidade
    const legacyEvent = capturedEvents.find(e => e.eventName === 'booking_step');
    expect(legacyEvent).toBeDefined();
    expect(legacyEvent.params.step_number).toBe(1);

    // 3. Verificar Virtual Pageview
    const pv = capturedPageViews.find(p => p.page_path === '/agendamento/1-servico');
    expect(pv).toBeDefined();
    expect(pv.page_title).toContain('Seleção de Serviço');
  });

  it('deve disparar evento canônico e virtual pageview para todas as 5 etapas', () => {
    const steps = [
      { step: 1, event: 'booking_step_1_service', path: '/agendamento/1-servico' },
      { step: 2, event: 'booking_step_2_professional', path: '/agendamento/2-profissional' },
      { step: 3, event: 'booking_step_3_datetime', path: '/agendamento/3-data-hora' },
      { step: 4, event: 'booking_step_4_patient_data', path: '/agendamento/4-dados-paciente' },
      { step: 5, event: 'booking_step_5_summary', path: '/agendamento/5-resumo-pagamento' },
    ];

    steps.forEach(({ step, event, path }) => {
      // Avança etapa
      analytics.trackBookingStep(step, 'prof_1', 'serv_1');

      const foundEvent = capturedEvents.find(e => e.eventName === event);
      expect(foundEvent).toBeDefined();

      const foundPv = capturedPageViews.find(p => p.page_path === path);
      expect(foundPv).toBeDefined();
    });
  });

  it('deve deduplicar chamadas consecutivas do mesmo step dentro da janela de 1500ms', () => {
    analytics.trackBookingStep(2, 'prof_1', 'serv_1');
    const countAfterFirst = capturedEvents.filter(e => e.eventName === 'booking_step_2_professional').length;
    expect(countAfterFirst).toBe(1);

    // Segunda chamada imediata (ex: clique duplo ou re-render imediato)
    analytics.trackBookingStep(2, 'prof_1', 'serv_1');
    const countAfterSecond = capturedEvents.filter(e => e.eventName === 'booking_step_2_professional').length;
    expect(countAfterSecond).toBe(1); // Não duplicou!
  });

  it('deve permitir avanço para o próximo step mesmo dentro de 1500ms', () => {
    analytics.trackBookingStep(1, 'prof_1', 'serv_1');
    expect(capturedEvents.filter(e => e.eventName === 'booking_step_1_service').length).toBe(1);

    // Usuário avança imediatamente para o step 2
    analytics.trackBookingStep(2, 'prof_1', 'serv_1');
    expect(capturedEvents.filter(e => e.eventName === 'booking_step_2_professional').length).toBe(1);
  });

  it('deve aplicar traffic_type internal para staff logado por padrão', () => {
    localStorage.setItem('doxologos-auth', JSON.stringify({
      user: { role: 'admin' }
    }));

    analytics.trackEvent('test_event', { key: 'value' });

    const event = capturedEvents.find(e => e.eventName === 'test_event');
    expect(event).toBeDefined();
    expect(event.params.traffic_type).toBe('internal');
  });

  it('deve neutralizar traffic_type internal quando analytics_test=true estiver presente no search', () => {
    localStorage.setItem('doxologos-auth', JSON.stringify({
      user: { role: 'admin' }
    }));
    window.location.search = '?analytics_test=true';

    analytics.trackEvent('test_event_bypass', { key: 'value' });

    const event = capturedEvents.find(e => e.eventName === 'test_event_bypass');
    expect(event).toBeDefined();
    // traffic_type NÃO deve ser 'internal' para não ser descartado pelo filtro de tráfego interno do GA4
    expect(event.params.traffic_type).not.toBe('internal');
    expect(event.params.traffic_type).toBe('test');
    expect(event.params.test_mode).toBe('true');
  });

  it('deve incluir debug_mode: true quando analytics_debug=true estiver ativo', () => {
    window.location.search = '?analytics_debug=true';

    analytics.trackEvent('test_event_debug', { key: 'value' });

    const event = capturedEvents.find(e => e.eventName === 'test_event_debug');
    expect(event).toBeDefined();
    expect(event.params.debug_mode).toBe(true);

    analytics.trackPageView('/agendamento/1-servico', 'Teste');
    const pv = capturedPageViews.find(p => p.page_path === '/agendamento/1-servico');
    expect(pv).toBeDefined();
    expect(pv.debug_mode).toBe(true);
  });
});
