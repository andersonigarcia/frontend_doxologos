// Analytics and Performance Monitoring Utilities
class AnalyticsManager {
  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.gaId = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';
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

    // Monitor resource loading
    this.monitorResourceTiming();
    
    // Monitor JavaScript errors
    this.setupErrorTracking();
  }

  getFCP() {
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    return fcpEntry ? fcpEntry.startTime : 0;
  }

  monitorResourceTiming() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('.js') || entry.name.includes('.css')) {
          const loadTime = entry.responseEnd - entry.requestStart;
          if (loadTime > 1000) { // Track slow resources (>1s)
            this.trackEvent('performance_issue', {
              event_category: 'Resource Loading',
              event_label: entry.name,
              value: Math.round(loadTime)
            });
          }
        }
      }
    });
    
    observer.observe({type: 'resource', buffered: true});
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

  // Core tracking methods
  trackPageView(pageName, pageTitle = document.title) {
    if (!this.isProduction || typeof gtag !== 'function') return;
    
    gtag('config', this.gaId, {
      page_title: pageTitle,
      page_location: window.location.href,
      custom_parameter_1: pageName,
      custom_parameter_2: this.getUserType()
    });
  }

  trackEvent(eventName, parameters = {}) {
    if (!this.isProduction || typeof gtag !== 'function') return;
    
    gtag('event', eventName, {
      session_id: this.sessionId,
      timestamp: Date.now(),
      ...parameters
    });
  }

  trackPerformanceMetric(metricName, value) {
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
    // Determine user type based on behavior/authentication
    const isAuthenticated = localStorage.getItem('supabase.auth.token');
    return isAuthenticated ? 'returning_user' : 'new_visitor';
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