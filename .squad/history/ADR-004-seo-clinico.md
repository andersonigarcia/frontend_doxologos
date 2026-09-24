# ADR-004 — Otimização de SEO Clínico

**Status:** Aceita  
**Data:** 2026-09-24  
**Squad:** Data & Growth Analyst + Fullstack Dev  
**Orquestrador:** Doxologos

---

## Contexto

A plataforma não possuía tags de SEO consistentes entre as páginas prioritárias. Alguns títulos ultrapassavam 60 caracteres, descriptions estavam abaixo de 100 chars sem CTA, canonical apontava para o ambiente de staging (`novo.doxologos.com.br`) na página de Ferramentas, e faltavam OG, Twitter Card e Schema.org estruturado em páginas-chave.

**Restrição ética CFP:** Todos os textos devem ser isentos de promessas de cura ou resultados garantidos.

---

## Decisão

Implementar SEO clínico completo nas 4 páginas prioritárias via `react-helmet-async` (padrão já existente no projeto):

| Página | Title (≤60) | Description (≤155) | OG | Twitter | Schema.org |
|--------|------------|-------------------|-----|---------|-----------|
| `/` (Home) | 54 chars | 134 chars | completo | sim | MedicalBusiness + FAQPage |
| `/agendamento` | 52 chars | 141 chars | completo | sim | Service |
| `/artigos` | 49 chars | 155 chars | completo | sim | — (listing) |
| `/ferramentas` | 57 chars | 153 chars | completo | sim | WebApplication |

**Adicionalmente:**
- `ArticlePage.jsx`: migrado schema de `Article` para `BlogPosting`, adicionado `canonical`, `mainEntityOfPage`, Twitter Card e fallback para `og:image`.
- `index.html`: alinhado title/meta/OG/Twitter ao novo copy da Home.
- Canonical da `/ferramentas` corrigido de `novo.doxologos.com.br` → `doxologos.com.br`.

---

## Alternativas Consideradas

- Criar componente `<SeoHead />` centralizado: descartado para esta iteração por minimizar impacto; pode ser feito futuramente como refatoração.

---

## Consequências

- Páginas agora têm dados estruturados válidos para Google Rich Results e compartilhamento social rico.
- **Atenção:** `index.html` serve como fallback antes de React hidratar; manter copy em sincronia manual com `HomePage.jsx`.
- **Próximos passos:** Validar no Google Rich Results Test após deploy; submeter sitemap ao Google Search Console.

---

## Build

```
built in 11.34s | exit code 0
```
