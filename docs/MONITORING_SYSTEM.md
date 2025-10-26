# Sistema de Monitoramento e Analytics - Doxologos

## Visão Geral

Este documento descreve o sistema completo de monitoramento, analytics e tracking de erros implementado para a plataforma Doxologos. O sistema oferece insights detalhados sobre performance, comportamento do usuário e qualidade da aplicação.

## 🎯 Funcionalidades Implementadas

### 1. Google Analytics 4 (GA4)
- **Configuração**: Integração completa com GA4 via gtag
- **Eventos customizados**: Tracking de interações específicas do negócio
- **Conversões**: Funil de agendamento, doações e depoimentos
- **Ecommerce**: Tracking de transações e valores

### 2. Web Vitals Monitoring
- **Core Web Vitals**: LCP, FID, CLS automaticamente medidos
- **Métricas adicionais**: FCP, TTFB, tempo de hidratação React
- **Performance Observer**: Monitoramento de long tasks e recursos
- **Relatórios**: Alertas automáticos para degradação de performance

### 3. Error Tracking Completo
- **React Error Boundaries**: Captura erros de componentes
- **Unhandled Errors**: Tracking de erros JavaScript globais
- **Network Errors**: Monitoramento de falhas de API e requisições
- **Console Errors**: Captura de erros e warnings no console
- **Promise Rejections**: Tracking de promises rejeitadas

### 4. Analytics Hooks Especializados
- **usePageTracking**: Tracking automático de page views
- **useFormTracking**: Análise completa de formulários
- **useBookingTracking**: Funil de agendamento detalhado
- **useVideoTracking**: Engagement com conteúdo de vídeo
- **useEngagementTracking**: Scroll depth, tempo na página
- **useErrorTracking**: Monitoramento de erros por componente

## 📁 Estrutura de Arquivos

```
src/
├── lib/
│   ├── analytics.js          # Manager principal do GA4
│   └── webVitals.js          # Monitoramento de Web Vitals
├── hooks/
│   ├── useAnalytics.js       # Hooks especializados
│   └── useErrorTracking.js   # Hooks de error tracking
└── components/
    └── ErrorBoundary.jsx     # Componentes de error boundary
```

## 🔧 Configuração

### Variáveis de Ambiente

Adicione no seu arquivo `.env`:

```env
# Google Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=true

# Performance Monitoring
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ERROR_TRACKING_ENABLED=true

# Development Settings
VITE_ENVIRONMENT=development
```

### HTML Base

O arquivo `index.html` já inclui:
- Script do Google Analytics 4
- Performance Observer para Web Vitals
- Meta tags SEO otimizadas
- Scripts de monitoramento de recursos

## 📊 Eventos Trackados

### 1. Eventos de Página
```javascript
// Page views automáticos
gtag('event', 'page_view', {
  page_title: document.title,
  page_location: window.location.href
});
```

### 2. Eventos de Formulário
```javascript
// Início de preenchimento
trackFormStart('contact_form');

// Submissão
trackFormSubmit({ name, email, message });

// Erros de validação
trackFormError(error);
```

### 3. Eventos de Agendamento
```javascript
// Início do funil
trackBookingStart();

// Progressão entre etapas
trackBookingStep(2, { professional: 'Dr. João' });

// Conclusão
trackBookingComplete(bookingData);
```

### 4. Eventos de Vídeo
```javascript
// Play de vídeo
trackVideoPlay('video_id', 'Video Title');

// Progresso
trackVideoProgress('video_id', 25); // 25% assistido

// Conclusão
trackVideoComplete('video_id');
```

### 5. Eventos de Engajamento
```javascript
// Scroll depth automático
trackScrollDepth(75); // 75% da página

// Tempo na página
trackTimeOnPage(300); // 5 minutos

// Visualização de elementos
trackElementView('cta_button');
```

## 🚨 Error Tracking

### 1. Error Boundaries
```jsx
// Wrap componentes com error tracking
<PageErrorBoundary pageName="Home">
  <HomePage />
</PageErrorBoundary>

// Error boundary para componentes específicos
<ComponentErrorBoundary componentName="VideoPlayer">
  <VideoPlayer />
</ComponentErrorBoundary>
```

### 2. Hooks de Error Tracking
```javascript
// Em componentes React
const { trackComponentError } = useComponentErrorTracking('MyComponent');

try {
  // Código que pode gerar erro
} catch (error) {
  trackComponentError(error, 'specific_action');
}
```

### 3. Tracking Automático
- Erros JavaScript globais
- Falhas de rede (fetch/XHR)
- Erros de console
- Promises rejeitadas
- Long tasks (> 50ms)

## 📈 Web Vitals Detalhados

### Métricas Core
- **LCP**: Largest Contentful Paint (< 2.5s)
- **FID**: First Input Delay (< 100ms)  
- **CLS**: Cumulative Layout Shift (< 0.1)

### Métricas Adicionais
- **FCP**: First Contentful Paint (< 1.8s)
- **TTFB**: Time to First Byte (< 800ms)
- **React Hydration**: Tempo de hidratação
- **Route Changes**: Performance de navegação

### Alertas Automáticos
```javascript
// Recursos grandes (> 100KB)
// Recursos lentos (> 1s)
// Uso de memória alto (> 80%)
// Long tasks (> 50ms)
```

## 🎛️ Dashboard e Relatórios

### Google Analytics 4
1. **Conversions**: Funil de agendamento completo
2. **Events**: Todos os eventos customizados
3. **Real-time**: Monitoramento em tempo real
4. **Audience**: Dados demográficos e comportamentais

### Performance Reports
```javascript
// Gerar relatório de performance
const report = webVitalsMonitor.generateReport();
console.log(report);

// Snapshot atual
const vitals = webVitalsMonitor.getVitalsSnapshot();
```

## 🔄 Integração com Componentes

### HomePage
- ✅ Form tracking implementado
- ✅ Video tracking implementado  
- ✅ Error boundaries configurados
- ✅ Engagement tracking ativo

### AgendamentoPage
- ✅ Booking funnel tracking
- ✅ Form validation tracking
- ✅ Error handling implementado
- ⏳ Step progression tracking (em progresso)

### Próximos Passos
1. **DepoimentoPage**: Implementar rating tracking
2. **DoacaoPage**: Implementar donation tracking
3. **Admin Pages**: Implementar admin analytics
4. **Performance Dashboard**: Interface visual dos relatórios

## 🚀 Benefícios do Sistema

### Para o Negócio
- **Otimização de Conversão**: Identificar pontos de abandono
- **Qualidade da Experiência**: Monitorar satisfação do usuário  
- **Performance**: Garantir carregamento rápido
- **Confiabilidade**: Detectar e corrigir erros rapidamente

### Para Desenvolvimento
- **Debugging**: Contexto detalhado de erros
- **Otimização**: Métricas de performance em tempo real
- **Qualidade**: Monitoramento contínuo de código
- **Analytics**: Dados para tomada de decisão

## 📞 Suporte e Manutenção

O sistema foi projetado para ser:
- **Auto-suficiente**: Funciona automaticamente após configuração
- **Extensível**: Fácil adição de novos eventos e métricas
- **Performático**: Impacto mínimo na performance da aplicação
- **Confiável**: Tratamento de erros e fallbacks implementados

Para questões técnicas ou extensões do sistema, consulte a documentação dos hooks individuais ou entre em contato com a equipe de desenvolvimento.