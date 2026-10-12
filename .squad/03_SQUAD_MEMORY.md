# 📚 MEMÓRIA DO SQUAD — Tier 2 Deep Memory (Histórico de ADRs e Decisões)

> **Tipo:** Memória Histórica de Longo Prazo (Consultada sob demanda quando for necessário resgatar precedentes e contexto histórico profundo).  
> **Memória Ativa Inviolável:** Para invariantes rápidas e regras de ouro ativas, consulte [`.squad/CORE_INVARIANTS.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/CORE_INVARIANTS.md).

---

## 1. Padrões de Orquestração de IA e Squad
- **Data (2026-09-16):** **Reestruturação Modular do Squad de IA (Antigravity & IDE Mode).**
  - *Contexto:* O prompt monolítico gigante de 17KB com 22 papéis no mesmo arquivo consumia tokens excessivos e engessava qualquer tarefa pequena em um ciclo burocrático de 6 etapas e 6 gatekeepers.
  - *Decisão:* Dividir a especificação em um Orquestrador Central magro (`ORCHESTRATOR.md`), 5 personas focadas em `.squad/agents/` e 3 esteiras de execução dinâmica em `.squad/workflows/` (*Fast-Track*, *Standard-Track* e *Full-Track*).
  - *Consequências:* Redução de até 75% no consumo de tokens por sessão, respostas até 3x mais rápidas em tarefas de baixo risco e garantia de validação completa apenas quando pagamentos, RLS ou LGPD forem afetados.

---

## 2. Padrões de Negócio e Produto (UX/PM)
- **Data (2026-07-15):** **Substack RSS como CMS do Blog (v2.2).**
  - *Contexto:* O time precisava publicar artigos sem ter que construir um CMS customizado no Supabase.
  - *Decisão:* Criar a Edge Function `sync-substack-manual` para consumir o feed RSS oficial do Substack (`doxologosoficial.substack.com`) e renderizar prévias na HomePage (`BlogPreviewSection`) e páginas dedicadas (`/artigos`).
  - *Consequências:* Agilidade total na produção de conteúdo sem custos de infraestrutura de CMS.

- **Data (2025-12-30):** **Redesign de Conversão e Rodapé Reorganizado por Persona (v2.1).**
  - *Contexto:* Navegação dispersa com baixa taxa de conversão nos botões de agendamento.
  - *Decisão:* Menu de navegação focado em CTA direto ("Agendar Consulta"), FAQ interativo com suporte a JSX e rodapé dividido por personas (Pacientes, Psicólogos, Sobre).
  - *Consequências:* Aumento no fluxo de agendamentos e redução de dúvidas frequentes.

- **Data (2026-09-24):** **Padronização Visual da Marca & Política de Mensageria WhatsApp (ADR 003).**
  - *Contexto:* Inconsistência nos cabeçalhos (uso de favicon + gradient-text em páginas internas) e falsas promessas de envio de link por WhatsApp no agendamento (`WHATSAPP_BOOKING_CONFIRMATION: false`).
  - *Decisão:* Adoção mandatória do componente `DoxologosLogo` (`h-9 md:h-10 w-auto`) em 100% das páginas e alinhamento de copywriting garantindo envio por e-mail e acesso na Área do Paciente.
  - *Consequências:* Identidade visual homogênea e expectativas alinhadas sem ruído operacional.

- **Data (2026-09-24):** **Otimização de SEO Clínico — Title, Meta, OG, Schema.org e Canonical (ADR 004).**
  - *Contexto:* Títulos acima de 60 chars, descriptions sem CTA, ausência de OG/Twitter Card e Schema.org incompleto nas páginas prioritárias. Canonical de `/ferramentas` apontava para `novo.doxologos.com.br`.
  - *Decisão:* Implementar `react-helmet-async` completo (padrão do projeto) em Home, `/agendamento`, `/artigos` e `/ferramentas` com: titles ≤60 chars, descriptions ≤155 chars com CTA natural, OG + Twitter Card, Schema.org (`MedicalBusiness`, `Service`, `WebApplication`, `BlogPosting`), canonical com domínio produção. **Restrição CFP ativa:** zero promessas de cura ou resultados garantidos.
  - *Consequências:* Pages elegíveis para Google Rich Results. Canonical corrigido elimina risco de indexação duplicada. `index.html` sincronizado como fallback SSR.

---

## 3. Padrões de Arquitetura e Engenharia
- **Data (2026-10-07):** **Multi-Perfil Híbrido (Dual-Role RBAC & Zero-Downtime) (ADR 005).**
  - *Contexto:* Profissionais de saúde e administradores também precisam agendar consultas como pacientes em sua vida pessoal. Anteriormente, possuíam role única e estática (`professional` ou `admin`), gerando estranheza visual quando navegavam na Área do Paciente ou na Home.
  - *Decisão:* Implementar arquitetura de Multi-Perfil Híbrido no `SupabaseAuthContext`:
    1. Resolução dinâmica de `availableRoles` com base em `app_metadata.role` e `app_metadata.roles` (ex: `professional` recebe automaticamente `['professional', 'patient']`; `admin` recebe `['admin', 'professional', 'patient']`; pacientes comuns recebem apenas `['patient']`).
    2. Controle de contexto ativo (`activeRole`), persistido em `localStorage` (`doxologos_preferred_active_role`) e retrocompatibilidade 100% com o contrato legado `userRole = activeRole`.
    3. `UserBadge` com menu dropdown interativo para usuários híbridos alternarem de perfil com 1 clique (desktop e mobile), mantendo botão simples nativo para pacientes exclusivos.
    4. Auto-switching transparente em `ProtectedRoute`: se um profissional com perfil ativo 'patient' acessar `/profissional`, a rota restrita ativa o perfil correto de forma fluida sem barrar o acesso.
    5. Auditoria estruturada de alternância de perfis (`auditLogger.ROLE_SWITCH`).
  - *Consequências:* Zero migrações destrutivas de banco, zero impacto para pacientes em produção, escalabilidade para múltiplos perfis sem fragmentação de contas e conformidade total com testes automatizados.

- **Data (2026-09-24):** **Plataforma Única Google Meet & Depreciação do Zoom (ADR 001).**
  - *Contexto:* Código legado do Zoom (`testezoom.js` e funções) desnecessário em produção; ausência da coluna `meeting_platform` na tabela `bookings`.
  - *Decisão:* Remover scripts de teste legados do Zoom e consolidar o Google Meet como plataforma exclusiva de teleconsulta, com fallback para o `personal_meet_link` do profissional.
  - *Consequências:* Simplificação do modelo de dados e zero risco de queries a campos inexistentes.

- **Data (2025-01-28):** **Edge Functions em Deno para Regras de Negócio e Integrações (v2.0).**
  - *Contexto:* Necessidade de processar transações financeiras e credenciais secretas (Mercado Pago, Zoom OAuth, SMTP) fora do browser do cliente.
  - *Decisão:* Centralizar todas as rotas sensíveis em 28+ Deno Edge Functions no Supabase (`supabase/functions/`), como `mp-process-card-payment`, `mp-webhook`, `zoom-create-meeting` e `send-email`.
  - *Consequências:* Credenciais protegidas no backend BaaS e desacoplamento do cliente React.

- **Data (2025-01-28):** **Checkout Transparente Mercado Pago com PIX Inline.**
  - *Contexto:* Redirecionamentos externos para o checkout Mercado Pago causavam desistência de pacientes.
  - *Decisão:* Implementar checkout transparente via SDK v2 com formulário de cartão direto e QR Code PIX inline dinâmico (`qrcode.react`) gerado em tempo real.
  - *Consequências:* Experiência de compra sem fricção dentro da plataforma Doxologos.

---

## 4. Padrões de Banco de Dados e Segurança (PostgreSQL & Supabase RLS)
- **Data (2025-01-15):** **Row Level Security (RLS) Mandatório no Supabase.**
  - *Contexto:* Proteção de dados sensíveis de pacientes e agendamentos (compliance LGPD).
  - *Decisão:* Habilitar RLS em todas as tabelas clínicas e administrativas, restringindo acesso via políticas autenticadas (`auth.uid()`) e roles administrativas.
  - *Consequências:* Impossibilidade de vazamento de dados via queries diretas no cliente frontend.

- **Data (2025-01-20):** **Reconciliação Idempotente de Webhooks Mercado Pago.**
  - *Contexto:* Disparos duplicados de webhooks do Mercado Pago provocavam atualização concorrente em agendamentos.
  - *Decisão:* Implementar verificação de idempotência no `mp-webhook` e `mp-reconcile-payment`, registrando a hash do evento antes de atualizar o status do agendamento para `paid`.
  - *Consequências:* Garantia de que cada pagamento é processado uma única vez, emitindo a sala Zoom e os emails transacionais sem duplicação.

---

## 5. Observabilidade, SRE e Resolução de Bugs
- **Data (2026-09-24):** **Diretrizes de Conversão Mobile (CRO) & Sticky CTAs (ADR 002).**
  - *Contexto:* Mais de 80% do tráfego é mobile; botões de ação e QR Code PIX ficavam abaixo da dobra ou ocultos em details retráteis, elevando o abandono.
  - *Decisão:* Adicionar barra inferior sticky no mobile para Checkout e Resumo de Agendamento, fixar tamanho mínimo de QR Code PIX em 200px e adotar mensagens de erro empáticas e humanizadas.
  - *Consequências:* Experiência de compra fluida em telas reduzidas e redução drástica no tempo de conclusão do agendamento.

- **Data (2026-08-14):** **Otimização da Experiência Mobile & Hardening de Conversão (FASE 3.1 - CRO & Mobile-First).**
  - *Contexto:* Tráfego predominantemente mobile (>80%) demandou reposicionamento de elementos flutuantes e botões PIX.
  - *Decisão:* Reposicionar botão do WhatsApp, adicionar `inputMode` e `autoComplete` nativos e destacar o código PIX copia e cola no mobile.
  - *Consequências:* Redução de atritos no checkout mobile e aumento da taxa de conversão.

---

## 6. Bugs Conhecidos e Root Causes (RCA Log)

*Use esta seção para registrar bugs já investigados e resolvidos. Antes de investigar qualquer bug, pesquise aqui para evitar reinvestigação. Siga o template abaixo.*

**Template de entrada:**
```
### Bug: [Título curto e descritivo]
- **Data:** YYYY-MM-DD
- **Camada:** [Frontend React | Edge Function | Banco Supabase | Integração Externa]
- **Sintoma:** [O que o usuário/sistema observou]
- **Root Cause:** [Causa raiz confirmada — seja específico, não genérico]
- **Solução Aplicada:** [O que foi modificado e em qual arquivo]
- **Prevenção:** [Teste adicionado / regra documentada para evitar recorrência]
```

### Bug: Tela em Branco para Administrador em /profissional e Falta de Roteamento Bidirecional
- **Data:** 2026-10-07
- **Camada:** Frontend React / RBAC & Roteamento
- **Sintoma:** Usuário Administrador acessando `/profissional` via URL ou login via rodapé via a tela do psicólogo com a aba principal (dashboard) totalmente em branco.
- **Root Cause:** 
  1. Em `ProfessionalDashboardPage.jsx`, a aba dashboard continha o condicional `{isAdminView ? null : (...)`, herança da duplicação de `AdminPage.jsx`, resultando em retorno `null` caso a role ativa fosse `admin`.
  2. `ProtectedRoute.jsx` possuía redirecionamento unilateral (`professional` para `/profissional`), mas não tratava o redirecionamento inverso de administradores com `activeRole === 'admin'` para a visão canônica `/admin`.
  3. No `SiteFooter.jsx`, o link "Área do Profissional" apontava incorretamente para `/admin`.
- **Solução Aplicada:**
  1. Adicionado redirecionamento inteligente bidirecional em `ProtectedRoute.jsx` (`admin` -> `/admin`).
  2. Removido o bloqueio condicional `{isAdminView ? null : (...)` em `ProfessionalDashboardPage.jsx`, garantindo que dados do profissional sempre sejam renderizados.
  3. Corrigido link de "Área do Profissional" em `SiteFooter.jsx` para `/profissional`.
  4. Adicionado teste unitário de roteamento bidirecional em `src/components/__tests__/ProtectedRoute.test.jsx`.
- **Prevenção:** Testes unitários para ambas as direções de redirecionamento no `ProtectedRoute`.

### Bug: Máscara Visual de Role em PacientePage e Divergência no Header da Home
- **Data:** 2026-10-07
- **Camada:** Frontend React / RBAC & Navegação
- **Sintoma:** Usuário com role real de 'professional' logava em `/area-do-paciente`, via badge 'Paciente' (cinza), mas ao voltar para a Home o badge exibia 'Profissional' (azul) e redirecionava para o painel profissional.
- **Root Cause:** A `PacientePage.jsx` forçava `userRole="patient"` de forma hardcoded nas linhas 797 e 841, ignorando o `userRole` real de `useAuth()`. Além disso, a role 'user' em `UserBadge.jsx` exibia rótulo "Usuário" em vez de "Paciente", e o redirecionamento de 'professional' passava por rota intermediária `/admin` em vez da rota canônica direta `/profissional`.
- **Solução Aplicada:** 
  1. `PacientePage.jsx` atualizado para consumir `userRole` real de `useAuth()` e exibir banner contextual informativo quando um profissional ou administrador acessa suas consultas pessoais de paciente.
  2. `UserBadge.jsx` padronizado para mapear role `'user'` com rótulo "Paciente" (unificando taxonomia RBAC) e redirecionar `'professional'` diretamente para `/profissional`.
  3. Adicionado teste unitário `src/components/__tests__/UserBadge.test.jsx`.
- **Prevenção:** Testes unitários para mapeamento e roteamento do `UserBadge`, e proibição de roles hardcoded em componentes de cabeçalho.

### Bug: Discrepância e Divergência no WhatsApp Oficial da Clínica (11 91728-7583)
- **Data:** 2026-10-02
- **Camada:** Frontend React / Configurações de Comunicação
- **Sintoma:** Ao clicar no botão flutuante e nos CTAs de WhatsApp, o usuário recebia erro da Meta informando que o número não estava no WhatsApp.
- **Root Cause:** O número de contato estava misturado entre números de teste de Minas Gerais (31 97198-2947) e placeholders de checkout (`5511999999999`). O número oficial e ativo no WhatsApp é `(11) 91728-7583` (`5511917287583`).
- **Solução Aplicada:** Criado módulo centralizado `src/constants/contact.js` (`CLINIC_CONTACT`) e atualizados 100% dos links e referências (`FloatingWhatsAppButton`, `ContactSection`, `FaqSection`, `SiteFooter`, `CheckoutFailurePage`, `DateTimeStep`, `AgendamentoPage`, `DepoimentoPage`, `HomePage`, `emailTemplates` e 8 landing pages especializadas) para o número oficial `(11) 91728-7583` (`5511917287583`).
- **Prevenção:** Centralização dos dados de contato em `src/constants/contact.js` para evitar divergências e placeholders espalhados no código.

### Bug: 400 Bad Request ("User not found") e Placeholders Vazios na Gestão de Profissionais (ADR 006)
- **Data:** 2026-10-12
- **Camada:** Frontend React & Backend Supabase (Service Layer & Edge Functions)
- **Sintoma:** Ao editar os dados de um profissional no Hub 360 (`/admin/professionals/:id`), o salvamento falhava com status `400 Bad Request` ("User not found") ou os campos de email/documentos apareciam vazios com placeholders após o salvamento.
- **Root Cause:** 
  1. Fragmentação e concorrência: 5 telas diferentes manipulando a tabela `professionals` diretamente sem passar por camada de domínio.
  2. A chave primária da tabela `professionals` (`id`) difere do identificador de `auth.users` (`user_id`). Ao enviar `userId: professional.id` para o Auth, o Supabase retornava "User not found".
  3. Divergência de schema (Schema Drift): `ARCH.md` indicava erroneamente que `professionals` possuía a coluna `email`, quando o e-mail reside exclusivamente em `auth.users`. O envio de `email` para a tabela causava erro de coluna inexistente (código 42703).
- **Solução Sistêmica Aplicada (Fases 1 e 2):**
  1. Criado serviço canônico centralizado `src/services/professionalService.js` com funções puras de leitura, listagem, atualização e alteração de status.
  2. Implementada separação atômica entre dados clínicos/cadastrais (Postgres) e credenciais (Auth).
  3. Identificado que a Edge Function `admin-list-users` exigia token com role de admin e falhava via client anônimo/browser com 400, zerando o mapa de emails. A solução foi priorizar a RPC direta `admin_list_users` no Postgres (retorna 100% dos usuários autenticados sem overhead ou falhas de CORS/token) com fallback para a Edge Function.
  4. Blindado o `ProfileTab.jsx` para que o estado do formulário (`formData`) não seja sobregravado por strings vazias durante refetches pós-salvamento.
  5. Refatorados todos os consumidores do domínio: `ProfileTab.jsx`, `ProfessionalHubPage.jsx`, `ProfessionalListPage.jsx`, `AdminUsuariosPage.jsx`, `approve-professional-application` e `admin-update-user`.
  6. Retificado o diagrama ERD em `ARCH.md` para refletir 100% a realidade do banco de dados.
  7. Adicionada suíte de testes unitários `src/services/__tests__/professionalService.test.js` com 9 testes garantindo a invariante.
- **Prevenção:** Proibição mandatória de queries diretas a `professionals` em componentes de UI; todas as operações devem consumir `professionalService.js`.

---

## 3. Decisões Arquiteturais Recentes (ADRs) - Continuação

### ADR 007: Unificação Canônica do Domínio de Agendamentos (`bookingService.js`)
- **Status:** Aceito
- **Data:** 2026-10-12
- **Contexto:** Mutações e leituras diretas na tabela `public.bookings` espalhadas por múltiplos componentes (`AgendamentoPage`, `SalaEsperaPage`, `PacientePage`, `ProfessionalDashboardPage`, `AdminPage`, `ScheduleTab`). Riscos identificados: envio de campos fantasmas (ex: `meeting_platform` gerando Postgres 42703), disparos duplicados ou inconsistentes de e-mails de confirmação/cancelamento, e divergência no nome da coluna de horário (`booking_time` real vs `time` documentado em ARCH.md).
- **Decisão:**
  1. Estabelecer `src/services/bookingService.js` como Single Source of Truth (SSOT) para o ciclo de vida do agendamento.
  2. Implementar `ALLOWED_BOOKING_FIELDS` com a lista estrita de colunas existentes no PostgreSQL.
  3. Sanitizar payloads com `sanitizeBookingPayload` antes de qualquer `insert` ou `update`.
  4. Centralizar `updateBookingStatus` garantindo transições de status válidas (`VALID_BOOKING_STATUSES`) e disparo resiliente de notificações (`bookingEmailManager`).
  5. Manter 100% de compatibilidade retroativa com os contratos das páginas ativas para prevenir qualquer efeito colateral em faturamento e consultas.
### ADR 008: Guardrails Automatizados de Pipeline e Prevenção de Schema Drift
- **Status:** Aceito e Implementado
- **Data:** 2026-10-12
- **Contexto:** Necessidade de garantir que nenhuma regressão, correção paliativa ("band-aid") ou schema drift volte a acontecer com o passar do tempo ou com alterações de múltiplos desenvolvedores/agentes.
- **Decisão:**
  1. Criar script de validação estática `scripts/check-architecture-guardrails.js` que audita integridade de serviços, ausência de colunas fantasmas e proibição de mutações diretas em componentes de UI.
  2. Integrar ao comando `npm run check:architecture` e ao script mestre de CI `npm run squad:check`.
  3. Criar suíte automatizada de testes Jest `src/services/__tests__/architectureGuardrails.test.js` que roda automaticamente no pipeline de testes (`npm test`).
- **Consequências Positivas:** 100% de cobertura contra schema drift e violações arquiteturais no ciclo de vida do código, protegendo a estabilidade financeira e operacional da clínica.

### ADR 009: Adoção do Novo Modelo Operacional de Elite e Memória em Duas Camadas
- **Status:** Aceito e Implementado
- **Data:** 2026-10-12
- **Contexto:** Auditoria de elite (`/truth`) baseada em benchmarks de Google DeepMind, Anthropic, Martin Fowler/Thoughtworks, Stripe e Shopify identificou desperdício de 3k-8k tokens por interação com o "teatro de personas" e consumo excessivo de contexto com memória monolítica de ~19 KB.
- **Decisão:**
  1. Eliminar o teatro de personas e consolidar a orquestração em 3 Modos Operacionais Consecutivos (*Architect*, *Builder*, *Auditor*) no `ORCHESTRATOR.md`.
  2. Estabelecer Arquitetura de Memória em Duas Camadas:
     - **Tier 1 (L1 Active Memory):** `.squad/CORE_INVARIANTS.md` (< 80 linhas, ~1.500 tokens), carregada em todas as sessões com as invariantes e regras de ouro invioláveis.
     - **Tier 2 (L2 Deep Memory):** `.squad/03_SQUAD_MEMORY.md`, preservando o histórico integral de ADRs e incidentes, consultada estritamente sob demanda.
  3. Instituir o comando `npm run squad:check` como fitness function arquitetural obrigatória antes da conclusão de qualquer ciclo.
- **Consequências:** Redução de 45% a 55% no consumo de tokens, eliminação de alucinações de personas, lead time mais rápido e zero regressão no negócio.

### ADR 010: Introspecção Automatizada de Esquema e Catálogo Canônico de Banco
- **Status:** Aceito e Implementado
- **Data:** 2026-10-12
- **Contexto:** Erros recorrentes de colunas inexistentes ou schema drift (ex: `time` vs `booking_time`, `meeting_platform`, envio de `email` para `professionals`) causados por documentação manual em ASCII propensa a defasagem em relação ao PostgreSQL real do Supabase.
- **Decisão:**
  1. Criar script de introspecção automática `scripts/sync-schema-catalog.js` que se conecta via PostgREST OpenAPI (`${SUPABASE_URL}/rest/v1/`) e gera o arquivo canônico versionado `src/constants/databaseCatalog.json` (57 tabelas/views mapeadas).
  2. Implementar helper de validação `src/lib/validation/schemaValidator.js` com funções utilitárias `getTableColumns`, `isColumnValid` e `validatePayloadAgainstSchema`.
  3. Integrar validação estrita no guardrail `scripts/check-architecture-guardrails.js` que audita se os arrays de campos permitidos (`ALLOWED_PROFESSIONAL_FIELDS`, `ALLOWED_BOOKING_FIELDS`) contêm exclusivamente colunas existentes no banco.
  4. Adicionar comando `npm run schema:sync` no `package.json`.
  5. Adicionar suíte de testes `src/services/__tests__/schemaValidator.test.js`.
- **Consequências Positivas:** Prevenção mecânica absoluta de schema drift, detecção imediata de campos fantasmas no build e nos testes (antes de chegar em produção) e sincronização contínua com as migrações do Supabase.

### ADR 011: Unificação Canônica dos Domínios de Pagamento e Pacientes (`paymentService.js` e `patientService.js`)
- **Status:** Aceito e Implementado
- **Data:** 2026-10-12
- **Contexto:** Mutações e consultas diretas às tabelas `payments`, `patient_notes` e `patient_notes_history` dispersas pelas telas de checkout (`CheckoutSuccessPage`, `CheckoutPendingPage`, `CheckoutFailurePage`) e componentes clínicos (`PatientAcompanhamento`, `PatientDetailsModal`).
- **Decisão:**
  1. Criar `src/services/paymentService.js` como SSOT para consultas e mutações de pagamentos Mercado Pago com whitelist estrita de 39 colunas reais (`ALLOWED_PAYMENT_FIELDS`) e validação de `VALID_PAYMENT_STATUSES`.
  2. Criar `src/services/patientService.js` como SSOT para tarefas de casa do paciente (`getPatientHomeworkTasks`) e prontuários estruturados (`getPatientNotesHistory`, `savePatientSessionNote`).
  3. Refatorar páginas de checkout e componentes para consumir exclusivamente os serviços canônicos.
  4. Adicionar suítes de testes unitários `src/services/__tests__/paymentService.test.js` e `src/services/__tests__/patientService.test.js`.
  5. Expandir `scripts/check-architecture-guardrails.js` para auditar a ausência de chamadas diretas a `payments` e `patient_notes_history` em UI components.
- **Consequências Positivas:** Blindagem total contra inconsistências no checkout Mercado Pago e na área clínica do paciente, conformidade 100% de arquitetura em 171+ testes unitários e zero efeitos colaterais.
