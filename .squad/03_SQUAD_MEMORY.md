# 📚 MEMÓRIA DO SQUAD — Tier 2 Lightweight Index & RCA Patterns
> **Tipo:** Memória Histórica Sob Demanda | **Consumo de Contexto:** Reduzido em ~75% (~2.000 tokens)
> **Memória Ativa (Tier 1):** Para regras invioláveis de carregamento contínuo, consulte [`.squad/CORE_INVARIANTS.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/CORE_INVARIANTS.md).

---

## 🏛️ 1. Lightweight ADR Index (Roteamento Rápido de Contexto)
> ⚡ **Regra de Leitura Lean:** Os agentes leem apenas esta tabela indexada. O arquivo completo da ADR em `.squad/history/` só deve ser carregado caso a tarefa modifique diretamente o componente correspondente.

| ID | Data | Domínio / Componente | Resumo da Decisão & Invariante | Arquivo Detalhado |
|---|---|---|---|---|
| **ADR 001** | 2026-09-24 | Telemedicina / Salas | Google Meet exclusivo; Zoom depreciado; fallback para link pessoal. | [`ADR_001`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-09-24_ADR_001_MIGRACAO_GOOGLE_MEET_EXCLUSIVO.md) |
| **ADR 002** | 2026-09-24 | Mobile CRO / Checkout | Barra sticky inferior em telas mobile; QR Code PIX ≥ 200px. | [`ADR_002`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-09-24_ADR_002_DIRETRIZES_CRO_MOBILE_CHECKOUT.md) |
| **ADR 003** | 2026-09-24 | UI / Comunicação | `DoxologosLogo` padronizado; confirmações via e-mail e painel (não WhatsApp). | [`ADR_003`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-09-24_ADR_003_PADRONIZACAO_VISUAL_MARCA_E_COMUNICACAO_WHATSAPP.md) |
| **ADR 004** | 2026-09-24 | SEO Clínico / CFP | React Helmet Async completo; Schema.org; zero promessas de cura (CFP). | [`ADR_004`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/ADR-004-seo-clinico.md) |
| **ADR 005** | 2026-10-07 | Auth / RBAC Híbrido | Suporte a perfis múltiplos (`professional` + `patient`) via `app_metadata`. | [`ADR_005`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-07_ADR_005_MULTI_PERFIL_HIBRIDO_DUAL_ROLE_RBAC.md) |
| **ADR 006** | 2026-10-12 | Profissionais / Banco | `professionalService.js` canônico; RPC `admin_list_users`; whitelist anti-drift. | [`ADR_006`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-12_ADR_006_GESTAO_CANONICA_PROFISSIONAIS_E_PREVENCAO_SCHEMA_DRIFT.md) |
| **ADR 007** | 2026-10-12 | Agendamentos / Supabase | `bookingService.js` canônico; `ALLOWED_BOOKING_FIELDS`; notificações desacopladas. | [`ADR_007`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-12_ADR_007_UNIFICACAO_CANONICA_DOMINIO_AGENDAMENTOS.md) |
| **ADR 008** | 2026-10-12 | Qualidade / CI | Script `check-architecture-guardrails.js` e comando mestre `npm run squad:check`. | [`ADR_008`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-12_ADR_008_GUARDRAILS_AUTOMATIZADOS_PIPELINE.md) |
| **ADR 009** | 2026-10-12 | Governança de IA | Fim do teatro de personas; 3 Modos Operacionais (Arquiteto, Construtor, Auditor). | [`ADR_009`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-12_ADR_009_MODELO_OPERACIONAL_ELITE_MEMORIA_DUAS_CAMADAS.md) |
| **ADR 010** | 2026-10-12 | Catálogo de Esquema | Introspecção OpenAPI Supabase (`databaseCatalog.json`) e `npm run schema:sync`. | [`ADR_010`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-12_ADR_010_INTROSPECCAO_AUTOMATIZADA_ESQUEMA_CATALOGO_BANCO.md) |
| **ADR 011** | 2026-10-12 | Pagamentos & Pacientes | `paymentService.js` (MP SSOT) e `patientService.js` (prontuários/tarefas). | [`ADR_011`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-12_ADR_011_UNIFICACAO_CANONICA_PAGAMENTOS_E_PACIENTES.md) |
| **ADR 012** | 2026-10-12 | AppSec / Edge RBAC | SSOT `supabase/functions/_shared/auth.ts`, checagem por `app_metadata` e CSP estrita. | [`ADR_012`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-12_ADR_012_BLINDAGEM_SEGURANCA_RBAC_APP_METADATA_CSP.md) |
| **ADR 013** | 2026-10-12 | Fintech / Webhooks | Barreira atômica de idempotência (`mp_payment_id`); NFS-e assíncrona não bloqueante. | [`ADR_013`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-12_ADR_013_RESILIENCIA_FINTECH_INGESTAO_ASSINCRONA_WEBHOOKS.md) |
| **ADR 014** | 2026-10-12 | Cache Reativo / State | Camada `src/hooks/queries/` (TanStack Query) com `staleTime`/`gcTime` anti-flicker. | [`ADR_014`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-12_ADR_014_REATIVIDADE_DADOS_CAMADA_CACHE_CANONICA_TANSTACK_QUERY.md) |
| **ADR 015** | 2026-10-12 | God Components & RUM | 6 abas modulares em `admin/tabs/`; telemetria RUM (`rumMonitoring.js`). | [`ADR_015`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-12_ADR_015_DESMEMBRAMENTO_GOD_COMPONENTS_OBSERVABILIDADE_RUM.md) |
| **ADR 016** | 2026-10-13 | Booking Time / Schema | Truncagem de `booking_time` para 5 caracteres (`HH:mm`, VARCHAR(5)); anti-erro 22001. | [`ADR_016`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-13_ADR_016_CORRECAO_SCHEMA_BOOKING_TIME_BLINDAGEM_AGENDAMENTOS.md) |
| **ADR 017** | 2026-10-17 | Segurança & Prontuários | Blindagem anti-Open Relay em `send-email`, eliminação de PII em logs, correção do contrato de prontuários (`action: 'save'`) e isolamento seguro de credencial GCP. | [`ADR_017`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-17_ADR_017_BLINDAGEM_SEGURANCA_OPEN_RELAY_PII_E_PRONTUARIOS.md) |
| **ADR 018** | 2026-10-18 | Governança & Mobile CRO | Sincronização de 48 rotas no `ARCH.md`, teleconsulta Google Meet, limpeza de código órfão, `inputMode="numeric"` e barra sticky mobile (ADR 002). | [`ADR_018`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-18_ADR_018_GOVERNANCA_ROTAS_MOBILE_CRO_E_LIMPEZA.md) |
| **ADR 019** | 2026-10-18 | Automação QA & Resiliência | Chromium Headless Shell no Playwright, 8 testes E2E verdes (`checkout.spec.ts` e `navigation.spec.ts`) e fallback defensivo com `valorParam` no checkout. | [`ADR_019`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-18_ADR_019_AUTOMACAO_QA_E2E_E_RESILIENCIA_CHECKOUT.md) |
| **ADR 020** | 2026-10-19 | Gestão Admin & Métricas | `adminMetrics.js` SSOT, eliminação de deltas e KPIs fictícios (+12.5%), paginação DRE, regime de caixa e alerta de erro visual. | [`ADR_020`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-19_ADR_020_INTEGRIDADE_METRICAS_E_CANONIZACAO_ADMIN.md) |
| **ADR 021** | 2026-10-19 | Cockpit Executivo & IA | Seletor de período dinâmico, drill-down nos 4 KPIs vitais, exportação CSV executiva, Copiloto Analítico com Gemini 1.5 e fallback determinístico local com Zero PII. | [`ADR_021`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-19_ADR_021_COCKPIT_EXECUTIVO_E_COPILOTO_IA.md) |
| **ADR 022** | 2026-10-19 | Operação, Retenção & No-Show | Fórmulas canônicas de no-show/cancelamento, coortes de retorno à 2ª sessão, prevenção de abandono (Zero PII) e módulo `OperationalRetentionModule`. | [`ADR_022`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-19_ADR_022_RETENCAO_CLINICA_NO_SHOW_E_COORTES.md) |
| **ADR 023** | 2026-10-19 | Growth, Funil & Metas | Funil de 5 etapas (leads GAD-7 a consultas), canais de negócio, metas mensais dinâmicas persistidas em `system_settings` e `GrowthAnalyticsModule`. | [`ADR_023`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-19_ADR_023_GROWTH_FUNIL_AQUISICAO_E_METAS_MENSAIS.md) |
| **ADR 024** | 2026-10-19 | UI/UX Admin Mobile-First | Redesign completo alinhado ao Design System Doxologos (`#1b3c37`, `#f8f6f0`), grid 2x2 mobile de KPIs, touch targets ≥44px e slide-over navigation drawer. | [`ADR_024`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/2026-10-19_ADR_024_REDESIGN_UI_UX_MOBILE_FIRST_E_IDENTIDADE_DOXOLOGOS.md) |

---

## 🛡️ 2. Padrões Canônicos de Engenharia Ativos
1. **Camada de Serviços Canônicos (`src/services/`):** Componentes React NUNCA acessam Supabase diretamente para mutações de domínio. Devem consumir `professionalService`, `bookingService`, `paymentService` ou `patientService`.
2. **Proteção Anti-Drift (Whitelisting):** Todo serviço exporta e impõe `ALLOWED_FIELDS` validados contra [`src/constants/databaseCatalog.json`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/constants/databaseCatalog.json).
3. **Desacoplamento Assíncrono:** Mutações no banco de dados são síncronas e atômicas. Efeitos colaterais (e-mails SMTP, webhooks, geração de links) rodam isolados em blocos defensivos.
4. **Idempotência Fintech:** Toda Edge Function que recebe pagamentos ou webhooks verifica chave de idempotência ou `mp_payment_id` antes de qualquer execução contábil.
5. **Cache Reativo TanStack Query:** Consultas usam `staleTime` mínimo de 5 minutos para dados estáticos/semi-estáticos, com invalidação precisa pós-mutação.
6. **Conformidade Ética & Sigilo (CFP / LGPD):** Zero PII em logs; proteção absoluta de prontuários psicológicos (Art. 9º Código CFP e Art. 11 LGPD).

---

## 🔍 3. Root Cause Analysis (RCA) & Prevenção de Recorrência

| Incidente / Sintoma | Causa Raiz Confirmada (RCA) | Solução Canônica Aplicada | Mecanismo de Prevenção Permanente |
|---|---|---|---|
| **Erro Postgres 22001 em Agendamentos** | `booking_time` formatado com segundos (`HH:mm:ss`, 8 chars) excedendo `VARCHAR(5)`. | Normalização defensiva truncando estritamente em 5 caracteres (`HH:mm`) em `bookingService.js`. | Testes unitários em `bookingService.test.js` e auditoria de schema no CI. |
| **400 Bad Request ao Salvar Profissional** | Confusão entre `id` da tabela e `user_id` de Auth + envio de campo inexistente `email`. | Separação atômica em `professionalService.js`, uso da RPC `admin_list_users` e whitelist. | Guardrails de arquitetura (`npm run check:architecture`). |
| **Inconsistência de Papéis / Header** | Roles hardcoded em telas de paciente mascaravam a role real de profissionais logados. | Contexto híbrido unificado (`useAuth`), `UserBadge` com switch dinâmico e auto-redirecionamento. | Testes unitários de RBAC e proibição de roles hardcoded na UI. |
| **Divergência de WhatsApp da Clínica** | Múltiplos números e placeholders espalhados por componentes e landing pages. | Centralização estrita em `src/constants/contact.js` (`CLINIC_CONTACT.WHATSAPP_NUMBER`). | Padrão SSOT para constantes de contato. |
| **Webhooks Duplicados Mercado Pago** | Retries do gateway provocavam processamento concorrente e tentativa duplicada de NFS-e. | Barreira atômica de idempotência no `mp-webhook` (<50ms) e emissão assíncrona desacoplada de notas. | Auditoria de idempotência no CI (`architectureGuardrails.test.js`). |
| **400 Bad Request ao Salvar Prontuário (`BUG-01`)** | `patientService.js` enviava `action: 'save_session_note'`, mas Edge Function aceitava apenas `action: 'save'`. | Unificação do payload para `action: 'save'` e suporte ao alias retrocompatível em `patient-notes-manager`. | Testes unitários em `patientService.test.js` e validação de contratos Zod/Edge. |
| **Vulnerabilidade Open Mail Relay (`SEC-02`)** | `send-email` não validava token de autorização, permitindo disparo anônimo via SMTP Hostinger. | Imposição de `Authorization: Bearer <token>` obrigatório e trava anti-spoofing de `fromEmail`. | Validação de autorização em Edge Functions e testes de segurança. |
| **Lista Vazia em Gestão de Blog (`BUG-02`)** | Dependência exclusiva de Edge Function remota para listar artigos gerava falha silenciosa/401 mesmo com dados no banco. | Consulta direta canônica à tabela `artigos` do Supabase com fallback resiliente para Edge Function, status chips e redesign Card Claro Premium. | Suíte de testes `BlogManagementDashboard.test.jsx` e padrão de leitura direta de banco com fallback gracioso. |

---

## 🧭 4. Como Navegar para Detalhes Históricos
- Para consultar o texto integral de uma ADR, abra diretamente o arquivo correspondente na pasta [`.squad/history/`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/history/).
- Para registrar uma nova decisão arquitetural, crie o arquivo em `.squad/history/` e adicione a linha correspondente nesta tabela.
