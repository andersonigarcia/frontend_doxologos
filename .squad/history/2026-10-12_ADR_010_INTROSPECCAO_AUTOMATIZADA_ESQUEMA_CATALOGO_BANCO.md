# ADR 010: Introspecção Automatizada de Esquema e Catálogo Canônico de Banco

- **Data:** 2026-10-12
- **Status:** Aceito e Implementado
- **Decisores:** Tech Lead, Platform Security, Fullstack Dev

---

## 1. Contexto
Erros recorrentes de colunas inexistentes ou schema drift (ex: `time` vs `booking_time`, `meeting_platform`, envio de `email` para `professionals`) causados por documentação manual em ASCII propensa a defasagem em relação ao PostgreSQL real do Supabase.

## 2. Decisão
1. **Introspecção Automática:** Criar script `scripts/sync-schema-catalog.js` que se conecta via PostgREST OpenAPI (`${SUPABASE_URL}/rest/v1/`) e gera o arquivo canônico versionado `src/constants/databaseCatalog.json` (57 tabelas/views mapeadas).
2. **Helper de Validação:** Implementar `src/lib/validation/schemaValidator.js` com funções utilitárias `getTableColumns`, `isColumnValid` e `validatePayloadAgainstSchema`.
3. **Auditoria Estrita de Whitelist:** Integrar validação no guardrail `scripts/check-architecture-guardrails.js` para auditar se os arrays de campos permitidos (`ALLOWED_PROFESSIONAL_FIELDS`, `ALLOWED_BOOKING_FIELDS`) contêm exclusivamente colunas existentes no banco.
4. **Comando de Pipeline:** Adicionar comando `npm run schema:sync` no `package.json`.
5. **Suíte de Testes:** Adicionar suíte de testes `src/services/__tests__/schemaValidator.test.js`.

## 3. Consequências
- Prevenção mecânica absoluta de schema drift.
- Detecção imediata de campos fantasmas no build e nos testes antes de produção.
- Sincronização contínua com as migrações do Supabase.
