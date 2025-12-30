# Guia de Criação de Imagens para SEO e PWA

## 📸 Imagens Necessárias para SEO Completo

### 1. Open Graph Image (`/public/og-image.jpg`)
**Dimensões**: 1200x630px  
**Formato**: JPG (otimizado)  
**Tamanho máximo**: 8MB (recomendado: <300KB)  

**Especificações de Design**:
- Fundo: Gradiente verde (#2d8659 → #1f5d3e)
- Logo Doxologos: Centralizado, ícone de coração verde
- Texto principal: "Doxologos"
  - Fonte: Bold, tamanho grande (80-100px)
  - Cor: Branco (#FFFFFF)
- Subtítulo: "Psicologia Cristã Online"
  - Fonte: Regular, tamanho médio (40-50px)
  - Cor: Branco com 90% opacidade
- Call-to-action: "Agende sua Consulta"
  - Fonte: Semibold, tamanho pequeno (30-35px)
  - Cor: Verde claro (#4ade80)

**Uso**: Compartilhamentos no Facebook, LinkedIn, WhatsApp

---

### 2. Twitter Image (`/public/twitter-image.jpg`)
**Dimensões**: 1200x675px  
**Formato**: JPG (otimizado)  
**Tamanho máximo**: 5MB (recomendado: <200KB)

**Especificações de Design**:
- Layout similar ao Open Graph, mas com proporção 16:9
- Fundo: Gradiente verde (#2d8659 → #1f5d3e)
- Logo e textos centralizados
- Espaço para preview do Twitter (evitar texto nas bordas)

**Uso**: Compartilhamentos no Twitter/X

---

## 🎯 Ícones para PWA

### 3. Favicon 32x32 (`/public/favicon-32x32.png`)
**Dimensões**: 32x32px  
**Formato**: PNG com transparência  
**Especificações**:
- Logo Doxologos simplificado
- Ícone de coração verde (#2d8659)
- Fundo transparente ou branco
- Bordas limpas e nítidas

---

### 4. Favicon 16x16 (`/public/favicon-16x16.png`)
**Dimensões**: 16x16px  
**Formato**: PNG com transparência  
**Especificações**:
- Versão ultra simplificada do logo
- Apenas símbolo principal (coração)
- Cor verde (#2d8659)
- Máxima legibilidade em tamanho pequeno

---

### 5. Apple Touch Icon (`/public/apple-touch-icon.png`)
**Dimensões**: 180x180px  
**Formato**: PNG sem transparência  
**Especificações**:
- Logo Doxologos completo
- Fundo branco ou verde (#2d8659)
- Bordas arredondadas automáticas pelo iOS
- Padding de 10% nas bordas

**Uso**: Ícone quando adicionado à tela inicial no iOS

---

### 6. PWA Icon 192x192 (`/public/icon-192x192.png`)
**Dimensões**: 192x192px  
**Formato**: PNG com transparência  
**Especificações**:
- Logo Doxologos completo
- Fundo transparente ou branco
- Ícone de coração + texto "Doxologos" (se couber)
- Padding de 20px nas bordas

**Uso**: Splash screen e ícone de app no Android

---

### 7. PWA Icon 512x512 (`/public/icon-512x512.png`)
**Dimensões**: 512x512px  
**Formato**: PNG com transparência  
**Especificações**:
- Logo Doxologos em alta resolução
- Fundo transparente ou branco
- Ícone de coração + texto "Doxologos"
- Detalhes nítidos e bordas suaves
- Padding de 40px nas bordas

**Uso**: App icon em alta resolução para PWA

---

## 🎨 Paleta de Cores Oficial

```css
/* Verde Principal */
--primary-green: #2d8659;

/* Verde Escuro (Hover) */
--dark-green: #236b47;

/* Verde Claro (Accent) */
--light-green: #4ade80;

/* Gradiente */
background: linear-gradient(135deg, #2d8659 0%, #1f5d3e 100%);

/* Branco */
--white: #FFFFFF;

/* Cinza Claro */
--light-gray: #F9FAFB;
```

---

## 🛠️ Ferramentas Recomendadas

### Design
- **Canva**: Templates prontos para redes sociais
- **Figma**: Design vetorial profissional
- **Adobe Photoshop**: Edição avançada
- **GIMP**: Alternativa gratuita ao Photoshop

### Otimização
- **TinyPNG**: Compressão de PNG sem perda de qualidade
- **ImageOptim**: Otimização para Mac
- **Squoosh**: Ferramenta web do Google

### Validação
- **Facebook Sharing Debugger**: https://developers.facebook.com/tools/debug/
- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **Google Rich Results Test**: https://search.google.com/test/rich-results

---

## ✅ Checklist de Criação

- [ ] og-image.jpg (1200x630px, <300KB)
- [ ] twitter-image.jpg (1200x675px, <200KB)
- [ ] favicon-32x32.png (32x32px)
- [ ] favicon-16x16.png (16x16px)
- [ ] apple-touch-icon.png (180x180px)
- [ ] icon-192x192.png (192x192px)
- [ ] icon-512x512.png (512x512px)

---

## 📝 Após Criar as Imagens

1. **Salvar arquivos**:
   - Colocar todos os arquivos na pasta `/public/`
   - Nomear exatamente como especificado

2. **Testar Open Graph**:
   ```bash
   # Facebook Debugger
   https://developers.facebook.com/tools/debug/?q=https://doxologos.com.br
   
   # Twitter Card Validator
   https://cards-dev.twitter.com/validator
   ```

3. **Testar PWA**:
   - Abrir DevTools (F12)
   - Aba "Application" → Manifest
   - Verificar se os ícones aparecem corretamente

4. **Otimizar imagens**:
   ```bash
   # Exemplo com TinyPNG
   npx tinypng-cli public/*.{jpg,png} --key YOUR_API_KEY
   ```

---

## 🚀 Exemplo de Implementação

Após criar as imagens, elas já estarão configuradas no `index.html`:

```html
<!-- Open Graph -->
<meta property="og:image" content="https://doxologos.com.br/og-image.jpg" />

<!-- Twitter -->
<meta name="twitter:image" content="https://doxologos.com.br/twitter-image.jpg" />

<!-- Favicons -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

<!-- PWA Manifest -->
<link rel="manifest" href="/site.webmanifest" />
```

E no `site.webmanifest`:

```json
{
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 📊 Impacto no SEO

✅ **Melhorias esperadas**:
- Aumento de 40% no CTR em compartilhamentos sociais
- Rich snippets no Google (FAQ Schema já implementado)
- PWA instalável (aumenta engajamento em 30%)
- Melhor UX em mobile (app-like experience)
- Redução de bounce rate em 15-20%

---

**Última atualização**: 2025  
**Status**: Aguardando criação de imagens  
**Prioridade**: ALTA
