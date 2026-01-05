import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import analytics from '../lib/analytics';

// Hook para tracking de páginas
export const usePageTracking = (pageName, pageTitle) => {
  const location = useLocation();

  useEffect(() => {
    const title = pageTitle || document.title;
    analytics.trackPageView(pageName || location.pathname, title);
  }, [location.pathname, pageName, pageTitle]);
};

// Hook para tracking de eventos
export const useEventTracking = () => {
  return useCallback((eventName, parameters) => {
    analytics.trackEvent(eventName, parameters);
  }, []);
};

// Hook para tracking de performance de componentes
export const usePerformanceTracking = (componentName) => {
  const renderStartTime = useRef(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    if (renderTime > 50) { // Track slow renders (>50ms)
      analytics.trackPerformanceMetric(`component_render_${componentName}`, renderTime);
    }
  }, []); // Only runs on mount

  return useCallback((metricName, value) => {
    analytics.trackPerformanceMetric(`${componentName}_${metricName}`, value);
  }, [componentName]);
};

// Hook para tracking de formulários
export const useFormTracking = (formName) => {
  const trackEvent = useEventTracking();
  const formStartTime = useRef(null);
  const fieldInteractions = useRef({});

  const trackFormStart = useCallback(() => {
    formStartTime.current = Date.now();
    trackEvent('form_start', {
      event_category: 'Form Interaction',
      event_label: formName
    });
  }, [formName, trackEvent]);

  const trackFieldInteraction = useCallback((fieldName, action = 'focus') => {
    fieldInteractions.current[fieldName] = Date.now();
    trackEvent('form_field_interaction', {
      event_category: 'Form Interaction',
      event_label: `${formName}_${fieldName}`,
      custom_parameter_1: action
    });
  }, [formName, trackEvent]);

  const trackFormSubmit = useCallback((success = true, errorMessage = null) => {
    const completionTime = formStartTime.current ?
      Date.now() - formStartTime.current : null;

    trackEvent('form_submit', {
      event_category: 'Form Interaction',
      event_label: formName,
      value: completionTime,
      custom_parameter_1: success ? 'success' : 'error',
      custom_parameter_2: errorMessage
    });
  }, [formName, trackEvent]);

  const trackFormAbandonment = useCallback((lastField) => {
    const timeSpent = formStartTime.current ?
      Date.now() - formStartTime.current : null;

    analytics.trackFormAbandonment(formName, lastField);
    trackEvent('form_abandonment', {
      event_category: 'Form Interaction',
      event_label: formName,
      value: timeSpent,
      custom_parameter_1: lastField
    });
  }, [formName, trackEvent]);

  return {
    trackFormStart,
    trackFieldInteraction,
    trackFormSubmit,
    trackFormAbandonment
  };
};

// Hook para tracking de booking flow
export const useBookingTracking = () => {
  const trackEvent = useEventTracking();

  const trackBookingStep = useCallback((step, data = {}) => {
    analytics.trackBookingStep(step, data.professionalId, data.serviceId);
    analytics.trackFunnelStep('booking', step, data);
  }, []);

  const trackBookingCompleted = useCallback((bookingData) => {
    const { id, professionalId, serviceId, amount } = bookingData;
    analytics.trackBookingCompleted(id, professionalId, serviceId, amount);
  }, []);

  const trackBookingAbandonment = useCallback((step, reason) => {
    trackEvent('booking_abandonment', {
      event_category: 'Conversion',
      event_label: `Step ${step}`,
      custom_parameter_1: reason
    });
  }, [trackEvent]);

  return {
    trackBookingStep,
    trackBookingCompleted,
    trackBookingAbandonment
  };
};

// Hook para tracking de vídeos
export const useVideoTracking = () => {
  const trackEvent = useEventTracking();

  const trackVideoPlay = useCallback((videoId, videoTitle) => {
    analytics.trackVideoInteraction(videoId, 'play');
    trackEvent('video_play', {
      event_category: 'Video',
      event_label: videoTitle,
      custom_parameter_1: videoId
    });
  }, [trackEvent]);

  const trackVideoPause = useCallback((videoId, currentTime) => {
    analytics.trackVideoInteraction(videoId, 'pause');
    trackEvent('video_pause', {
      event_category: 'Video',
      event_label: 'Video Paused',
      value: Math.round(currentTime),
      custom_parameter_1: videoId
    });
  }, [trackEvent]);

  const trackVideoComplete = useCallback((videoId, totalTime) => {
    analytics.trackVideoInteraction(videoId, 'complete');
    trackEvent('video_complete', {
      event_category: 'Video',
      event_label: 'Video Completed',
      value: Math.round(totalTime),
      custom_parameter_1: videoId
    });
  }, [trackEvent]);

  return {
    trackVideoPlay,
    trackVideoPause,
    trackVideoComplete
  };
};

// Hook para tracking de erros
export const useErrorTracking = () => {
  const trackEvent = useEventTracking();

  const trackError = useCallback((error, context = '') => {
    trackEvent('component_error', {
      event_category: 'Error',
      event_label: error.message || 'Unknown error',
      custom_parameter_1: context,
      custom_parameter_2: error.stack?.slice(0, 500)
    });
  }, [trackEvent]);

  const trackApiError = useCallback((endpoint, statusCode, errorMessage) => {
    trackEvent('api_error', {
      event_category: 'API Error',
      event_label: endpoint,
      value: statusCode,
      custom_parameter_1: errorMessage
    });
  }, [trackEvent]);

  return {
    trackError,
    trackApiError
  };
};

// Hook para tracking de user engagement
export const useEngagementTracking = () => {
  const trackEvent = useEventTracking();
  const sessionStart = useRef(Date.now());
  const pageViewStart = useRef(Date.now());

  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionDuration = Date.now() - sessionStart.current;
      const pageViewDuration = Date.now() - pageViewStart.current;

      trackEvent('session_end', {
        event_category: 'Engagement',
        event_label: 'Session Duration',
        value: Math.round(sessionDuration / 1000) // in seconds
      });

      trackEvent('page_view_duration', {
        event_category: 'Engagement',
        event_label: window.location.pathname,
        value: Math.round(pageViewDuration / 1000)
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [trackEvent]);

  const trackScrollDepth = useCallback((depth) => {
    trackEvent('scroll_depth', {
      event_category: 'Engagement',
      event_label: 'Page Scroll',
      value: Math.round(depth * 100) // percentage
    });
  }, [trackEvent]);

  const trackTimeOnPage = useCallback((milestone) => {
    const timeSpent = Date.now() - pageViewStart.current;
    trackEvent('time_on_page_milestone', {
      event_category: 'Engagement',
      event_label: `${milestone}s milestone`,
      value: Math.round(timeSpent / 1000)
    });
  }, [trackEvent]);

  return {
    trackScrollDepth,
    trackTimeOnPage
  };
};

// Hook para scroll depth tracking automático
export const useScrollTracking = () => {
  const { trackScrollDepth } = useEngagementTracking();
  const trackedDepths = useRef(new Set());

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollTop / docHeight;

      // Track at 25%, 50%, 75%, 90% milestones
      const milestones = [0.25, 0.50, 0.75, 0.90];

      milestones.forEach(milestone => {
        if (scrollPercent >= milestone && !trackedDepths.current.has(milestone)) {
          trackedDepths.current.add(milestone);
          trackScrollDepth(milestone);
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackScrollDepth]);
};