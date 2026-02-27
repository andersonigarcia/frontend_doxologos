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
                                             │  zoom-create-meeting        │
                                             │  send-email                 │
                                             │  event-send-reminders       │
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
│   └── emailTemplates.js      # Templates HTML de email
├── services/                  # Integrações externas
└── utils/                     # Funções puras utilitárias
```

---

## 3. Rotas da Aplicação

| Rota | Página | Acesso |
|---|---|---|
| `/` | `HomePage` | Público |
| `/agendamento` | `AgendamentoPage` | Público |
| `/checkout` | `CheckoutPage` | Público |
| `/checkout-direct` | `CheckoutDirectPage` | Público |
| `/checkout/success` | `CheckoutSuccessPage` | Público |
| `/checkout/failure` | `CheckoutFailurePage` | Público |
| `/checkout/pending` | `CheckoutPendingPage` | Público |
| `/area-do-paciente` | `PacientePage` | Autenticado |
| `/minhas-inscricoes` | `MinhasInscricoesPage` | Autenticado |
| `/recuperar-senha` | `RecuperarSenhaPage` | Público |
| `/redefinir-senha` | `RedefinirSenhaPage` | Público (token) |
| `/evento/:slug` | `EventoDetalhePage` | Público |
| `/doacao` | `DoacaoPage` | Público |
| `/depoimento` | `DepoimentoPage` | Autenticado |
| `/quem-somos` | `QuemSomosPage` | Público |
| `/trabalhe-conosco` | `TrabalheConoscoPage` | Público |
| `/termos-e-condicoes` | `TermosCondicoesPage` | Público |
| `/admin` | `AdminPage` | Admin |
| `/admin/pagamentos` | `PaymentsPage` | Admin |
| `/admin/usuarios` | `AdminUsuariosPage` | Admin |
| `/admin/depoimentos` | `DepoimentosAdminPage` | Admin |
| `/criar-usuarios` | `CreateUsersPage` | **Apenas DEV** |
| `/pagamento-simulado` | `PagamentoSimuladoPage` | Dev/Staging |

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

### Papéis (roles) e permissões

| Role | Fonte | Permissões |
|---|---|---|
| `user` (padrão) | `user_metadata.role` | `booking:create`, `booking:view_own`, `profile:*_own` |
| `professional` | `user_metadata.role` | Tudo de `user` + `booking:view_assigned`, `availability:manage_own` |
| `admin` | `user_metadata.role` | **Todas as permissões** |

### Controles de segurança

- **Rate Limiting client-side:** login (5 tentativas / 15 min), reset senha (3 tentativas / hora)
- **Session Timeout:** inatividade 10 min, sessão total 1 hora, aviso 2 min antes
- **Audit Logger:** registra `LOGIN`, `LOGOUT`, `PASSWORD_RESET`, `PASSWORD_CHANGE`
- **CSRF Protection:** `csrfProtection.js` para mutations sensíveis

---

## 5. Edge Functions (Backend)

Todas as funções rodam no Supabase Edge (Deno runtime). Chamadas via HTTPS com `service_role` ou `anon` key conforme necessidade.

### Pagamentos (Mercado Pago)

| Função | Descrição |
|---|---|
| `mp-create-preference` | Cria preferência de pagamento PIX; retorna `init_point` |
| `mp-process-card-payment` | Processa pagamento de cartão diretamente via MP API |
| `mp-webhook` | Recebe notificações MP; atualiza booking → `confirmed`; dispara Zoom + emails |
| `mp-check-payment` | Consulta status de pagamento por ID (polling) |
| `mp-create-payment` | Criação manual de pagamentos (admin) |
| `mp-reconcile-payment` | Reconciliação de pagamentos divergentes |

### Videoconferência

| Função | Descrição |
|---|---|
| `zoom-create-meeting` | Cria reunião Zoom e retorna links host/participant |
| `create-zoom-meeting` | Alias/versão legada |
| `event-get-meeting` | Retorna link de meeting para inscrito confirmado |
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
│ id (PK), name, specialty, email, bio, active              │
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
                                               │ booking_date, time        │
                                               │ status *                  │
                                               │ meeting_link              │
                                               │ marketplace_preference_id │
                                               │ patient_name, email, phone│
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
   ├─ Chama `zoom-create-meeting` → salva meeting_link
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
   ├─ STATUS approved → mesmos passos do webhook (zoom + email + WA)
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
