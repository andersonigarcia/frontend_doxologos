import analytics from './analytics';

// Web Vitals monitoring with enhanced reporting
class WebVitalsMonitor {
  constructor() {
    this.vitals = {};
    this.thresholds = {
      LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
      FID: { good: 100, poor: 300 },   // First Input Delay  
      CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
      FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
      TTFB: { good: 800, poor: 1800 }  // Time to First Byte
    };
    
    this.init();
  }

  init() {
    // Use the web-vitals library if available, otherwise fallback to native APIs
    if (typeof window !== 'undefined') {
      this.measureLCP();
      this.measureFID();  
      this.measureCLS();
      this.measureFCP();
      this.measureTTFB();
      this.measureCustomMetrics();
    }
  }

  measureLCP() {
    if (!('PerformanceObserver' in window)) return;

    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.vitals.LCP = lastEntry.startTime;
      this.reportVital('LCP', lastEntry.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  }

  measureFID() {
    if (!('PerformanceObserver' in window)) return;

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const delay = entry.processingStart - entry.startTime;
        this.vitals.FID = delay;
        this.reportVital('FID', delay);
      }
    }).observe({ type: 'first-input', buffered: true });
  }

  measureCLS() {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries = [];

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

          if (sessionValue && 
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }

          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            this.vitals.CLS = clsValue;
            this.reportVital('CLS', clsValue);
          }
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  }

  measureFCP() {
    if (!('PerformanceObserver' in window)) return;

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.vitals.FCP = entry.startTime;
          this.reportVital('FCP', entry.startTime);
        }
      }
    }).observe({ type: 'paint', buffered: true });
  }

  measureTTFB() {
    if (!('PerformanceObserver' in window)) return;

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const ttfb = entry.responseStart - entry.requestStart;
          this.vitals.TTFB = ttfb;
          this.reportVital('TTFB', ttfb);
        }
      }
    }).observe({ type: 'navigation', buffered: true });
  }

  measureCustomMetrics() {
    // Measure React hydration time
    this.measureReactHydration();
    
    // Measure route change performance
    this.measureRouteChanges();
    
    // Measure JavaScript execution time
    this.measureJSExecution();
  }

  measureReactHydration() {
    const hydrationStart = performance.now();
    
    // Listen for React hydration complete
    const checkHydration = () => {
      const rootElement = document.getElementById('root');
      if (rootElement && rootElement.children.length > 0) {
        const hydrationTime = performance.now() - hydrationStart;
        this.vitals.ReactHydration = hydrationTime;
        this.reportCustomMetric('react_hydration_time', hydrationTime);
      } else {
        setTimeout(checkHydration, 50);
      }
    };
    
    setTimeout(checkHydration, 0);
  }

  measureRouteChanges() {
    let routeChangeStart = 0;
    
    // Monitor route changes (for React Router)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      routeChangeStart = performance.now();
      originalPushState.apply(this, args);
    };
    
    history.replaceState = function(...args) {
      routeChangeStart = performance.now();
      originalReplaceState.apply(this, args);
    };
    
    window.addEventListener('popstate', () => {
      routeChangeStart = performance.now();
    });
    
    // Measure when new content is rendered
    const observer = new MutationObserver(() => {
      if (routeChangeStart > 0) {
        const routeChangeTime = performance.now() - routeChangeStart;
        this.reportCustomMetric('route_change_time', routeChangeTime);
        routeChangeStart = 0;
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  measureJSExecution() {
    // Measure long tasks that block the main thread
    if ('PerformanceObserver' in window) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.reportCustomMetric('long_task', entry.duration);
            analytics.trackEvent('performance_issue', {
              event_category: 'Performance',
              event_label: 'Long Task',
              value: Math.round(entry.duration)
            });
          }
        }
      }).observe({ type: 'longtask', buffered: true });
    }
  }

  reportVital(name, value) {
    const threshold = this.thresholds[name];
    let rating = 'good';
    
    if (threshold) {
      if (value > threshold.poor) {
        rating = 'poor';
      } else if (value > threshold.good) {
        rating = 'needs-improvement';
      }
    }

    analytics.trackEvent('web_vital', {
      event_category: 'Web Vitals',
      event_label: name,
      value: Math.round(value),
      custom_parameter_1: rating
    });

    // Store for performance dashboard
    this.vitals[name] = { value, rating, timestamp: Date.now() };
  }

  reportCustomMetric(name, value) {
    analytics.trackPerformanceMetric(name, value);
    
    // Store for performance dashboard
    this.vitals[name] = { value, timestamp: Date.now() };
  }

  // Get current vitals snapshot
  getVitalsSnapshot() {
    return { ...this.vitals };
  }

  // Generate performance report
  generateReport() {
    const report = {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: navigator.connection?.effectiveType || 'unknown',
      vitals: this.getVitalsSnapshot(),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.vitals.LCP?.value > this.thresholds.LCP.poor) {
      recommendations.push('Consider optimizing largest contentful paint by compressing images and reducing server response times');
    }
    
    if (this.vitals.FID?.value > this.thresholds.FID.poor) {
      recommendations.push('Reduce JavaScript execution time and consider code splitting');
    }
    
    if (this.vitals.CLS?.value > this.thresholds.CLS.poor) {
      recommendations.push('Ensure all images and ads have dimensions set to prevent layout shifts');
    }
    
    if (this.vitals.TTFB?.value > this.thresholds.TTFB.poor) {
      recommendations.push('Optimize server response time and consider using a CDN');
    }

    return recommendations;
  }
}

// Resource timing monitoring
export const monitorResourceTiming = () => {
  if (!('PerformanceObserver' in window)) return;

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const { name, transferSize, duration } = entry;
      
      // Track large resources
      if (transferSize > 100000) { // > 100KB
        analytics.trackEvent('large_resource', {
          event_category: 'Performance',
          event_label: 'Large Resource',
          value: Math.round(transferSize / 1000), // KB
          custom_parameter_1: name
        });
      }
      
      // Track slow resources
      if (duration > 1000) { // > 1 second
        analytics.trackEvent('slow_resource', {
          event_category: 'Performance', 
          event_label: 'Slow Resource',
          value: Math.round(duration),
          custom_parameter_1: name
        });
      }
    }
  }).observe({ type: 'resource', buffered: true });
};

// Memory monitoring
export const monitorMemoryUsage = () => {
  if (!('memory' in performance)) return;
  
  const checkMemory = () => {
    const memory = performance.memory;
    const usedMemory = memory.usedJSHeapSize;
    const totalMemory = memory.totalJSHeapSize;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;
    
    if (memoryUsagePercent > 80) {
      analytics.trackEvent('high_memory_usage', {
        event_category: 'Performance',
        event_label: 'Memory Usage',
        value: Math.round(memoryUsagePercent)
      });
    }
  };
  
  // Check memory every 30 seconds
  setInterval(checkMemory, 30000);
};

// Initialize monitoring
const webVitalsMonitor = new WebVitalsMonitor();

// Start additional monitoring
if (typeof window !== 'undefined') {
  monitorResourceTiming();
  monitorMemoryUsage();
}

export default webVitalsMonitor;