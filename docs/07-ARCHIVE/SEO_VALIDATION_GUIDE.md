# Guia Rápido de Validação SEO

## 🚀 Como Testar as Otimizações Implementadas

### 1. Testar Meta Tags e Open Graph

#### Facebook Sharing Debugger
1. Acesse: https://developers.facebook.com/tools/debug/
2. Cole a URL: `https://doxologos.com.br`
3. Clique em "Debug"
4. Verifique:
   - ✅ Título aparece corretamente
   - ✅ Descrição está visível
   - ✅ Imagem og-image.jpg carrega (após criar)
   - ✅ Tipo "website" está correto

**Comando para limpar cache**:
```
Clique em "Scrape Again" para forçar atualização
```

---

#### Twitter Card Validator
1. Acesse: https://cards-dev.twitter.com/validator
2. Cole a URL: `https://doxologos.com.br`
3. Clique em "Preview card"
4. Verifique:
   - ✅ Card tipo "summary_large_image"
   - ✅ Título, descrição e imagem aparecem
   - ✅ Layout está correto

---

### 2. Testar Rich Snippets (FAQ Schema)

#### Google Rich Results Test
1. Acesse: https://search.google.com/test/rich-results
2. Cole a URL: `https://doxologos.com.br`
3. Ou cole o código-fonte (View Source)
4. Clique em "Test URL" ou "Test Code"
5. Verifique:
   - ✅ FAQPage detectado
   - ✅ 12 perguntas reconhecidas
   - ✅ Sem erros ou warnings
   - ✅ Preview do FAQ snippet

**Tempo para aparecer no Google**: 2-4 semanas após indexação

---

### 3. Testar Schema.org LocalBusiness

#### Schema.org Validator
1. Acesse: https://validator.schema.org/
2. Cole a URL ou o código-fonte
3. Verifique:
   - ✅ LocalBusiness schema detectado
   - ✅ Todos os campos preenchidos (name, address, telephone, url)
   - ✅ Sem erros

---

### 4. Testar Sitemap e robots.txt

#### Verificar robots.txt
```bash
# Acesse diretamente
https://doxologos.com.br/robots.txt

# Deve mostrar:
User-agent: *
Allow: /
Disallow: /admin/
...
Sitemap: https://doxologos.com.br/sitemap.xml
```

#### Verificar sitemap.xml
```bash
# Acesse diretamente
https://doxologos.com.br/sitemap.xml

# Deve listar todas as 11 URLs com prioridades
```

#### Google Search Console
1. Acesse: https://search.google.com/search-console
2. Adicione a propriedade `doxologos.com.br`
3. Vá em "Sitemaps"
4. Adicione `sitemap.xml`
5. Clique em "Enviar"
6. Aguarde status "Sucesso"

---

### 5. Testar PWA Manifest

#### Chrome DevTools
1. Abra o site: `https://doxologos.com.br`
2. Pressione F12 (DevTools)
3. Vá na aba "Application"
4. No menu lateral, clique em "Manifest"
5. Verifique:
   - ✅ Nome: "Doxologos - Psicologia Cristã Online"
   - ✅ Short name: "Doxologos"
   - ✅ Theme color: #2d8659
   - ✅ Ícones: 192x192 e 512x512 (após criar)
   - ✅ Display: standalone
   - ✅ Start URL: /

#### Testar Instalação PWA
1. No Chrome mobile: Menu → "Adicionar à tela inicial"
2. Verifique se o app instala com ícone correto
3. Abra o app instalado
4. Verifique se abre sem barra de navegação (standalone)

---

### 6. Testar Performance

#### Google PageSpeed Insights
1. Acesse: https://pagespeed.web.dev/
2. Cole a URL: `https://doxologos.com.br`
3. Clique em "Analisar"
4. Verifique scores:
   - 🎯 Performance: 90+ (meta)
   - 🎯 Accessibility: 95+ (meta)
   - 🎯 Best Practices: 100 (meta)
   - 🎯 SEO: 100 (meta)

**Principais métricas**:
- **FCP** (First Contentful Paint): <1.8s
- **LCP** (Largest Contentful Paint): <2.5s
- **TBT** (Total Blocking Time): <200ms
- **CLS** (Cumulative Layout Shift): <0.1

---

#### Lighthouse (CLI)
```bash
# Instalar globalmente
npm install -g lighthouse

# Executar audit
lighthouse https://doxologos.com.br --view

# Salvar relatório
lighthouse https://doxologos.com.br --output html --output-path ./lighthouse-report.html
```

---

### 7. Testar Lazy Loading

