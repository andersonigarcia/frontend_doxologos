# 🔍 SEO - Otimização para Motores de Busca

Este documento consolida todas as informações sobre SEO e ASO (App Store Optimization) do sistema Doxologos.

---

## 📊 Relatório SEO/ASO Atual

### Pontuação Geral
- **SEO Score**: 85/100
- **Performance**: 92/100
- **Acessibilidade**: 88/100
- **Best Practices**: 90/100

---

## 🎯 Otimizações Implementadas

### Meta Tags
```html
<!-- Title -->
<title>Doxologos Psicologia - Agendamento Online de Consultas</title>

<!-- Description -->
<meta name="description" content="Agende sua consulta de psicologia online com profissionais qualificados. Pagamento via PIX ou cartão, consultas por vídeo.">

<!-- Keywords -->
<meta name="keywords" content="psicologia, consulta online, agendamento, terapia, psicólogo">

<!-- Open Graph -->
<meta property="og:title" content="Doxologos Psicologia">
<meta property="og:description" content="Agendamento online de consultas de psicologia">
<meta property="og:image" content="/og-image.jpg">
<meta property="og:url" content="https://novo.doxologos.com.br">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Doxologos Psicologia">
<meta name="twitter:description" content="Agendamento online de consultas">
<meta name="twitter:image" content="/twitter-image.jpg">
```

### Structured Data (JSON-LD)
```json
{
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "name": "Doxologos Psicologia",
  "description": "Clínica de psicologia com agendamento online",
  "url": "https://novo.doxologos.com.br",
  "telephone": "+55-XX-XXXX-XXXX",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "BR"
  },
  "priceRange": "$$"
}
```

---

## 🖼️ Otimização de Imagens

### Diretrizes
1. **Formato**: WebP (fallback para JPG/PNG)
2. **Tamanho máximo**: 200KB por imagem
3. **Dimensões**:
   - Hero images: 1920x1080px
   - Thumbnails: 400x300px
   - OG images: 1200x630px

### Nomes de Arquivo
```
✅ BOM: psicologia-online-consulta.webp
❌ RUIM: IMG_1234.jpg
```

### Alt Text
```html
<!-- Descritivo e relevante -->
<img src="consulta-online.webp" alt="Psicóloga realizando consulta online por vídeo">

<!-- Evitar -->
<img src="image.jpg" alt="imagem">
```

---

## 📱 Mobile Optimization

### Viewport
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### Responsive Images
```html
<picture>
  <source srcset="hero-mobile.webp" media="(max-width: 768px)">
  <source srcset="hero-desktop.webp" media="(min-width: 769px)">
  <img src="hero-desktop.webp" alt="Doxologos Psicologia">
</picture>
```

---

## 🚀 Performance

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s ✅
- **FID (First Input Delay)**: < 100ms ✅
- **CLS (Cumulative Layout Shift)**: < 0.1 ✅

### Otimizações Aplicadas
- ✅ Lazy loading de imagens
- ✅ Code splitting
- ✅ Minificação de CSS/JS
- ✅ Compressão Gzip/Brotli
- ✅ CDN para assets estáticos

---

## 🔗 URLs e Sitemap

### Estrutura de URLs
```
https://novo.doxologos.com.br/
├── /agendar
├── /profissionais
├── /servicos
├── /eventos
├── /sobre
├── /contato
├── /area-do-paciente
└── /admin
```

### Sitemap.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://novo.doxologos.com.br/</loc>
    <lastmod>2025-12-30</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://novo.doxologos.com.br/agendar</loc>
    <lastmod>2025-12-30</lastmod>
    <priority>0.9</priority>
  </url>
</urlset>
```

### Robots.txt
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /area-do-paciente

Sitemap: https://novo.doxologos.com.br/sitemap.xml
```

---

## 📊 Analytics e Monitoramento

### Google Search Console
- ✅ Propriedade verificada
- ✅ Sitemap submetido
- ✅ Monitoramento de erros 404
- ✅ Análise de palavras-chave

### Ferramentas de Validação
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
- [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [Schema Markup Validator](https://validator.schema.org/)

---

## 🎯 Palavras-Chave Alvo

### Primárias
- psicologia online
- consulta psicólogo online
- agendamento psicologia
- terapia online

### Secundárias
- psicólogo online brasil
- consulta psicológica virtual
- agendar psicólogo
- terapia por vídeo

### Long-tail
- como agendar consulta com psicólogo online
- melhor plataforma de psicologia online
- psicólogo online com pagamento pix

---

## ✅ Checklist de Validação

### Antes de Cada Deploy
- [ ] Meta tags atualizadas
- [ ] Imagens otimizadas (WebP, < 200KB)
- [ ] Alt text em todas as imagens
- [ ] Links internos funcionando
- [ ] Sitemap atualizado
- [ ] Robots.txt configurado
- [ ] Structured data válido
- [ ] Core Web Vitals OK
- [ ] Mobile-friendly
- [ ] HTTPS ativo

---

## 📈 Métricas de Sucesso

### Objetivos
- **Tráfego Orgânico**: +30% em 6 meses
- **Taxa de Conversão**: > 3%
- **Bounce Rate**: < 40%
- **Tempo na Página**: > 2 minutos

### KPIs
- Posição média no Google
- CTR (Click-Through Rate)
- Impressões
- Conversões de agendamento

---

## 🔄 Manutenção Contínua

### Mensal
- Revisar palavras-chave
- Analisar páginas com baixo desempenho
- Atualizar conteúdo desatualizado

### Trimestral
- Auditoria completa de SEO
- Análise de concorrentes
- Atualização de estratégia

---

**Última atualização**: 30 de Dezembro de 2025
