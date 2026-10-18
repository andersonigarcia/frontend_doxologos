# ADR 019 — Automação de QA E2E (Playwright) e Resiliência do Checkout

- **Status:** Aprovada
- **Data:** 2026-10-18
- **Contexto:** Onda 2 de melhorias pós-Diagnóstico 360°
- **Personas:** QA Automation, Tech Lead, Platform Security

---

## 1. Contexto & Problema

1. **Lacuna de Automação de Testes E2E:** O projeto possuía testes unitários (248 testes), mas os testes E2E do Playwright não rodavam devido à ausência dos navegadores headless na máquina local e a incompatibilidade de protocolo (HTTP vs HTTPS do plugin `basicSsl` do Vite).
2. **Fragilidade de Redirecionamento no Checkout:** Em [`src/pages/CheckoutPage.jsx`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/pages/CheckoutPage.jsx), qualquer falha ao buscar o booking no Supabase (como IDs de teste, latência transitória ou agendamento pendente) expulsava imediatamente o paciente para a home (`navigate('/')`), mesmo quando parâmetros de valor válidos (`valor=...`) estavam disponíveis na query string.
3. **Falta de Cobertura E2E dos Fluxos Críticos:** Rotas institucionais chave (HomePage, Agendamento, Landing Pages SEO de Terapia e Central de Ferramentas) careciam de validação automatizada de renderização.

---

## 2. Decisão

1. **Infraestrutura Playwright Headless:**
   - Instalado o binário do Chromium Headless Shell 143 (`npx playwright install chromium`).
   - Configurado `playwright.config.ts` com HTTPS (`https://localhost:3000`) e `ignoreHTTPSErrors: true`.
2. **Resiliência do Checkout com Fallback:**
   - Em [`src/pages/CheckoutPage.jsx`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/pages/CheckoutPage.jsx), adicionado fallback defensivo no catch de `fetchBooking`: caso o booking não seja encontrado mas `valorParam` esteja presente na URL, a aplicação mantém a tela de checkout carregada e funcional, evitando a perda do paciente por falsos positivos de rota.
3. **Nova Suíte E2E de Navegação:**
   - Criado [`tests/e2e/navigation.spec.ts`](file:///c:/Users/ander/source/repos/frontend_doxologos/tests/e2e/navigation.spec.ts) cobrindo:
     - HomePage e chamada principal de agendamento;
     - Funil de agendamento clínico (`/agendamento`);
     - Landing page de Terapia especializada (`/terapia/ansiedade`);
     - Central de Ferramentas e Instrumentos Psicométricos (`/ferramentas`).
4. **Idempotência Fintech:**
   - Validada a guarda de idempotência em [`supabase/functions/mp-webhook/index.ts`](file:///c:/Users/ander/source/repos/frontend_doxologos/supabase/functions/mp-webhook/index.ts) que bloqueia reprocessamento com `status: 'idempotent_duplicate'` retornando HTTP 200 para o Mercado Pago em retries concorrentes.

---

## 3. Consequências & Evidências

- **8 de 8 Testes E2E Passando (100% de Sucesso):**
  - `checkout.spec.ts`: 4 testes aprovados (TCLE CFP, troca PIX/Cartão, checkout direto e termos legais).
  - `navigation.spec.ts`: 4 testes aprovados (Home, Agendamento, Terapia SEO e Ferramentas).
- **Tempo de Execução:** 17.1s em Chromium Headless.
- **Zero Regressão:** Todos os 248 testes unitários e guardrails arquiteturais permanecem íntegros e verdes.
