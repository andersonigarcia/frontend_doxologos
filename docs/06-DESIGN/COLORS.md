# 🎨 Sistema de Cores - Doxologos

Este documento consolida todas as informações sobre a paleta de cores do sistema Doxologos.

---

## 🎯 Paleta Principal Atual

### Cores Primárias
- **Azul Principal**: `#1e40af` (blue-800)
- **Azul Hover**: `#1e3a8a` (blue-900)
- **Azul Claro**: `#3b82f6` (blue-500)

### Cores Secundárias
- **Verde Sucesso**: `#10b981` (green-500)
- **Amarelo Aviso**: `#f59e0b` (amber-500)
- **Vermelho Erro**: `#ef4444` (red-500)

### Cores Neutras
- **Cinza Escuro**: `#1f2937` (gray-800)
- **Cinza Médio**: `#6b7280` (gray-500)
- **Cinza Claro**: `#f3f4f6` (gray-100)
- **Branco**: `#ffffff`

---

## 🆕 Opção 2: Paleta Complementar (Proposta)

### Cores Primárias Alternativas
- **Roxo Profundo**: `#6366f1` (indigo-500)
- **Roxo Hover**: `#4f46e5` (indigo-600)
- **Roxo Claro**: `#818cf8` (indigo-400)

### Gradientes Sugeridos
```css
/* Gradiente Principal */
background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);

/* Gradiente Sutil */
background: linear-gradient(to right, #f3f4f6, #e5e7eb);
```

---

## 📊 Comparação Visual

### Opção 1 (Azul - Atual)
**Vantagens:**
- ✅ Transmite confiança e profissionalismo
- ✅ Amplamente aceito em contextos médicos
- ✅ Boa legibilidade
- ✅ Acessível (WCAG AA+)

**Desvantagens:**
- ⚠️ Comum em muitos sites
- ⚠️ Pode parecer "corporativo demais"

### Opção 2 (Roxo/Indigo - Proposta)
**Vantagens:**
- ✅ Mais moderno e diferenciado
- ✅ Associado a criatividade e bem-estar
- ✅ Destaque visual maior
- ✅ Bom para branding

**Desvantagens:**
- ⚠️ Menos tradicional para área médica
- ⚠️ Pode precisar ajustes de contraste

---

## 🎨 Aplicação no Sistema

### Botões
```css
/* Primário */
.btn-primary {
  background-color: #1e40af;
  color: white;
}

.btn-primary:hover {
  background-color: #1e3a8a;
}

/* Secundário */
.btn-secondary {
  background-color: #6b7280;
  color: white;
}
```

### Cards e Containers
```css
.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

### Estados
```css
/* Sucesso */
.status-success {
  background-color: #d1fae5;
  color: #065f46;
}

/* Aviso */
.status-warning {
  background-color: #fef3c7;
  color: #92400e;
}

/* Erro */
.status-error {
  background-color: #fee2e2;
  color: #991b1b;
}
```

---

## ♿ Acessibilidade

### Contraste de Cores (WCAG 2.1)

Todas as combinações de cores devem atender ao nível AA (mínimo 4.5:1 para texto normal):

| Combinação | Contraste | Status |
|------------|-----------|--------|
| Azul (#1e40af) + Branco | 8.59:1 | ✅ AAA |
| Cinza Escuro (#1f2937) + Branco | 15.96:1 | ✅ AAA |
| Verde (#10b981) + Branco | 2.35:1 | ❌ Falha |
| Verde (#10b981) + Cinza Escuro | 6.79:1 | ✅ AAA |

**Recomendação**: Sempre usar texto escuro em fundos claros de verde/amarelo/vermelho.

---

## 🖼️ Guia Canva

### Como Criar Assets Consistentes

1. **Acesse o Canva**: https://canva.com
2. **Use a paleta do projeto**:
   - Adicione as cores principais aos favoritos
   - Use os códigos hex fornecidos acima
3. **Templates recomendados**:
   - Banners: 1200x628px
   - Posts Instagram: 1080x1080px
   - Stories: 1080x1920px

### Fontes Recomendadas
- **Títulos**: Inter Bold / Poppins Bold
- **Corpo**: Inter Regular / Roboto Regular
- **Destaque**: Inter SemiBold

---

## 📝 Notas de Implementação

### TailwindCSS
As cores estão configuradas no `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e40af',
          hover: '#1e3a8a',
        },
      },
    },
  },
}
```

### CSS Variables
```css
:root {
  --color-primary: #1e40af;
  --color-primary-hover: #1e3a8a;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}
```

---

## 🔄 Histórico de Mudanças

### v2.1 (Dez 2025)
- Consolidação de documentação de cores
- Adição de guia de acessibilidade

### v2.0 (Jan 2025)
- Proposta de paleta complementar (roxo/indigo)
- Comparação visual entre opções

### v1.0 (Out 2024)
- Paleta azul inicial implementada

---

**Última atualização**: 30 de Dezembro de 2025
