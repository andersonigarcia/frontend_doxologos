# ⚡ Performance e Loading - Doxologos

Este documento consolida informações sobre otimização de performance e sistema de loading.

---

## 🎯 Visão Geral

O sistema implementa múltiplas estratégias de otimização:
- ✅ Lazy loading de componentes
- ✅ Code splitting
- ✅ Loading states consistentes
- ✅ Otimização de imagens
- ✅ Caching estratégico

---

## 🔄 Sistema de Loading

### Loading States Globais
```javascript
// Context de loading
const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  return (
    <LoadingContext.Provider value={{ isLoading, setIsLoading, loadingMessage, setLoadingMessage }}>
      {children}
      {isLoading && <LoadingOverlay message={loadingMessage} />}
    </LoadingContext.Provider>
  );
};
```

### Loading Components
```jsx
// Spinner simples
export const Spinner = ({ size = 'md' }) => (
  <div className={`spinner spinner-${size}`}>
    <div className="spinner-border" role="status">
      <span className="sr-only">Carregando...</span>
    </div>
  </div>
);

// Skeleton loader
export const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-image" />
    <div className="skeleton-title" />
    <div className="skeleton-text" />
  </div>
);

// Loading overlay
export const LoadingOverlay = ({ message }) => (
  <div className="loading-overlay">
    <Spinner size="lg" />
    {message && <p>{message}</p>}
  </div>
);
```

---

## 🚀 Lazy Loading

### Componentes
```javascript
// Lazy load de páginas
const HomePage = lazy(() => import('./pages/HomePage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

// Uso com Suspense
<Suspense fallback={<LoadingOverlay message="Carregando página..." />}>
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/agendar" element={<BookingPage />} />
    <Route path="/admin" element={<AdminPage />} />
  </Routes>
</Suspense>
```

### Imagens
```jsx
// Lazy loading de imagens
<img 
  src={imageUrl} 
  alt={altText}
  loading="lazy"
  decoding="async"
/>

// Com placeholder
const [imageLoaded, setImageLoaded] = useState(false);

<div className="image-container">
  {!imageLoaded && <SkeletonImage />}
  <img
    src={imageUrl}
    alt={altText}
    onLoad={() => setImageLoaded(true)}
    style={{ display: imageLoaded ? 'block' : 'none' }}
  />
</div>
```

---

## 📦 Code Splitting

### Por Rota
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui': ['lucide-react', 'qrcode.react']
        }
      }
    }
  }
};
```

### Por Feature
```javascript
// Dynamic imports
const loadPaymentModule = async () => {
  const module = await import('./modules/payment');
  return module.default;
};

// Uso
const handlePayment = async () => {
  const PaymentModule = await loadPaymentModule();
  await PaymentModule.process(data);
};
```

---

## 🖼️ Otimização de Imagens

### Formatos Modernos
```jsx
<picture>
  <source srcset="image.webp" type="image/webp" />
  <source srcset="image.jpg" type="image/jpeg" />
  <img src="image.jpg" alt="Descrição" />
</picture>
```

### Responsive Images
```jsx
<img
  srcset="
    image-320w.jpg 320w,
    image-640w.jpg 640w,
    image-1280w.jpg 1280w
  "
  sizes="(max-width: 640px) 100vw, 640px"
  src="image-640w.jpg"
  alt="Descrição"
/>
```

### Compressão
- **Ferramentas**: TinyPNG, ImageOptim, Squoosh
- **Target**: < 200KB por imagem
- **Formato**: WebP com fallback JPG

---

## 💾 Caching

### Service Worker (PWA)
```javascript
// sw.js
const CACHE_NAME = 'doxologos-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

### React Query / SWR
```javascript
// Caching de dados do Supabase
import { useQuery } from '@tanstack/react-query';

const useProfessionals = () => {
  return useQuery({
    queryKey: ['professionals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('professionals')
        .select('*');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000 // 10 minutos
  });
};
```

---

## 📊 Métricas de Performance

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s ✅
- **FID (First Input Delay)**: < 100ms ✅
- **CLS (Cumulative Layout Shift)**: < 0.1 ✅

### Outras Métricas
- **TTFB (Time to First Byte)**: < 600ms
- **FCP (First Contentful Paint)**: < 1.8s
- **TTI (Time to Interactive)**: < 3.8s

### Ferramentas de Medição
- Google PageSpeed Insights
- Lighthouse
- WebPageTest
- Chrome DevTools Performance

---

## 🎨 Loading UX Best Practices

### Estados de Loading
```jsx
// Skeleton para listas
{isLoading ? (
  <div className="grid grid-cols-3 gap-4">
    {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
  </div>
) : (
  <div className="grid grid-cols-3 gap-4">
    {items.map(item => <Card key={item.id} {...item} />)}
  </div>
)}

// Spinner para ações
<button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Spinner size="sm" />
      <span>Salvando...</span>
    </>
  ) : (
    'Salvar'
  )}
</button>
```

### Feedback Progressivo
```jsx
// Indicador de progresso
const [progress, setProgress] = useState(0);

const uploadFile = async (file) => {
  const xhr = new XMLHttpRequest();
  xhr.upload.addEventListener('progress', (e) => {
    const percent = (e.loaded / e.total) * 100;
    setProgress(percent);
  });
  // ... upload logic
};

<ProgressBar value={progress} max={100} />
```

---

## ⚡ Otimizações Aplicadas

### Bundle Size
- ✅ Tree shaking habilitado
- ✅ Minificação de JS/CSS
- ✅ Compressão Gzip/Brotli
- ✅ Remoção de código morto

### Runtime Performance
- ✅ Memoização com useMemo/useCallback
- ✅ Virtualização de listas longas
- ✅ Debounce em inputs de busca
- ✅ Throttle em scroll events

### Network
- ✅ HTTP/2 habilitado
- ✅ CDN para assets estáticos
- ✅ Prefetch de recursos críticos
- ✅ DNS prefetch para domínios externos

---

## 📋 Checklist de Performance

### Antes de Deploy
- [ ] Lighthouse score > 90
- [ ] Bundle size < 500KB (gzipped)
- [ ] Imagens otimizadas (< 200KB)
- [ ] Lazy loading implementado
- [ ] Code splitting configurado
- [ ] Caching estratégico
- [ ] Loading states em todas as ações
- [ ] Error boundaries implementados

---

## 🔧 Debugging de Performance

### Chrome DevTools
```javascript
// Marcar início de operação
performance.mark('fetch-start');

// Operação
await fetchData();

// Marcar fim
performance.mark('fetch-end');

// Medir
performance.measure('fetch-duration', 'fetch-start', 'fetch-end');

// Ver resultados
const measures = performance.getEntriesByType('measure');
console.log(measures);
```

### React DevTools Profiler
1. Abrir React DevTools
2. Tab "Profiler"
3. Clicar em "Record"
4. Realizar ação
5. Parar gravação
6. Analisar flame graph

---

**Última atualização**: 30 de Dezembro de 2025
