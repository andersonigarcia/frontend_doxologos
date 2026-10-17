# ADR 012: Blindagem de Segurança, RBAC Centralizado em app_metadata e Defesa em Profundidade

- **Data:** 2026-10-12
- **Status:** Aceito e Implementado
- **Decisores:** Platform Security, Tech Lead, Fullstack Dev

---

## 1. Contexto
Auditoria de segurança identificou que Edge Functions administrativas estavam verificando `user.user_metadata?.role !== 'admin'`. Como `user_metadata` pode ser modificado pelo cliente se não bloqueado no Supabase e não suporta o modelo Multi-Perfil Híbrido (ADR 005), isso gerava risco de elevação de privilégios e falso 403 para administradores com papéis múltiplos. Além disso, faltava uma Content Security Policy (CSP) explícita no HTML.

## 2. Decisão
1. **SSOT de Autenticação Backend:** Criar `supabase/functions/_shared/auth.ts` como SSOT de validação de autenticação e RBAC no backend/Edge Functions com funções: `getUserRoles`, `isAdminUser`, `hasAnyRole`, `authenticateCaller` e `requireAdmin`.
2. **Refatoração de Edge Functions:** Refatorar todas as Edge Functions administrativas para utilizar `_shared/auth.ts`.
3. **CSP Estrita:** Implementar meta tag de Content Security Policy (CSP) estrita em `index.html` restringindo origens para Google Tag Manager, Mercado Pago SDK, Supabase REST/WebSockets, Google Fonts e YouTube.
4. **Guardrails de Segurança:** Expandir `scripts/check-architecture-guardrails.js` e `architectureGuardrails.test.js` para garantir existência de `_shared/auth.ts`, meta tag CSP e ausência de verificações inseguras de `user.user_metadata?.role` em funções administrativas.

## 3. Consequências
- Blindagem absoluta contra elevação indevida de privilégios.
- Suporte nativo a perfis híbridos (ADR 005).
- Padronização DRY do pipeline de autenticação Deno e proteção contra ataques XSS via CSP.
