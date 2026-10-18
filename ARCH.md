# ARCH.md — Arquitetura Técnica do Doxologos

> Fonte única de verdade para decisões arquiteturais, modelo de dados e políticas de segurança.
> Leia também: [README.md](./README.md)

---

## Índice

1. [Diagrama de Fluxo de Dados](#1-diagrama-de-fluxo-de-dados)
2. [Organização do Frontend](#2-organização-do-frontend)
3. [Rotas da Aplicação](#3-rotas-da-aplicação)
4. [Autenticação e Autorização (RBAC)](#4-autenticação-e-autorização-rbac)
5. [Edge Functions (Backend)](#5-edge-functions-backend)
6. [Modelo de Dados (ERD Simplificado)](#6-modelo-de-dados-erd-simplificado)
7. [Políticas RLS (Row Level Security)](#7-políticas-rls-row-level-security)
8. [Fluxos Principais](#8-fluxos-principais)
9. [Regras de Negócio](#9-regras-de-negócio)
10. [Observabilidade e Segurança](#10-observabilidade-e-segurança)

---

## 1. Diagrama de Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React SPA)                       │
│  React Router → Pages → Hooks → @tanstack/react-query            │
│  SupabaseAuthContext (JWT) ──────────────────────────────────┐   │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ HTTPS
              ┌────────────────────┴──────────────────────┐
              │                                            │
   ┌──────────▼──────────────┐              ┌─────────────▼──────────────┐
   │   Supabase Database      │              │   Supabase Edge Functions   │
   │   PostgreSQL + RLS       │◄────────────►│   (Deno / TypeScript)       │
   │   Auth (JWT)             │              │                             │
   └──────────────────────────┘              │  mp-create-preference       │
                                             │  mp-process-card-payment    │
                                             │  mp-webhook                 │
│  post-payment-orchestrator  │
│  send-email                 │
│  send-whatsapp-reminder     │
│  admin-*                    │
│  patient-*                  │
                                             └──────┬──────────────────────┘
                                                    │
                              ┌─────────────────────┼──────────────────────┐
                              │                     │                      │
                   ┌──────────▼────┐    ┌───────────▼───┐    ┌────────────▼───┐
                   │  Mercado Pago │    │  Zoom / Meet  │    │  SMTP + Twilio │
                   │  (PIX + Card) │    │  (Videoconf.) │    │  (Email + WA)  │
                   └───────────────┘    └───────────────┘    └────────────────┘
```

---

## 2. Organização do Frontend

```
src/
├── App.jsx                    # Roteamento principal + ErrorBoundary global
├── main.jsx                   # Entry point, React 18 createRoot
├── contexts/
│   └── SupabaseAuthContext.jsx # Auth state, RBAC, rate limiting
├── pages/                     # Uma page = uma rota
├── components/                # Componentes reutilizáveis e específicos de página
├── hooks/                     # Custom hooks (auth/, booking/, home/)
├── lib/                       # Serviços e utilitários
│   ├── customSupabaseClient.js # Instância configurada do Supabase
│   ├── mercadoPagoService.js  # Estratégia de pagamento (Strategy Pattern)
│   ├── payment/               # PaymentOrchestrator, PIX, Card strategies
│   ├── auditLogger.js         # Registro de ações críticas
│   ├── rateLimiter.js         # Rate limiting client-side (login, reset senha)
│   ├── secureStorage.js       # LocalStorage com sanitização
├── constants/
│   └── databaseCatalog.json   # Catálogo canônico de 57 tabelas gerado via OpenAPI (npm run schema:sync)
├── services/                  # Camada Canônica de Domínio (Single Source of Truth)
│   ├── professionalService.js # Gestão de profissionais e enriquecimento com Auth
│   ├── bookingService.js      # Ciclo de vida de agendamentos e transições de status
│   ├── paymentService.js      # Operações de pagamentos Mercado Pago e reconciliação
│   └── patientService.js      # Prontuários clínicos, histórico e tarefas do paciente
└── utils/                     # Funções puras utilitárias
```

---

## 3. Rotas da Aplicação

A aplicação conta com 48 rotas mapeadas em `src/App.jsx`, divididas por domínios de negócio:

### 3.1. Institucional, Agendamento e Conversão
| Rota | Página | Acesso | Descrição |
|---|---|---|---|
| `/` | `HomePage` | Público | Portal institucional e serviços clínicos |
| `/agendamento` | `AgendamentoPage` | Público | Fluxo de agendamento em 5 etapas |
| `/checkout` | `CheckoutPage` | Público | Checkout padrão Mercado Pago (PIX/Cartão) com TCLE |
| `/checkout-direct` | `CheckoutDirectPage` | Público | Checkout transparente direto no cartão |
| `/checkout/success` / `/checkout-success` | `CheckoutSuccessPage` | Público | Confirmação e dados de acesso à consulta |
| `/checkout/failure` | `CheckoutFailurePage` | Público | Recuperação e nova tentativa de pagamento |
| `/checkout/pending` | `CheckoutPendingPage` | Público | Orientações de PIX gerado ou pagamento em análise |
| `/quem-somos` | `QuemSomosPage` | Público | Linha editorial e corpo clínico |
| `/trabalhe-conosco` | `TrabalheConoscoPage` | Público | Candidatura para psicólogos parceiros |
| `/doacao` | `DoacaoPage` | Público | Canal de apoio social |
| `/termos-e-condicoes` | `TermosCondicoesPage` | Público | Termos de uso, privacidade LGPD e TCLE |
| `/guia-enem` / `/enem` | `GuiaEnemPage` | Público | Guia e suporte psicológico para famílias |

### 3.2. Área do Paciente e Credenciais
| Rota | Página | Acesso | Descrição |
|---|---|---|---|
| `/area-do-paciente` | `PacientePage` | Autenticado | Consultas, tarefas clínicas e documentos |
| `/sala-espera/:id` | `SalaEsperaPage` | Autenticado | Sala de espera com link Google Meet |
| `/minhas-inscricoes` | `MinhasInscricoesPage` | Autenticado | Inscrições em eventos e workshops |
| `/depoimento` | `DepoimentoPage` | Autenticado | Envio de depoimento sobre atendimento |
| `/recuperar-senha` | `RecuperarSenhaPage` | Público | Solicitação de link de recuperação |
| `/redefinir-senha` | `RedefinirSenhaPage` | Público (token) | Redefinição de senha com código PKCE |

### 3.3. Área do Profissional
| Rota | Página | Acesso | Descrição |
|---|---|---|---|
| `/profissional` | `ProfessionalDashboardPage` | Profissional / Admin | Agenda, prontuários de pacientes e horários |
| `/faturamento-mensal` | `FaturamentoMensalPage` | Profissional / Admin | Demonstrativo de honorários e repasses |

### 3.4. Gestão Administrativa
| Rota | Página | Acesso | Descrição |
|---|---|---|---|
| `/admin` | `AdminPage` | Admin | Gestão de agendamentos e operações |
| `/admin/dashboard` | `ManagementDashboardPage` | Admin | Indicadores de receita, conversão e ocupação |
| `/admin/professionals` | `ProfessionalListPage` | Admin | Listagem e credenciamento de psicólogos |
| `/admin/professionals/:id` | `ProfessionalHubPage` | Admin | Detalhes e métricas por profissional |
| `/admin/pagamentos` | `PaymentsPage` | Admin | Auditoria fintech, reconciliação e NFS-e |
| `/admin/usuarios` | `AdminUsuariosPage` | Admin | Gestão de perfis e permissões RBAC |
| `/admin/depoimentos` | `DepoimentosAdminPage` | Admin | Moderação e aprovação de depoimentos |

### 3.5. Conteúdo e Eventos
| Rota | Página | Acesso | Descrição |
|---|---|---|---|
| `/artigos` | `BlogPage` | Público | Portal de artigos e notícias |
| `/artigos/:slug` | `ArticlePage` | Público | Artigo científico/clínico completo |
| `/evento/:slug` | `EventoDetalhePage` | Público | Inscrição em eventos e workshops |
| `/r/:slug` / `/livro/:slug` | `BookResourcePage` | Público | Recursos complementares de livros |

### 3.6. Landing Pages de Terapia (SEO)
| Rota | Página | Acesso | Descrição |
|---|---|---|---|
| `/terapia/ansiedade` | `TerapiaAnsiedadePage` | Público | Atendimento para sintomas de ansiedade |
| `/terapia/depressao` | `TerapiaDepressaoPage` | Público | Tratamento clínico para depressão |
| `/terapia/tdah` | `TerapiaTdahPage` | Público | Diagnóstico e manejo de TDAH |
| `/terapia/casal` | `TerapiaCasalPage` | Público | Psicoterapia conjugal cristã |
| `/terapia/burnout` | `TerapiaBurnoutPage` | Público | Estafa e esgotamento profissional |
| `/terapia/dependencia-emocional` | `TerapiaDependenciaPage` | Público | Autonomia afetiva e relacionamentos |
| `/terapia/vicio-apostas` | `TerapiaVicioApostasPage` | Público | Cessação de dependência de jogos e bets |
| `/terapia/abuso-espiritual` | `TerapiaAbusoEspiritualPage` | Público | Acolhimento e superação de trauma religioso |

### 3.7. Ferramentas Psicométricas & Autoavaliação
| Rota | Página | Acesso | Instrumento Clínico |
|---|---|---|---|
| `/ferramentas` | `AssessmentHubPage` | Público | Central de testes psicométricos |
| `/ferramentas/:slug` | `AssessmentPage` | Público | Aplicação individual de questionário |
| `/teste-ansiedade-gad7` / `/teste-ansiedade` | `AssessmentPage` | Público | Escala de Ansiedade Geral (GAD-7) |
| `/teste-burnout` / `/teste-esgotamento` | `AssessmentPage` | Público | Inventário de Burnout e Sobrecarga |
| `/teste-depressao` / `/teste-depressao-phq9` | `AssessmentPage` | Público | Questionário de Saúde do Paciente (PHQ-9) |
| `/teste-tdah*` | `AssessmentPage` | Público | Escala de Rastreio TDAH Adulto (ASRS-18) |
| `/teste-espiritualidade` / `/teste-culpa*` | `AssessmentPage` | Público | Culpa, Perfeccionismo e Saúde Espiritual |
| `/teste-sono` / `/teste-insonia*` | `AssessmentPage` | Público | Índice de Gravidade de Insônia (ISI) |

### 3.8. Rotas de Ambiente de Desenvolvimento
| Rota | Página | Acesso | Descrição |
|---|---|---|---|
| `/criar-usuarios` | `CreateUsersPage` | **Apenas DEV** | Provisionamento local de testes (bloqueado em prod) |
| `/pagamento-simulado` | `PagamentoSimuladoPage` | Dev/Staging | Simulador de transação Mercado Pago |

> ⚠️ `/criar-usuarios` é bloqueado em produção via `import.meta.env.DEV`.

---
## 4. Autenticação e Autorização (RBAC)

**Provedor:** Supabase Auth (JWT)
**Contexto React:** `SupabaseAuthContext.jsx` → `useAuth()` hook

### Métodos disponíveis no contexto

| Método | Descrição |
|---|---|
| `signIn(email, password)` | Login com rate limiting (5 tentativas / 15 min) |
| `signUp(email, password)` | Cadastro com validações de erro humanizadas |
| `signInWithMagicLink(email)` | Login sem senha via link OTP |
| `signOut()` | Logout com limpeza de estado local |
| `resetPassword(email)` | Recuperação com rate limiting (3 tentativas / hora) |
| `updatePassword(newPassword)` | Atualização de senha autenticada |
| `validateSession()` | Verifica validade da sessão atual |
| `refreshToken()` | Renova o JWT antes do vencimento |
| `checkPermission(permission)` | Verifica permissão RBAC |
| `getSessionExpiry()` | Retorna timestamp de expiração |

### Papéis (roles) e permissões (ADR 005 & ADR 012)

A fonte canônica soberana de papéis (RBAC) é `app_metadata.role` e o array `app_metadata.roles` (gravados exclusivamente com `service_role` key e imutáveis pelo cliente). O campo `user_metadata.role` é preservado estritamente como fallback defensivo para contas legadas.

| Role | Fonte Canônica | Permissões |
|---|---|---|
| `patient` / `user` (padrão) | `app_metadata.role` / `app_metadata.roles` | `booking:create`, `booking:view_own`, `profile:*_own`, `homework:view_own` |
| `professional` | `app_metadata.role` / `app_metadata.roles` | Tudo de `patient` + `booking:view_assigned`, `availability:manage_own`, `patient_notes:manage` |
| `admin` | `app_metadata.role` / `app_metadata.roles` | **Todas as permissões administrativas e de supervisão** |

### Controles de segurança

- **Defesa em Profundidade (CSP):** Meta tag Content-Security-Policy em `index.html` restringindo scripts, estilos, conexões e frames autorizados.
- **SSOT de RBAC em Edge Functions:** Módulo compartilhado `supabase/functions/_shared/auth.ts` (`requireAdmin`, `isAdminUser`, `hasAnyRole`).
- **Rate Limiting client-side:** login (5 tentativas / 15 min), reset senha (3 tentativas / hora)
- **Session Timeout:** inatividade 10 min, sessão total 1 hora, aviso 2 min antes
- **Audit Logger:** registra `LOGIN`, `LOGOUT`, `PASSWORD_RESET`, `PASSWORD_CHANGE`
- **CSRF Protection:** `csrfProtection.js` para mutations sensíveis

---

## 5. Edge Functions (Backend)

Todas as funções rodam no Supabase Edge (Deno runtime). Chamadas via HTTPS com `service_role` ou `anon` key conforme necessidade. Todas as funções administrativas utilizam `_shared/auth.ts` para validação de RBAC.

### Segurança & Utilitários Compartilhados (`_shared/`)

| Arquivo | Descrição |
|---|---|
| `_shared/auth.ts` | **SSOT de Autenticação & RBAC:** `requireAdmin`, `isAdminUser`, `hasAnyRole`, `authenticateCaller`, `AuthError` |
| `_shared/cors.ts` | Cabeçalhos CORS padronizados para respostas Deno |

### Pagamentos (Mercado Pago)

| Função | Descrição |
|---|---|
| `mp-create-preference` | Cria preferência de pagamento PIX; retorna `init_point` |
| `mp-process-card-payment` | Processa pagamento de cartão diretamente via MP API |
| `mp-webhook` | Recebe notificações MP; atualiza booking → `confirmed`; dispara Zoom + emails |
| `mp-check-payment` | Consulta status de pagamento por ID (polling) |
| `mp-create-payment` | Criação manual de pagamentos (admin) |
| `mp-reconcile-payment` | Reconciliação de pagamentos divergentes |

### Teleconsulta & Videoconferência (Google Meet)

| Função | Descrição |
|---|---|
| `post-payment-orchestrator` | Orquestra pós-pagamento: vincula Google Meet do profissional (`personal_meet_link`), dispara confirmação e lembretes |
| `event-get-meeting` | Retorna link de meeting da sala para inscrito confirmado em evento |
| `event-generate-payment` | Gera cobrança para inscrição em evento |

### Notificações

| Função | Descrição |
|---|---|
| `send-email` | Envio genérico de email via SMTP |
| `event-send-reminders` | Lembretes automáticos de eventos (D-1, H-1) |
| `send-pending-payment-reminders` | Lembra usuários com pagamento pendente |

### Administração

| Função | Descrição |
|---|---|
| `admin-create-user` | Cria usuário no Supabase Auth com role específico |
| `admin-list-users` | Lista todos os usuários (paginado) |
| `admin-update-user` | Atualiza metadata/role de usuário |
| `admin-delete-user` | Remove usuário e dados associados |
| `financial-credit-manager` | Gerencia créditos/saldo de pacientes |

### Paciente

| Função | Descrição |
|---|---|
| `patient-cancel-booking` | Cancela agendamento com validações de prazo |
| `patient-notes-manager` | CRUD de anotações do profissional sobre o paciente |

### Reembolso

| Função | Descrição |
|---|---|
| `manual-refund` | Processa reembolso manual |
| `manual-refund-notify` | Notifica paciente sobre reembolso |
| `manual-refund-overview` | Relatório de reembolsos pendentes |
| `manual-refund-proof` | Registra comprovante de reembolso |

### Eventos

| Função | Descrição |
|---|---|
| `event-cleanup-expired` | Remove inscrições expiradas sem pagamento |

---

## 6. Modelo de Dados (ERD Simplificado)

```
professionals ──────────────────────────────────────────────┐
│ id (PK), user_id (FK → auth.users), name, specialty,      │
│ mini_curriculum, description, image_url, personal_meet_link,│
│ whatsapp, phone, cpf, cnpj, crp, status, services_ids []   │
│ * Nota: email e credenciais residem em auth.users         │
└───────────────────────────────────────────────────────────┘
        │ 1                                         │ 1
        │                                           │
   availability                              services
   (professional_id FK,                      (id, name, description,
    day_of_week, available_times)             price, duration_minutes)
        │                                           │
   blocked_dates                                    │
   (professional_id FK,                             │ M
    blocked_date, start_time, end_time)             │
                                               bookings ──────────────────
                                               │ id (PK)                  │
                                               │ professional_id (FK)      │
                                               │ service_id (FK)           │
                                               │ user_id (FK → auth.users) │
                                               │ booking_date, booking_time│
                                               │ status *                  │
                                               │ meeting_link              │
                                               │ marketplace_payment_id    │
                                               │ patient_name, patient_email, patient_phone │
                                               └──────────────┬────────────┘
                                                              │ 1
                                                              │
                                                         payments
                                                         │ id (PK)
                                                         │ booking_id (FK)
                                                         │ mp_payment_id
                                                         │ status
                                                         │ amount
                                                         │ raw_payload (jsonb)
                                                         │ created_at

eventos ───────────────────────────────────────────────────────
│ id (PK), title, slug, description, event_date             │
│ meeting_link (legado), meeting_id                         │
└────────────────────────────────────────┬──────────────────┘
                                         │ 1
              ┌──────────────────────────┼─────────────────────┐
              │                          │                     │
   inscricoes_eventos               event_meetings         logs
   (id, evento_id FK,               (evento_id PK FK,      (id, action,
    user_id FK,                      meeting_link,          payload jsonb,
    status,                          meeting_password,      created_at)
    payment_status,                  host_start_url,
    reminder_sent_at)                raw_metadata)
```

### Status de Booking (`bookings.status`)

| Valor | Significado |
|---|---|
| `pending_payment` | Criado, aguardando pagamento |
| `confirmed` | Pagamento confirmado; meeting gerado |
| `cancelled` | Cancelado pelo paciente ou admin |
| `rescheduled` | Remarcado |
| `completed` | Consulta realizada |

---

## 7. Políticas RLS (Row Level Security)

> RLS é o coração da segurança do Supabase. Toda tabela sensível tem RLS habilitado.

### `bookings`

| Política | Operação | Regra |
|---|---|---|
| Leitura própria | `SELECT` | `auth.uid() = user_id` |
| Leitura admin | `SELECT` | `role IN ('admin','service_role')` |
| Criação | `INSERT` | Autenticado ou `anon` (nova consulta sem conta) |
| Atualização | `UPDATE` | `service_role` (webhook) ou `admin` |
| Cancelamento | `DELETE/UPDATE` | Paciente próprio + prazo mínimo |

### `payments`

| Política | Operação | Regra |
|---|---|---|
| Leitura | `SELECT` | `anon` → negado; `authenticated` → próprio |
| Escrita | `INSERT/UPDATE` | `service_role` apenas (webhook MP) |

### `event_meetings`

| Política | Operação | Regra |
|---|---|---|
| Admin/Backend | `ALL` | `role = 'service_role'` |
| Admin UI | `SELECT` | `role IN ('admin','superadmin','service_role')` |
| Inscrito confirmado | `SELECT` | `auth.uid() IS NOT NULL` + `inscricoes_eventos.status = 'confirmed'` |
| Anônimo | `SELECT` | **NEGADO** — link não vaza antes do evento |

### `professionals` / `services` / `availability`

| Política | Operação | Regra |
|---|---|---|
| Leitura | `SELECT` | Público (`anon` e `authenticated`) |
| Escrita | `INSERT/UPDATE/DELETE` | Apenas `admin` ou `service_role` |

---

## 8. Fluxos Principais

### 8.1 Agendamento + Pagamento PIX

```
1. Usuário seleciona: profissional → serviço → data/horário
2. Frontend cria `booking` (status: pending_payment) via Supabase JS
3. Frontend chama Edge Function `mp-create-preference`
   └─ Retorna `init_point` (URL checkout MP) + preferência ID
4. Usuário é redirecionado ao checkout Mercado Pago
5. Usuário paga via PIX
6. Mercado Pago envia webhook POST para `mp-webhook`
   ├─ Valida assinatura MP
   ├─ Atualiza `payments` (status: approved)
   ├─ Atualiza `bookings` (status: confirmed)
   ├─ Chama `post-payment-orchestrator` → vincula Google Meet (`personal_meet_link`)
   ├─ Envia email de confirmação (SMTP)
   └─ Envia WhatsApp (Twilio)
7. Usuário vê página /checkout/success
```

### 8.2 Pagamento com Cartão de Crédito

```
1. Steps 1–2 iguais ao PIX
2. Frontend renderiza formulário de cartão (Mercado Pago SDK)
3. Frontend envia token do cartão + dados para `mp-process-card-payment`
   ├─ Tenta cobrança imediata
   ├─ STATUS approved → dispara `post-payment-orchestrator` (Google Meet + email + WA)
   └─ STATUS pending → frontend inicia polling via `mp-check-payment`
4. Após confirmação, mesmo fluxo de notificação
```

### 8.3 Inscrição em Evento

```
1. Usuário acessa /evento/:slug
2. Clica em "Inscrever-se" (requer login)
3. Frontend cria `inscricoes_eventos` (status: pending_payment)
4. `event-generate-payment` cria cobrança MP
5. Pagamento → webhook → status: confirmed
6. D-1 e H-1: `event-send-reminders` envia email/WA com meeting link
7. Link do meeting só é retornado por `event-get-meeting` para inscritos confirmados
```

### 8.4 Onboarding / Autenticação

```
1. Cadastro: signUp() → email de confirmação Supabase
2. Login: signIn() → verificação rate limiter → JWT emitido
3. Magic Link: signInWithMagicLink() → link OTP por email
4. Recovery: resetPassword() → link válido 1h → /redefinir-senha → updatePassword()
5. Session Timeout: aviso 2min antes dos 10min de inatividade → auto logout
```

---

## 9. Regras de Negócio

- **Agendamento:**
  - Booking é criado com status `pending_payment`; só vira `confirmed` via webhook MP ou ação admin.
  - Profissional define disponibilidade por dia da semana; datas bloqueadas sobrepõem disponibilidade.
  - WhatsApp button é ocultado na página `/agendamento` para não competir com CTAs de conversão.

- **Pagamentos:**
  - PIX e cartão são os únicos métodos suportados.
  - A chave `MP_ACCESS_TOKEN` **nunca** vai ao browser; toda cobrança passa pela Edge Function.
  - Pagamentos aprovados: webhook é a fonte verdade, não o retorno do checkout MP.
  - Cartão com status `pending`: o frontend faz polling em `mp-check-payment` com back-off.

- **Videoconferência:**
  - Meeting Zoom/Meet é criado **somente após** confirmação de pagamento.
  - Links de meeting são armazenados em `event_meetings` (tabela separada, com RLS restritiva) para eventos.
  - Um mesmo evento tem apenas 1 meeting ID; participantes recebem o mesmo link.

- **Cancelamento:**
  - Paciente pode cancelar via `patient-cancel-booking` (com validação de prazo mínimo).
  - Reembolso é manual via `manual-refund` + `manual-refund-notify`.

- **Segurança de ambiente:**
  - Rota `/criar-usuarios` só existe em `import.meta.env.DEV === true`.
  - `config/local.env` **nunca** é commitado (`.gitignore`).
  - Audit log registra todas as ações de autenticação e mutations críticas.

---

## 10. Observabilidade e Segurança

| Mecanismo | Arquivo | Descrição |
|---|---|---|
| Audit Logger | `lib/auditLogger.js` | Registra LOGIN, LOGOUT, PASSWORD_*, mutations críticas |
| Logger | `lib/logger.js` + `lib/secureLogger.js` | Logs estruturados com níveis configuráveis |
| Web Vitals | `lib/webVitals.js` | CLS, LCP, FID enviados ao GA4 |
| Rate Limiter | `lib/rateLimiter.js` | Client-side (login: 5/15min, reset: 3/hora) |
| Error Tracking | `hooks/useErrorTracking.js` | Captura erros de render e runtime |
| Error Boundary | `components/ErrorBoundary.jsx` | Fallback por página |
| CSRF | `lib/csrfProtection.js` | Token em mutations sensíveis |
| Session Timeout | `hooks/useSessionTimeout.js` | 10min inatividade + 1h sessão total |
| Secure Storage | `lib/secureStorage.js` | Wrapper sanitizado para localStorage |
| Analytics | `hooks/useAnalytics.js` | Page tracking + eventos customizados (GA4) |
