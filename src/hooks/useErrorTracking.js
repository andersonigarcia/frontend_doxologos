import { useEffect, useCallback } from 'react';
import analytics from '../lib/analytics';

// Error boundary tracking hook
export const useErrorBoundary = () => {
  const trackError = useCallback((error, errorInfo) => {
    analytics.trackError(error, {
      errorBoundary: true,
      componentStack: errorInfo?.componentStack,
      errorInfo: JSON.stringify(errorInfo)
    });
  }, []);

  return { trackError };
};

// Network error monitoring
export const useNetworkErrorTracking = () => {
  useEffect(() => {
    // URLs que devem ser ignoradas pelo tracking
    const ignoredUrls = [
      'google-analytics.com',
      'googletagmanager.com',
      'doubleclick.net',
      'analytics.google.com',
      'stats.g.doubleclick.net',
      '/gtag/',
      '/collect',
      '/r/collect'
    ];

    const shouldIgnoreUrl = (url) => {
      if (!url) return true;
      const urlString = url.toString();
      return ignoredUrls.some(ignored => urlString.includes(ignored));
    };

    // Monitor fetch errors
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      try {
        const response = await originalFetch.apply(this, args);
        
        // Ignorar erros de URLs específicas
        if (!response.ok && !shouldIgnoreUrl(args[0])) {
          analytics.trackEvent('network_error', {
            event_category: 'Network',
            event_label: 'HTTP Error',
            value: response.status,
            custom_parameter_1: args[0], // URL
            custom_parameter_2: response.statusText
          });
        }
        
        return response;
      } catch (error) {
        // Ignorar erros de URLs específicas
        if (!shouldIgnoreUrl(args[0])) {
          analytics.trackError(error, {
            networkError: true,
            url: args[0],
            method: args[1]?.method || 'GET'
          });
        }
        throw error;
      }
    };

    // Monitor XMLHttpRequest errors
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this.addEventListener('error', () => {
        // Ignorar erros de URLs específicas
        if (!shouldIgnoreUrl(url)) {
          analytics.trackEvent('xhr_error', {
            event_category: 'Network',
            event_label: 'XHR Error',
            custom_parameter_1: url,
            custom_parameter_2: method
          });
        }
      });
      
      return originalXHROpen.call(this, method, url, ...rest);
    };

    // Cleanup
    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
    };
  }, []);
};

// Console error tracking
export const useConsoleErrorTracking = () => {
  useEffect(() => {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // Strings que devem ser ignoradas
    const ignoredPatterns = [
      'google-analytics',
      'googletagmanager',
      'gtag',
      'Failed to load resource',
      'net::ERR_BLOCKED_BY_CLIENT' // Ad blockers
    ];

    const shouldIgnoreMessage = (message) => {
      const messageStr = message.toString().toLowerCase();
      return ignoredPatterns.some(pattern => messageStr.includes(pattern.toLowerCase()));
    };

    console.error = function(...args) {
      // Ignorar mensagens específicas
      if (!shouldIgnoreMessage(args.join(' '))) {
        analytics.trackEvent('console_error', {
          event_category: 'JavaScript',
          event_label: 'Console Error',
          custom_parameter_1: args.join(' ')
        });
      }
      return originalConsoleError.apply(this, args);
    };

    console.warn = function(...args) {
      // Ignorar mensagens específicas
      if (!shouldIgnoreMessage(args.join(' '))) {
        analytics.trackEvent('console_warning', {
          event_category: 'JavaScript', 
          event_label: 'Console Warning',
          custom_parameter_1: args.join(' ')
        });
      }
      return originalConsoleWarn.apply(this, args);
    };

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);
};

// Unhandled promise rejection tracking  
export const usePromiseErrorTracking = () => {
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      analytics.trackError(event.reason, {
        unhandledPromise: true,
        promise: event.promise
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
};

// Component error tracking hook
export const useComponentErrorTracking = (componentName) => {
  const trackComponentError = useCallback((error, action = 'render') => {
    analytics.trackError(error, {
      component: componentName,
      action: action,
      timestamp: Date.now()
    });
  }, [componentName]);

  const trackAsyncError = useCallback(async (asyncOperation, operationName) => {
    try {
      return await asyncOperation();
    } catch (error) {
      trackComponentError(error, operationName);
      throw error;
    }
  }, [trackComponentError]);

  return {
    trackComponentError,
    trackAsyncError
  };
};

// Form error tracking
export const useFormErrorTracking = (formName) => {
  const trackValidationError = useCallback((fieldName, errorMessage) => {
    analytics.trackEvent('form_validation_error', {
      event_category: 'Form',
      event_label: `${formName} - ${fieldName}`,
      custom_parameter_1: errorMessage
    });
  }, [formName]);

  const trackSubmissionError = useCallback((error) => {
    analytics.trackError(error, {
      formSubmission: true,
      formName: formName,
      timestamp: Date.now()
    });
  }, [formName]);

  return {
    trackValidationError,
    trackSubmissionError
  };
};

// API error tracking with retry logic
export const useApiErrorTracking = () => {
  const trackApiError = useCallback((endpoint, error, retryCount = 0) => {
    analytics.trackEvent('api_error', {
      event_category: 'API',
      event_label: endpoint,
      value: retryCount,
      custom_parameter_1: error.message,
      custom_parameter_2: error.status || 'unknown'
    });
  }, []);

  const withErrorTracking = useCallback(async (apiCall, endpoint, maxRetries = 3) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error;
        trackApiError(endpoint, error, attempt);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  }, [trackApiError]);

  return {
    trackApiError,
    withErrorTracking
  };
};

// Performance monitoring for errors
export const usePerformanceErrorTracking = () => {
  useEffect(() => {
    // Track long tasks that might cause errors
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 100) { // > 100ms
            analytics.trackEvent('performance_warning', {
              event_category: 'Performance',
              event_label: 'Long Task',
              value: Math.round(entry.duration),
              custom_parameter_1: entry.name || 'unknown'
            });
          }
        }
      });
      
      observer.observe({ type: 'longtask', buffered: true });
      
      return () => observer.disconnect();
    }
  }, []);
};

// Comprehensive error tracking hook that combines all error types
export const useComprehensiveErrorTracking = (componentName) => {
  useNetworkErrorTracking();
  useConsoleErrorTracking(); 
  usePromiseErrorTracking();
  usePerformanceErrorTracking();
  
  const { trackComponentError, trackAsyncError } = useComponentErrorTracking(componentName);
  const { trackError } = useErrorBoundary();
  
  // Global error handler
  useEffect(() => {
    const handleGlobalError = (event) => {
      trackError(event.error, {
        globalError: true,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };

    window.addEventListener('error', handleGlobalError);
    
    return () => {
      window.removeEventListener('error', handleGlobalError);
    };
  }, [trackError]);

  return {
    trackComponentError,
    trackAsyncError,
    trackError
  };
};