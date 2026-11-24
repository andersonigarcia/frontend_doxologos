// Analytics and Performance Monitoring Utilities
// Now exclusively using Google Ecosystem (GTM/GA4/GSC) via DataLayer

const ATTRIBUTION_STORAGE_KEY = 'doxologos_attribution';
const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
  'gclid'
];

class AnalyticsManager {
  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.gaId = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-FSXFYQVCEC';
    this.sessionId = this.generateSessionId();
    this.pageLoadTime = performance.now();
    this.hasTrackedInitialPageView = false;
    this.hasTrackedInitiateCheckout = false;

    if (typeof window !== 'undefined') {
      this.captureAttributionParams();
    }

    if (this.isProduction) {
      this.initializeAnalytics();
      this.setupPerformanceMonitoring();
    }
  }

  captureAttributionParams() {
    try {
      const search = window.location?.search || '';
      if (!search) return;
      const params = new URLSearchParams(search);
      const captured = {};
      let hasNewParam = false;

      for (const key of ATTRIBUTION_KEYS) {
        const val = params.get(key);
        if (val) {
          captured[key] = val.slice(0, 120);
          hasNewParam = true;
        }
      }

      if (hasNewParam) {
        const existing = this.getAttributionParams();
        sessionStorage.setItem(
          ATTRIBUTION_STORAGE_KEY,
          JSON.stringify({ ...existing, ...captured })
        );
      }
    } catch {
      // ignore storage errors in restricted environments
    }
  }

  getAttributionParams() {
    try {
      const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  initializeAnalytics() {
    // Ensure gtag is available
    if (typeof gtag !== 'function') {
      console.warn('Google Analytics not loaded');
      return;
    }

    // Configure enhanced ecommerce for booking tracking
    gtag('config', this.gaId, {
      custom_map: {
        'custom_parameter_1': 'clinic_page',
        'custom_parameter_2': 'user_type'
      },
      send_page_view: false // We'll send manually for SPA
    });
  }

  setupPerformanceMonitoring() {
    // Monitor navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navTiming = performance.getEntriesByType('navigation')[0];
        if (navTiming) {
          this.trackPerformanceMetric('page_load_time', navTiming.loadEventEnd - navTiming.fetchStart);
          this.trackPerformanceMetric('dom_content_loaded', navTiming.domContentLoadedEventEnd - navTiming.fetchStart);
          this.trackPerformanceMetric('first_contentful_paint', this.getFCP());
        }
      }, 100);
    });

    // Monitor JavaScript errors
    this.setupErrorTracking();
  }

  getFCP() {
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    return fcpEntry ? fcpEntry.startTime : 0;
  }


  setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackEvent('javascript_error', {
        event_category: 'Error',
        event_label: event.message,
        value: 1,
        custom_parameter_1: event.filename,
        custom_parameter_2: event.lineno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('promise_rejection', {
        event_category: 'Error',
        event_label: event.reason?.message || 'Unknown promise rejection',
        value: 1
      });
    });
  }

  isInternalRoute(path = window.location?.pathname || '') {
    return /^\/(admin|profissional|faturamento-mensal|gestao|criar-usuarios)/i.test(path);
  }

  isTestMode() {
    try {
      if (typeof window === 'undefined') return false;
      const search = window.location?.search || '';
      if (search.includes('analytics_test=true') || search.includes('traffic_type=test') || search.includes('test_mode=true')) {
        return true;
      }
      if (localStorage.getItem('analytics_test_mode') === 'true') {
        return true;
      }
    } catch {
      // ignore errors
    }
    return false;
  }

  isDebugMode() {
    try {
      if (typeof window === 'undefined') return false;
      const search = window.location?.search || '';
      if (search.includes('analytics_debug=true') || search.includes('debug_mode=true')) {
        return true;
      }
      if (localStorage.getItem('analytics_debug') === 'true') {
        return true;
      }
    } catch {
      // ignore errors
    }
    return false;
  }

  // Core tracking methods
  trackPageView(pageName, pageTitle = document.title) {
    if (!this.isProduction) return;

    const currentPath = pageName || window.location?.pathname || '/';

    // 1. Filtrar rotas administrativas internas (evita poluir relatórios de marketing/funil)
    if (this.isInternalRoute(currentPath)) {
      return;
    }

    // 2. Desduplicação de pageview no SPA (evita disparos redundantes em transições rápidas)
    const now = Date.now();
    if (this.lastTrackedPage === currentPath && (now - (this.lastTrackedAt || 0)) < 1500) {
      return;
    }
    this.lastTrackedPage = currentPath;
    this.lastTrackedAt = now;

    const userType = this.getUserType();
    const testMode = this.isTestMode();
    const debugMode = this.isDebugMode();

    // 3. DataLayer Push for GTM (Best Practice)
    const attribution = this.getAttributionParams();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'page_view',
      page_path: currentPath,
      page_title: pageTitle,
      page_name: pageName,
      user_type: userType,
      ...attribution,
      ...(testMode ? { test_mode: 'true', traffic_type: 'test' } : {}),
      ...(debugMode ? { debug_mode: true } : {})
    });

    // 4. Direct gtag (explicit page_view event required in SPA since send_page_view: false is configured)
    if (typeof gtag === 'function') {
      const origin = window.location?.origin || 'https://doxologos.com.br';
      const fullUrl = origin + currentPath;
      gtag('config', this.gaId, {
        page_title: pageTitle,
        page_location: fullUrl,
        custom_parameter_1: pageName,
        custom_parameter_2: userType,
        send_page_view: false
      });
      gtag('event', 'page_view', {
        page_title: pageTitle,
        page_location: fullUrl,
        page_path: currentPath,
        user_type: userType,
        ...(userType === 'staff_internal' && !testMode ? { traffic_type: 'internal' } : {}),
        ...(testMode ? { traffic_type: 'test', test_mode: 'true' } : {}),
        ...(debugMode ? { debug_mode: true } : {})
      });
    }

    // 5. Meta Pixel PageView for SPA transitions (initial load already fires in index.html)
    try {
      if (this.hasTrackedInitialPageView && typeof fbq === 'function' && userType !== 'staff_internal') {
        fbq('track', 'PageView');
      }
      this.hasTrackedInitialPageView = true;
    } catch {
      // ignore pixel errors
    }
  }

  trackEvent(eventName, parameters = {}) {
    if (!this.isProduction) return;

    // 1. Não rastrear em rotas internas/administrativas
    if (this.isInternalRoute()) {
      return;
    }

    // 2. Filtrar ruído de telemetria e performance técnica para não esgotar cotas de eventos do GA4 nem poluir relatórios
    const isTelemetry = [
      'performance_',
      'web_vital',
      'web_vitals',
      'high_memory_usage',
      'route_change_time',
      'component_render',
      'console_error',
      'console_warning',
      'javascript_error',
      'promise_rejection'
    ].some((prefix) => eventName.startsWith(prefix) || eventName === prefix);

    if (isTelemetry) {
      return;
    }

    const userType = this.getUserType();
    const testMode = this.isTestMode();
    const debugMode = this.isDebugMode();
    const attribution = this.getAttributionParams();

    const enrichedParams = {
      ...attribution,
      ...parameters,
      ...(userType === 'staff_internal' && !testMode ? { traffic_type: 'internal' } : {}),
      ...(testMode ? { traffic_type: 'test', test_mode: 'true' } : {}),
      ...(debugMode ? { debug_mode: true } : {})
    };

    // 1. DataLayer Push for GTM (Best Practice)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...enrichedParams
    });

    // 2. Direct gtag fallback (com transport_type beacon para resiliência a transições de tela)
    if (typeof gtag === 'function') {
      // Não enviar 'session_id' (parâmetro interno do gtag/GA4, espera valor numérico) nem 'timestamp'
      gtag('event', eventName, {
        client_session_ref: this.sessionId,
        transport_type: 'beacon',
        ...enrichedParams
      });
    }
  }

  trackPerformanceMetric(metricName, value) {
    if (this.isInternalRoute()) return;

    this.trackEvent('performance_metric', {
      event_category: 'Performance',
      event_label: metricName,
      value: Math.round(value)
    });
  }

  // Business-specific tracking
  trackBookingStep(step, professionalId, serviceId, extraParams = {}) {
    const stepNumber = Number(step) || 1;

    // Deduplicação de step consecutivo para evitar disparos duplicados no mesmo intervalo
    const now = Date.now();
    if (this.lastTrackedStep === stepNumber && (now - (this.lastTrackedStepAt || 0)) < 1500) {
      return;
    }
    this.lastTrackedStep = stepNumber;
    this.lastTrackedStepAt = now;

    const stepNames = {
      1: 'booking_step_1_service',
      2: 'booking_step_2_professional',
      3: 'booking_step_3_datetime',
      4: 'booking_step_4_patient_data',
      5: 'booking_step_5_summary'
    };

    const stepPaths = {
      1: '/agendamento/1-servico',
      2: '/agendamento/2-profissional',
      3: '/agendamento/3-data-hora',
      4: '/agendamento/4-dados-paciente',
      5: '/agendamento/5-resumo-pagamento'
    };

    const stepTitles = {
      1: 'Agendamento - Seleção de Serviço | Doxologos',
      2: 'Agendamento - Escolha do Profissional | Doxologos',
      3: 'Agendamento - Data e Horário | Doxologos',
      4: 'Agendamento - Dados do Paciente | Doxologos',
      5: 'Agendamento - Resumo do Agendamento | Doxologos'
    };

    const specificEventName = stepNames[stepNumber] || `booking_step_${stepNumber}`;
    const virtualPath = stepPaths[stepNumber];
    const pageTitle = stepTitles[stepNumber] || `Agendamento - Etapa ${stepNumber} | Doxologos`;

    // 1. Disparar evento canônico específico da etapa (ideal para funil direto no GA4 sem dimensões customizadas)
    this.trackEvent(specificEventName, {
      event_category: 'Booking Flow',
      step_number: stepNumber,
      step_name: specificEventName,
      professional_id: professionalId,
      service_id: serviceId,
      ...extraParams
    });

    // 2. Disparar evento genérico para manter retrocompatibilidade com triggers legados
    this.trackEvent('booking_step', {
      event_category: 'Booking Flow',
      event_label: `Step ${stepNumber}`,
      step_number: stepNumber,
      custom_parameter_1: professionalId,
      custom_parameter_2: serviceId,
      ...extraParams
    });

    // 3. Disparar Virtual Pageview (registra nas páginas em tempo real do GA4)
    if (virtualPath) {
      this.trackPageView(virtualPath, pageTitle);
    }

    // 4. Meta Pixel InitiateCheckout apenas quando há intenção real (Etapa 4+ Dados/Resumo)
    this.trackMetaInitiateCheckout(stepNumber, serviceId);
  }

  trackMetaInitiateCheckout(stepNumber, serviceId) {
    try {
      if (this.hasTrackedInitiateCheckout || Number(stepNumber) < 4) return;
      if (typeof fbq === 'function' && this.getUserType() !== 'staff_internal') {
        fbq('track', 'InitiateCheckout', {
          content_ids: serviceId ? [String(serviceId)] : undefined,
          content_type: 'product'
        });
        this.hasTrackedInitiateCheckout = true;
      }
    } catch (pixelError) {
      console.warn('Meta Pixel error (non-critical):', pixelError);
    }
  }

  trackBookingCompleted(bookingId, professionalId, serviceId, amount, paymentMethod = 'pix') {
    if (!bookingId) return;

    // Deduplicação para garantir que cada reserva/pacote dispare apenas uma conversão por sessão
    if (!this.completedBookings) {
      this.completedBookings = new Set();
    }
    const dedupeKey = String(bookingId);
    if (this.completedBookings.has(dedupeKey)) {
      return;
    }
    this.completedBookings.add(dedupeKey);

    const safeAmount = Number(amount) || 0;
    const safeMethod = String(paymentMethod || 'pix').toLowerCase();
    const safeService = String(serviceId || 'consulta');
    const safeProfessional = String(professionalId || 'clinic');

    // GA4 Custom Event (retrocompatibilidade com funil legado)
    this.trackEvent('booking_completed', {
      event_category: 'Conversion',
      booking_id: dedupeKey,
      transaction_id: dedupeKey,
      payment_method: safeMethod,
      service_id: safeService,
      professional_id: safeProfessional,
      value: safeAmount,
      currency: 'BRL'
    });

    try {
      this.trackFunnelStep('booking', 6, {
        step_name: 'booking_completed',
        booking_id: dedupeKey,
        payment_method: safeMethod,
        value: safeAmount
      });
    } catch (funnelErr) {
      console.warn('trackFunnelStep 6 error (non-critical):', funnelErr);
    }

    // Enhanced ecommerce purchase event (Etapa 6 canônica do Funil GA4)
    if (typeof gtag === 'function') {
      gtag('event', 'purchase', {
        transaction_id: dedupeKey,
        booking_id: dedupeKey,
        payment_method: safeMethod,
        service_id: safeService,
        professional_id: safeProfessional,
        value: safeAmount,
        currency: 'BRL',
        transport_type: 'beacon',
        items: [{
          item_id: safeService,
          item_name: 'Consulta Psicológica',
          item_category: 'Healthcare',
          quantity: 1,
          price: safeAmount
        }]
      });
    }

    // Meta Pixel Purchase Event (isolado: falha do pixel não pode impedir a conversão do Google Ads)
    try {
      if (typeof fbq === 'function') {
        fbq('track', 'Purchase', {
          value: safeAmount,
          currency: 'BRL',
          content_name: 'Consulta Psicológica',
          content_ids: [String(serviceId || 'consulta')],
          content_type: 'product',
          order_id: dedupeKey
        });
      }
    } catch (pixelError) {
      console.warn('Meta Pixel error (non-critical):', pixelError);
    }

    // Google Ads Conversion Event
    if (typeof gtag === 'function') {
      gtag('event', 'conversion', {
        'send_to': 'AW-18137070850/X0LkCPvR2qYcEIL6tshD',
        'value': safeAmount || 1.0,
        'currency': 'BRL',
        'transaction_id': dedupeKey,
        'new_customer': this.getUserType() === 'new_visitor'
      });
    }
  }

  trackTestimonialSubmitted(rating) {
    this.trackEvent('testimonial_submitted', {
      event_category: 'Engagement',
      event_label: 'User Testimonial',
      value: rating
    });
  }

  trackVideoInteraction(videoId, action) {
    this.trackEvent('video_interaction', {
      event_category: 'Video',
      event_label: action,
      custom_parameter_1: videoId
    });
  }

  trackFormAbandonment(formName, fieldName) {
    this.trackEvent('form_abandonment', {
      event_category: 'User Experience',
      event_label: formName,
      custom_parameter_1: fieldName
    });
  }

  // User segmentation
  getUserType() {
    try {
      const authRaw = localStorage.getItem('doxologos-auth');
      if (authRaw) {
        const parsed = JSON.parse(authRaw);
        const role = parsed?.user?.user_metadata?.role || parsed?.user?.role;
        if (role === 'admin' || role === 'professional') {
          return 'staff_internal';
        }
        return 'returning_patient';
      }
    } catch {
      // ignore parsing errors
    }

    return 'new_visitor';
  }

  // Performance monitoring methods
  measureFunction(fn, functionName) {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    if (duration > 100) { // Track slow functions (>100ms)
      this.trackPerformanceMetric(`function_${functionName}`, duration);
    }

    return result;
  }

  async measureAsyncFunction(fn, functionName) {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    if (duration > 500) { // Track slow async functions (>500ms)
      this.trackPerformanceMetric(`async_function_${functionName}`, duration);
    }

    return result;
  }

  // Conversion funnel tracking
  trackFunnelStep(funnelName, step, metadata = {}) {
    this.trackEvent('funnel_step', {
      event_category: 'Conversion Funnel',
      event_label: `${funnelName} - Step ${step}`,
      ...metadata
    });

    if (funnelName.toLowerCase().includes('booking') && Number(step) >= 4) {
      this.trackMetaInitiateCheckout(step, metadata?.service_id);
    }
  }

  // A/B Testing support
  trackExperiment(experimentId, variantId) {
    this.trackEvent('experiment_impression', {
      event_category: 'A/B Testing',
      event_label: experimentId,
      custom_parameter_1: variantId
    });
  }
}

// Create global instance
const analytics = new AnalyticsManager();

export default analytics;