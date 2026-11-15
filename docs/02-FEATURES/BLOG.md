# 📰 Blog (Integração Substack)

> **Status**: ✅ Implementado  
> **Funcionalidade**: Sincronização e exibição de artigos do Substack na plataforma

---

## 📋 Funcionalidades

- ✅ Sincronização manual de artigos via painel Admin
- ✅ Exibição de artigos publicados na página `/artigos`
- ✅ Visualização individual de artigo em `/artigos/:slug`
- ✅ Prévia dos últimos artigos na HomePage (seção "Artigos Recentes")
- ✅ Banner de captação de Newsletter integrado à HomePage

---

## 🗄️ Estrutura do Banco

### Tabela: `artigos`

```sql
CREATE TABLE artigos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT,
  slug TEXT UNIQUE NOT NULL,
  cover_image TEXT,
  author TEXT,
  published_at TIMESTAMP,
  status TEXT DEFAULT 'draft', -- draft | published
  substack_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## ⚙️ Edge Function: `sync-substack-manual`

Localização: `supabase/functions/sync-substack-manual/index.ts`

### Como Funciona

1. Acessa o feed RSS público do Substack da clínica.
2. Parseia os itens do feed e extrai título, conteúdo, slug e data de publicação.
3. Faz upsert na tabela `artigos` usando `slug` como chave de deduplicação.

### Feed Substack

- **URL do Substack**: `https://doxologosoficial.substack.com/`
- **Feed RSS**: `https://doxologosoficial.substack.com/feed`

### Executar Sincronização (Admin)

A sincronização é acionada pelo painel Admin. Não há webhook automático; o administrador deve disparar manualmente quando publicar um novo artigo no Substack.

---

## 💻 Componentes Principais

| Componente | Caminho | Descrição |
|---|---|---|
| `BlogPage` | `src/pages/BlogPage.jsx` | Lista artigos publicados, ordenados por data |
| `ArticlePage` | `src/pages/ArticlePage.jsx` | Renderiza artigo individual pelo `slug` |
| `BlogPreviewSection` | `src/components/home/BlogPreviewSection.jsx` | Exibe 3 artigos mais recentes na HomePage |

---

## 🔄 Fluxo de Publicação

```
1. Publicar artigo no Substack
2. Acessar Painel Admin → seção Blog
3. Clicar em "Sincronizar Artigos"
4. Edge Function busca feed RSS e faz upsert no banco
5. Artigo aparece em /artigos e na prévia da HomePage
```

---

## 🔄 Histórico de Mudanças

### v2.2 (Jul 2026)
- Implementação inicial da integração Substack
- Edge function `sync-substack-manual` criada e deployada
- `BlogPage` e `ArticlePage` criadas
- `BlogPreviewSection` e banner de Newsletter adicionados à HomePage

---

**Última atualização**: Julho de 2026