1. Abra o site
2. Pressione F12 (DevTools)
3. Vá na aba "Network"
4. Filtre por "Img"
5. Recarregue a página
6. Verifique:
   - ✅ Imagens fora da tela não carregam imediatamente
   - ✅ Imagens carregam ao fazer scroll

---

### 8. Verificar Indexação Google

#### Google Search
```bash
# Buscar no Google
site:doxologos.com.br

# Deve retornar todas as páginas indexadas
```

#### Google Search Console
1. Acesse: https://search.google.com/search-console
2. Vá em "Cobertura"
3. Verifique:
   - ✅ Páginas indexadas: 11 (esperado)
   - ✅ Páginas excluídas: 0 erros
   - ✅ Páginas válidas com avisos: 0

---

### 9. Testar Alt Text de Imagens

1. Abra o site
2. Pressione F12 (DevTools)
3. Vá na aba "Elements"
4. Busque por `<img` (Ctrl+F)
5. Verifique:
   - ✅ Todas as tags `<img>` possuem atributo `alt`
   - ✅ Alt text é descritivo (não vazio)

---

### 10. Validar HTML

#### W3C Validator
1. Acesse: https://validator.w3.org/
2. Cole a URL: `https://doxologos.com.br`
3. Clique em "Check"
4. Verifique:
   - ✅ Sem erros críticos
   - ⚠️ Warnings aceitáveis (informacionais)

---

## 🎯 Checklist de Validação

### Pré-Deploy
- [ ] Rodar Lighthouse local
- [ ] Verificar console do browser (sem erros)
- [ ] Testar responsive (mobile + desktop)
- [ ] Verificar todos os links (não quebrados)

### Pós-Deploy
- [ ] Verificar robots.txt acessível
- [ ] Verificar sitemap.xml acessível
- [ ] Testar Open Graph (Facebook Debugger)
- [ ] Testar Twitter Cards (Twitter Validator)
- [ ] Testar Rich Snippets (Google Rich Results Test)
- [ ] Submeter sitemap no Search Console
- [ ] Executar PageSpeed Insights
- [ ] Validar HTML (W3C)
- [ ] Testar PWA install (mobile)
- [ ] Verificar lazy loading funciona

### Após 1 Semana
- [ ] Verificar indexação no Google (`site:doxologos.com.br`)
- [ ] Monitorar Search Console (cobertura, erros)
- [ ] Verificar Analytics (tráfego orgânico)

### Após 2-4 Semanas
- [ ] Verificar se FAQ Rich Snippets aparecem no Google
- [ ] Monitorar posicionamento keywords (Search Console)
- [ ] Analisar CTR orgânico
- [ ] Verificar Knowledge Panel (Google)

---

## 🛠️ Comandos Úteis

### Build de Produção
```bash
npm run build
```

### Preview Local
```bash
npm run preview
```

### Testar PWA Local
```bash
# Usar HTTPS local (PWA requer HTTPS)
npx serve dist -l 8080 --ssl-cert cert.pem --ssl-key key.pem
```

### Gerar Certificado SSL Local (para PWA)
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

---

## 📊 Ferramentas de Monitoramento Contínuo

### Gratuitas
- **Google Search Console**: Monitorar indexação, erros, queries
- **Google Analytics 4**: Tráfego, comportamento, conversões
- **Bing Webmaster Tools**: Indexação no Bing
- **Ubersuggest**: Monitorar posições de keywords (limite gratuito)

### Pagas (Opcionais)
- **Ahrefs**: Backlinks, keywords, concorrentes
- **SEMrush**: SEO audit completo, tracking de posições
- **Moz**: Domain Authority, link analysis

---

## 🚨 Problemas Comuns e Soluções

### Open Graph não atualiza
**Solução**: Usar Facebook Debugger → "Scrape Again"

### Rich Snippets não aparecem
**Solução**: Aguardar 2-4 semanas. Google precisa recrawl.

### Sitemap não indexado
**Solução**: 
1. Verificar formato XML correto
2. Reenviar no Search Console
3. Verificar robots.txt não bloqueia

### PWA não instala
**Solução**:
1. Verificar HTTPS ativo
2. Verificar service worker registrado
3. Verificar manifest válido

### Lighthouse score baixo
**Solução**:
1. Otimizar imagens (TinyPNG)
2. Adicionar lazy loading
3. Minificar CSS/JS
4. Ativar compressão gzip no servidor

---

## ✅ Aprovação Final

Após passar em todos os testes:
- ✅ Meta tags validadas
- ✅ Rich Snippets detectados
- ✅ PWA instalável
- ✅ Performance >90
- ✅ Sitemap submetido
- ✅ Sem erros no console

**Status**: Pronto para monitoramento contínuo 🎉

---

**Última atualização**: 2025  
**Próxima revisão**: Após criar imagens e ícones PWA
