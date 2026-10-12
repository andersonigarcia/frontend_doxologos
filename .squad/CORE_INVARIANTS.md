# ⚡ DOXOLOGOS CORE INVARIANTS (Tier 1 Active Memory)
> **Versão:** 1.0 (Elite Model) | **Custo Contextual:** < 1.500 tokens | **Uso:** Carregamento obrigatório em qualquer sessão.

---

## 🏛️ 1. Missão & Tolerância Zero
* Plataforma de telepsicologia com agendamentos 24/7 e checkout transparente (Mercado Pago).
* **Tolerância Zero para Regressões:** Qualquer falha impacta diretamente na receita da clínica, na agenda dos psicólogos e no atendimento a pacientes.
* **Tolerância Zero para "Band-Aids":** Proibido corrigir sintomas locais isolados sem tratar a causa raiz e o raio de alcance (blast radius) sistêmico.

---

## 🛡️ 2. As 7 Invariantes Invioláveis de Engenharia

1. **SSOT em Serviços Canônicos (`src/services/`):**
   * Componentes de UI NUNCA fazem `.from('tabela').update()` ou `.insert()` diretamente.
   * Toda mutação ou consulta de domínio consome a camada canônica de serviços.
2. **Banco Soberano vs Efeitos Colaterais Assíncronos:**
   * Mutações no PostgreSQL são prioritárias e atômicas.
   * Efeitos colaterais (e-mails SMTP, webhooks, Zoom/Meet) rodam desacoplados em blocos `try/catch` resilientes, sem abortar a transação do banco se a rede oscilar.
3. **Proteção Contra Schema Drift (Whitelists):**
   * Todo serviço canônico deve conter `ALLOWED_FIELDS` ou sanitização estrita para impedir o envio de propriedades fantasmas (ex: erro Postgres `42703`).
4. **Privacidade Rigorosa & Zero PII (LGPD / HIPAA / CFP):**
   * Proibido logar senhas, CPF, prontuários ou dados de cartão no console, Edge Functions ou prompts.
5. **Segurança Supabase RLS & Zero-Downtime:**
   * 100% das tabelas possuem RLS ativo. Migrações de banco seguem *Expand & Contract* (sem `DROP COLUMN` destrutivo direto).
6. **Sincronia Estrita de Documentação ([`ARCH.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/ARCH.md)):**
   * Qualquer coluna ou regra modificada no PostgreSQL deve ser imediatamente sincronizada no `ARCH.md`.
7. **Validação Empírica Automatizada:**
   * Nenhuma tarefa é declarada concluída sem validação via terminal. O comando mestre é `npm run squad:check`.

---

## 📦 3. Catálogo de Serviços Canônicos & Esquema
* **Catálogo Oficial de Banco:** [`src/constants/databaseCatalog.json`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/constants/databaseCatalog.json) (57 tabelas inspecionadas via OpenAPI)
* **Validador de Esquema:** [`src/lib/validation/schemaValidator.js`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/lib/validation/schemaValidator.js)
* **Profissionais (`professionals`):** [`src/services/professionalService.js`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/services/professionalService.js)
  * RPC prioritário para e-mails: `admin_list_users` no Postgres.
* **Agendamentos (`bookings`):** [`src/services/bookingService.js`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/services/bookingService.js)
  * Coluna real de horário: `booking_time`. Status válidos: `pending`, `confirmed`, `completed`, `cancelled`.
* **Pagamentos (`payments`):** [`src/services/paymentService.js`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/services/paymentService.js)
  * SSOT Mercado Pago, whitelisting de 39 colunas, busca por `mp_payment_id` e atualização atômica de status.
* **Pacientes & Prontuários (`patient_notes`):** [`src/services/patientService.js`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/services/patientService.js)
  * SSOT para tarefas de casa (homework), prontuários clínicos e histórico de sessões.
* **Segurança & RBAC de Edge Functions (SSOT):** [`supabase/functions/_shared/auth.ts`](file:///c:/Users/ander/source/repos/frontend_doxologos/supabase/functions/_shared/auth.ts)
  * Validação de papéis via `app_metadata.role` e `app_metadata.roles` (ADR 005 / ADR 012), `requireAdmin`, `hasAnyRole` e proteção CSP.
* **Resiliência Fintech & Webhook Idempotente (SSOT):** [`supabase/functions/mp-webhook/index.ts`](file:///c:/Users/ander/source/repos/frontend_doxologos/supabase/functions/mp-webhook/index.ts)
  * Barreira atômica de idempotência por `mp_payment_id` e execução assíncrona não bloqueante de NFS-e (ADR 013).
* **Reatividade de Dados & Camada de Cache (TanStack Query SSOT):** [`src/hooks/queries/`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/hooks/queries/)
  * Hooks canônicos de leitura e mutações com invalidação atômica e cache explícito (`staleTime`/`gcTime`) anti-flicker (ADR 014).

---

## 🧪 4. Fitness Functions & Comandos do Pipeline
* **Sincronização de Esquema (Supabase):** `npm run schema:sync`
* **Auditoria Arquitetural:** `npm run check:architecture`
* **Suíte de Testes:** `npm test`
* **Compilação de Produção:** `npm run build`
* **Gatekeeper Completo do Squad:** `npm run squad:check`

---
*Para histórico completo de decisões e ADRs detalhadas (ADR 001 a ADR 014), consulte a Memória Tier 2 em [`.squad/03_SQUAD_MEMORY.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/03_SQUAD_MEMORY.md).*

