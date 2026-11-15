# ⚡ DOXOLOGOS CORE INVARIANTS (Tier 1 Active Memory)
> **Versão:** 3.0 (Elite Antigravity Runtime) | **Custo Contextual:** < 1.500 tokens | **Uso:** Carregamento obrigatório.

---

## 🏛️ 1. Governança Crítica & Tolerância Zero
* **Postura Ativa Mandatória:** A squad nunca executa ordens destrutivas ou refatorações de forma passiva. Avalia o *Blast Radius* transversalmente antes de qualquer código.
* **Gated Execution:** Refatorações pesadas, deleções e mudanças de schema exigem mapeamento de risco e trava de aprovação.
* **Tolerância Zero para Regressões & Band-Aids:** Proibido mascarar sintomas locais. Resolução em 3 passos: Diagnóstico Forense -> Solução Imediata -> Evolução Estrutural.

---

## 🛡️ 2. As 8 Invariantes Invioláveis de Engenharia e Saúde Mental
1. **SSOT em Serviços Canônicos (`src/services/`):**
   * Componentes de UI NUNCA chamam o Supabase diretamente para mutações de domínio. Consomem `professionalService.js`, `bookingService.js`, `paymentService.js`, `patientService.js` ou `refundService.js`.
2. **Banco Soberano vs Efeitos Colaterais Assíncronos:**
   * Mutações no PostgreSQL são prioritárias e atômicas. Efeitos colaterais (SMTP, webhooks, Meet) rodam isolados com tratamento defensivo de falha.
3. **Proteção Contra Schema Drift (Whitelists):**
   * Todo serviço canônico impõe `ALLOWED_FIELDS` validados contra o catálogo oficial para impedir erro Postgres `42703`.
4. **Sigilo Clínico & Zero PII (CFP / LGPD Art. 11):**
   * Proibido logar ou submeter a LLMs senhas, CPF, cartões ou anotações de prontuários psicológicos (Art. 9º Código de Ética CFP).
5. **Segurança Supabase RLS & RBAC:**
   * 100% das tabelas possuem RLS ativo. Edge Functions administrativas validam papéis via `app_metadata` (ADR 012).
6. **Fintech Idempotence:**
   * Ingestão de webhooks e mutações de pagamento checam idempotência atômica (`mp_payment_id` / chave) com resposta em < 50ms (ADR 013).
7. **AI Runtime Ops & Cache Semântico:**
   * Chamadas de LLM utilizam sanitização de prompt, cache semântico para perguntas frequentes e controle rígido de tokens/latência.
8. **Validação Dinâmica por Execução Real:**
   * Nenhuma tarefa é concluída sem status verde nos comandos do terminal. Comando mestre: `npm run squad:check`.

---

## 📦 3. Catálogo Canônico de Serviços & Componentes Chave
* **Catálogo Oficial de Banco:** [`src/constants/databaseCatalog.json`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/constants/databaseCatalog.json) (57 tabelas inspecionadas via OpenAPI).
* **Profissionais (`professionals`):** [`src/services/professionalService.js`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/services/professionalService.js) (RPC `admin_list_users` prioritário para e-mails).
* **Agendamentos (`bookings`):** [`src/services/bookingService.js`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/services/bookingService.js) (`booking_time` estritamente VARCHAR(5) 'HH:mm', status válidos e disparo resiliente).
* **Pagamentos (`payments`):** [`src/services/paymentService.js`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/services/paymentService.js) (SSOT Mercado Pago, whitelist de 39 colunas, idempotência).
* **Pacientes & Prontuários (`patient_notes`):** [`src/services/patientService.js`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/services/patientService.js) (SSOT tarefas e notas clínicas).
* **Reembolsos & Cancelamentos (`payment_refunds`):** [`src/services/refundService.js`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/services/refundService.js) (SSOT unificado de estornos manuais fintech, cancelamentos de pacientes e pacotes/eventos).
* **Segurança Backend:** [`supabase/functions/_shared/auth.ts`](file:///c:/Users/ander/source/repos/frontend_doxologos/supabase/functions/_shared/auth.ts) (`getUserRoles`, `requireAdmin`, `hasAnyRole`).
* **Cache Reativo TanStack Query:** [`src/hooks/queries/`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/hooks/queries/) (invalidação atômica e cache anti-flicker).
* **Observabilidade Real-User:** [`src/lib/observability/rumMonitoring.js`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/lib/observability/rumMonitoring.js) (Web Vitals e telemetria de APIs).

---

## 🧪 4. Fitness Functions & Comandos Obrigatórios de Pipeline
* **Auditoria de Guardrails Arquiteturais:** `npm run check:architecture`
* **Suíte Completa de Testes Automatizados:** `npm test`
* **Compilação de Produção sem Falhas:** `npm run build`
* **Gatekeeper Automatizado Mestre:** `npm run squad:check`

---
*Para histórico completo de decisões e ADRs detalhadas (ADR 001 a ADR 016), consulte [`.squad/03_SQUAD_MEMORY.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/03_SQUAD_MEMORY.md).*
