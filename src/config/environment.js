// Configurações de Analytics por Ambiente - Doxologos
// Este arquivo gerencia as configurações específicas para cada ambiente

class EnvironmentConfig {
  constructor() {
    this.environment = import.meta.env.VITE_ENVIRONMENT || 'development';
    this.config = this.getEnvironmentConfig();
  }

  getEnvironmentConfig() {
    const baseConfig = {
      // Configurações comuns a todos os ambientes
      appName: 'Doxologos',
      version: '1.0.0',
      analytics: {
        enabled: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
        measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID,
        debugMode: false,
        sendPageView: true,
        cookieFlags: 'SameSite=None;Secure'
      },
      performance: {
        enabled: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
        webVitals: true,
        resourceTiming: true,
        memoryMonitoring: true,
        longTaskThreshold: 50 // milliseconds
      },
      errorTracking: {
        enabled: import.meta.env.VITE_ERROR_TRACKING_ENABLED === 'true',
        captureConsole: false,
        captureUnhandledRejections: true,
        captureNetworkErrors: true
      }
    };

    // Configurações específicas por ambiente
    const environmentConfigs = {
      development: {
        ...baseConfig,
        analytics: {
          ...baseConfig.analytics,
          debugMode: true,
          customDimensions: {
            environment: 'development',
            debug: true
          }
        },
        performance: {
          ...baseConfig.performance,
          detailedLogging: true,
          performanceBudget: false
        },
        errorTracking: {
          ...baseConfig.errorTracking,
          captureConsole: true,
          verboseLogging: true,
          showErrorBoundaryDetails: true
        },
        features: {
          mockData: true,
          devtools: true,
          hotReload: true,
          sourceMap: true
        }
      },

      staging: {
        ...baseConfig,
        analytics: {
          ...baseConfig.analytics,
          debugMode: false,
          customDimensions: {
            environment: 'staging',
            testMode: true
          },
          samplingRate: 100 // 100% sampling em staging
        },
        performance: {
          ...baseConfig.performance,
          detailedLogging: true,
          performanceBudget: true,
          budgetThresholds: {
            LCP: 3000,
            FID: 150,
            CLS: 0.15
          }
        },
        errorTracking: {
          ...baseConfig.errorTracking,
          captureConsole: false,
          alertThreshold: 10 // erros por hora
        },
        features: {
          mockData: false,
          devtools: false,
          testingMode: true,
          e2eTesting: true
        }
      },

      production: {
        ...baseConfig,
        analytics: {
          ...baseConfig.analytics,
          debugMode: false,
          customDimensions: {
            environment: 'production',
            version: baseConfig.version
          },
          samplingRate: 1, // 1% sampling em produção (ajustar conforme tráfego)
          enhancedEcommerce: true,
          conversionTracking: true
        },
        performance: {
          ...baseConfig.performance,
          detailedLogging: false,
          performanceBudget: true,
          budgetThresholds: {
            LCP: 2500,
            FID: 100,
            CLS: 0.1
          },
          criticalAlerts: true
        },
        errorTracking: {
          ...baseConfig.errorTracking,
          captureConsole: false,
          alertThreshold: 5, // erros por hora
          criticalErrorAlert: true
        },
        features: {
          mockData: false,
          devtools: false,
          compression: true,
          minification: true,
          caching: true
        }
      }
    };

    return environmentConfigs[this.environment] || environmentConfigs.development;
  }

  // Getters para facilitar acesso às configurações
  get isProduction() {
    return this.environment === 'production';
  }

  get isDevelopment() {
    return this.environment === 'development';
  }

  get isStaging() {
    return this.environment === 'staging';
  }

  get analyticsConfig() {
    return this.config.analytics;
  }

  get performanceConfig() {
    return this.config.performance;
  }

  get errorTrackingConfig() {
    return this.config.errorTracking;
  }

  get features() {
    return this.config.features;
  }

