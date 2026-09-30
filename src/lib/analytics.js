// Analytics and Performance Monitoring Utilities
// Now exclusively using Google Ecosystem (GTM/GA4/GSC) via DataLayer

class AnalyticsManager {
  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.gaId = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-FSXFYQVCEC';
    this.sessionId = this.generateSessionId();
    this.pageLoadTime = performance.now();

    if (this.isProduction) {
      this.initializeAnalytics();
      this.setupPerformanceMonitoring();
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

  isInternalRoute(path = window.location.pathname) {
    return /^\/(admin|profissional|faturamento-mensal|gestao|criar-usuarios)/i.test(path);
  }

  // Core tracking methods
  trackPageView(pageName, pageTitle = document.title) {
    if (!this.isProduction) return;

    const currentPath = pageName || window.location.pathname;

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

    // 3. DataLayer Push for GTM (Best Practice)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'page_view',
      page_path: currentPath,
      page_title: pageTitle,
      page_name: pageName,
      user_type: userType
    });

    // 4. Direct gtag fallback
    if (typeof gtag === 'function') {
      gtag('config', this.gaId, {
        page_title: pageTitle,
        page_location: window.location.origin + currentPath,
        custom_parameter_1: pageName,
        custom_parameter_2: userType
      });
    }
  }

  trackEvent(eventName, parameters = {}) {
    if (!this.isProduction) return;

    // Se estiver em rota interna, não poluir GA4 com métricas de performance ou telemetria genérica
    const isInternal = this.isInternalRoute();
    const isTelemetry = ['performance_metric', 'web_vital', 'high_memory_usage', 'route_change_time', 'component_render'].some(
      (prefix) => eventName.startsWith(prefix)
    );
    if (isInternal && isTelemetry) {
      return;
    }

    const userType = this.getUserType();
    const enrichedParams = {
      ...parameters,
      ...(userType === 'staff_internal' ? { traffic_type: 'internal' } : {})
    };

    // 1. DataLayer Push for GTM (Best Practice)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: eventName,
      ...enrichedParams
    });

    // 2. Direct gtag fallback
    if (typeof gtag === 'function') {
      gtag('event', eventName, {
        session_id: this.sessionId,
        timestamp: Date.now(),
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
  trackBookingStep(step, professionalId, serviceId) {
    this.trackEvent('booking_step', {
      event_category: 'Booking Flow',
      event_label: `Step ${step}`,
      custom_parameter_1: professionalId,
      custom_parameter_2: serviceId
    });
  }

  trackBookingCompleted(bookingId, professionalId, serviceId, amount) {
    this.trackEvent('booking_completed', {
      event_category: 'Conversion',
      transaction_id: bookingId,
      value: amount,
      currency: 'BRL',
      custom_parameter_1: professionalId,
      custom_parameter_2: serviceId
    });

    // Enhanced ecommerce purchase event
    gtag('event', 'purchase', {
      transaction_id: bookingId,
      value: amount,
      currency: 'BRL',
      items: [{
        item_id: serviceId,
        item_name: 'Consulta Psicológica',
        category: 'Healthcare',
        quantity: 1,
        price: amount
      }]
    });

    // Meta Pixel Purchase Event
    if (typeof fbq === 'function') {
      fbq('track', 'Purchase', {
        value: amount,
        currency: 'BRL',
        content_name: 'Consulta Psicológica',
        content_ids: [serviceId],
        content_type: 'product',
        order_id: bookingId
      });
    }

    // Google Ads Conversion Event
    if (typeof gtag === 'function') {
      gtag('event', 'conversion', {
        'send_to': 'AW-18137070850/X0LkCPvR2qYcEIL6tshD',
        'value': amount || 1.0,
        'currency': 'BRL',
        'transaction_id': bookingId,
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

    // Notify Meta Pixel of Checkout Initiation if it's the beginning of a booking process
    if (typeof fbq === 'function') {
      if (funnelName.toLowerCase().includes('booking') && step === 1) {
        fbq('track', 'InitiateCheckout');
      }
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