  // Método para configurar GA4 baseado no ambiente
  getGA4Config() {
    if (!this.config.analytics.enabled || !this.config.analytics.measurementId) {
      return null;
    }

    return {
      measurement_id: this.config.analytics.measurementId,
      app_name: this.config.appName,
      app_version: this.config.version,
      debug_mode: this.config.analytics.debugMode,
      send_page_view: this.config.analytics.sendPageView,
      cookie_flags: this.config.analytics.cookieFlags,
      custom_map: {
        custom_parameter_1: 'environment',
        custom_parameter_2: 'version',
        custom_parameter_3: 'user_type'
      },
      // Configurações específicas por ambiente
      ...(this.isProduction && {
        linker: {
          domains: ['doxologos.com', 'www.doxologos.com']
        },
        conversion_linker: true
      }),
      ...(this.isDevelopment && {
        transport_type: 'beacon',
        debug_mode: true
      })
    };
  }

  // Método para obter configurações de Performance Budget
  getPerformanceBudget() {
    if (!this.config.performance.performanceBudget) {
      return null;
    }

    const budgets = {
      development: {
        // Mais relaxado em desenvolvimento
        bundle: '2MB',
        images: '1MB',
        fonts: '500KB',
        LCP: 4000,
        FID: 300,
        CLS: 0.25
      },
      staging: {
        // Intermediário para testes
        bundle: '1MB',
        images: '500KB',
        fonts: '300KB',
        LCP: 3000,
        FID: 150,
        CLS: 0.15
      },
      production: {
        // Rigoroso para produção
        bundle: '500KB',
        images: '300KB',
        fonts: '200KB',
        LCP: 2500,
        FID: 100,
        CLS: 0.1
      }
    };

    return budgets[this.environment] || budgets.development;
  }

  // Método para configurar alertas baseado no ambiente
  getAlertConfig() {
    const baseAlerts = {
      email: 'admin@doxologos.com',
      slack: process.env.SLACK_WEBHOOK_URL,
      enabled: this.config.errorTracking.enabled
    };

    if (this.isProduction) {
      return {
        ...baseAlerts,
        criticalErrors: {
          threshold: 5,
          interval: '1h',
          escalation: true
        },
        performance: {
          webVitalsThreshold: 75, // % de páginas com "good" rating
          uptimeThreshold: 99.9,
          responseTimeThreshold: 2000
        },
        business: {
          conversionDropThreshold: 20, // % de queda
          trafficAnomalyThreshold: 50 // % de variação
        }
      };
    }

    if (this.isStaging) {
      return {
        ...baseAlerts,
        testingAlerts: {
          e2eFailures: true,
          performanceRegression: true
        }
      };
    }

    // Development - apenas alertas críticos
    return {
      ...baseAlerts,
      criticalErrors: {
        threshold: 10,
        interval: '4h'
      }
    };
  }

  // Método para logging baseado no ambiente
  log(level, message, data = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      level,
      message,
      ...data
    };

    if (this.isDevelopment) {
      console[level] || console.log(logData);
    } else if (this.config.performance.detailedLogging) {
      // Em staging/produção, usar serviço de logging
      this.sendToLoggingService(logData);
    }
  }

  sendToLoggingService(data) {
    // Implementar integração com serviço de logging
    // (ex: LogRocket, Sentry, CloudWatch, etc.)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'app_log', {
        event_category: 'Logging',
        event_label: data.level,
        custom_parameter_1: data.message,
        custom_parameter_2: this.environment
      });
    }
  }

  // Método para validar configuração
  validate() {
    const errors = [];

    if (this.config.analytics.enabled && !this.config.analytics.measurementId) {
      errors.push('Analytics habilitado mas Measurement ID não configurado');
    }

    if (this.isProduction && this.config.analytics.debugMode) {
      errors.push('Debug mode não deve estar ativo em produção');
    }

    if (this.config.performance.enabled && !this.config.performance.webVitals) {
      errors.push('Performance monitoring sem Web Vitals não é recomendado');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Instância singleton para uso global
const envConfig = new EnvironmentConfig();

// Validar configuração na inicialização
const validation = envConfig.validate();
if (!validation.isValid) {
  console.warn('Configuração de ambiente com problemas:', validation.errors);
}

export default envConfig;

// Exportar configurações específicas para facilitar imports
export const {
  analyticsConfig,
  performanceConfig,
  errorTrackingConfig,
  features,
  isProduction,
  isDevelopment,
  isStaging
} = envConfig;