# Doxologos - Frontend (Resumo de Integração)

Projeto: Frontend React (Vite) para plataforma de telepsicologia.

Este README reúne os pontos essenciais para continuar desenvolvimento, integrar pagamentos (Mercado Pago), Zoom e deploy.

## O que existe hoje
- SPA em `src/` com páginas de agendamento (`src/pages/AgendamentoPage.jsx`), contexto de autenticação (`src/contexts/SupabaseAuthContext.jsx`) e cliente Supabase em `src/lib/customSupabaseClient.js`.
- Dependências chave: `@supabase/supabase-js`, `react`, `react-router-dom`, `framer-motion`.

## Mudança aplicada
- `src/lib/customSupabaseClient.js` foi atualizado para usar variáveis de ambiente:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

  Não coloque a `service_role` no frontend. Use Edge Functions / backend para operações privilegiadas.

## Arquitetura resumida
- Frontend (React) — leitura de profissionais, serviços, disponibilidade; criação de bookings (status `pending_payment`).
- Supabase (Auth + Postgres) — armazena dados e autenticação.
- Edge Functions / Backend — responsável por Mercado Pago, Zoom e envio de notificações (email/WhatsApp).

## Banco de dados (tabelas sugeridas)
- `professionals` (id, name, specialty, email, bio, ...)
- `services` (id, name, price, duration_minutes, ...)
- `availability` (professional_id, day_of_week, available_times)
- `blocked_dates` (professional_id, blocked_date, start_time, end_time)
 - `bookings` (id, professional_id, service_id, user_id, booking_date, booking_time, status, zoom_link, marketplace_preference_id, patient_name, patient_email, patient_phone)
- `payments` (id, booking_id, mp_payment_id, status, amount, raw_payload)
- `logs` (audit table)

SQL de exemplo (criar no Supabase SQL Editor):

```sql
create table services (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  duration_minutes int not null,
  price numeric(10,2) not null,
  created_at timestamptz default now()
);

create table bookings (
  id uuid default gen_random_uuid() primary key,
  professional_id uuid not null,
  service_id uuid not null,
  user_id uuid,
  booking_date date not null,
  booking_time time not null,
  status text default 'pending_payment',
  zoom_link text,
  marketplace_preference_id text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create table payments (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references bookings(id),
  mp_payment_id text,
  status text,
  amount numeric(10,2),
  raw_payload jsonb,
  created_at timestamptz default now()
);
```

## Fluxo de pagamento (recomendado)
1. Frontend cria `booking` com status `pending_payment`.
2. Frontend chama endpoint backend `/api/mp/create_preference` (Edge Function) passando booking_id e dados do pagador.
3. Backend cria preferência no Mercado Pago com `access_token` seguro e retorna `init_point` (URL) para checkout.
4. Usuário finaliza pagamento no Mercado Pago.
5. Mercado Pago envia webhook para `/api/mp/webhook` (Edge Function) notificando alteração.
6. Backend valida, atualiza `payments` e `bookings` (status -> `confirmed`), gera Zoom link e envia notificações.

## Variáveis de ambiente (mínimas)
- VITE_SUPABASE_URL (frontend)
- VITE_SUPABASE_ANON_KEY (frontend)
- SUPABASE_URL (backend/edge)
- SUPABASE_SERVICE_ROLE_KEY (backend only)
- MP_ACCESS_TOKEN (backend only)
- MP_PUBLIC_KEY (frontend if needed)
- ZOOM_API_KEY / ZOOM_API_SECRET (backend only)
- SENDGRID_API_KEY or SMTP creds (backend)
- WHATSAPP_API_TOKEN (backend)
 - SENDGRID_API_KEY (backend)
 - SENDGRID_FROM_EMAIL (backend)
 - TWILIO_ACCOUNT_SID (backend)
 - TWILIO_AUTH_TOKEN (backend)
 - TWILIO_WHATSAPP_FROM (backend) e.g. whatsapp:+55XXXXXXXXX

## Deploy rápido no Hostinger (direto ao ponto)
- Build local: `npm run build` (produz `dist/`).
- Upload `dist/` pelo Gerenciador de Arquivos do Hostinger ou configurar integração Git/CI do Hostinger.
- Para webhooks e operações server-side, usar Supabase Edge Functions (mais simples) ou hospedar um pequeno Node service em Hostinger com HTTPS.

## Edge Functions
- Recomendo usar Supabase Edge Functions para:
  - Criar preferência Mercado Pago (não expor token)
  - Processar webhook Mercado Pago
  - Criar meeting Zoom
  - Enviar notificações

## Deploy das Edge Functions (Supabase)
Pré-requisitos:
- Instale a Supabase CLI: https://supabase.com/docs/guides/cli
- Autentique-se: `supabase login`

Passos:
1. No terminal, faça login e selecione o projeto: `supabase login` e `supabase link --project-ref <project-ref>`.
2. Deploy das funções (exemplo):

```bash
npm run supabase:deploy:functions
```

3. Após deploy, anote as URLs públicas das funções para configurar no Mercado Pago (webhook) e para o frontend (create_preference).

Observação: revise as variáveis de ambiente no painel Supabase > Settings > API & Environment Variables e adicione: `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `ZOOM_BEARER_TOKEN`, `ZOOM_USER_ID`.

## Próximos passos imediatos
1. Habilitar RLS e criar policies para proteger dados.
2. Implementar Edge Function para `mp/create_preference` e `mp/webhook`.
3. Ajustar fluxo de sign-in para usar magic link/OTP. (O frontend já envia um magic link automaticamente quando um paciente cria um agendamento sem estar autenticado.)
4. Criar backups e rotina de logs.

## Testes de notificação (SendGrid + Twilio)
1. Configure as variáveis de ambiente do backend:

```powershell
$env:SUPABASE_URL = 'https://<your-supabase>.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY = '<service-role-key>'
$env:MP_ACCESS_TOKEN = '<mp_access_token>'
$env:SENDGRID_API_KEY = '<sendgrid_api_key>'
$env:SENDGRID_FROM_EMAIL = 'no-reply@yourdomain.com'
$env:TWILIO_ACCOUNT_SID = '<twilio_sid>'
$env:TWILIO_AUTH_TOKEN = '<twilio_token>'
$env:TWILIO_WHATSAPP_FROM = 'whatsapp:+5511999999999'
$env:ZOOM_BEARER_TOKEN = '<zoom_bearer>'
```

2. Em ambiente de teste, crie um booking manualmente no Supabase com `status = 'pending_payment'` e `marketplace_preference_id` se quiser simular o fluxo.
3. Simule um webhook POST para a URL da função `mp-webhook` com um JSON contendo `{ id: '<mp_payment_id>' }` (use ngrok ou a URL das Edge Functions). A função buscará o pagamento no Mercado Pago, atualizará o booking, criará a reunião Zoom e tentará enviar email/WhatsApp.
4. Verifique a tabela `logs` para confirmar envios e erros.

## Teste automatizado do fluxo (simples)
Um script de teste rápido está disponível em `tools/test-flow.js` que usa a `service_role` do Supabase para simular:
- criação de booking
- inserção de pagamento (approved)
- confirmação do booking e inserção de zoom_link

Como usar:

1. Copie `config/local.env.example` → `config/local.env` e preencha `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (para testes locais apenas).
2. Rode:

```bash
npm run test:flow
```

Isso criará registros de teste nas tabelas `bookings`, `payments` e `logs`. Depois verifique no Supabase Studio.

## Teste E2E (integração com funções deployadas)
O script `tools/e2e-flow.js` permite testar o fluxo chamando as funções públicas deployadas. Configure no `config/local.env`:

- FUNCTION_CREATE_URL=https://<project>.functions.supabase.co/mp-create-preference
- FUNCTION_WEBHOOK_URL=https://<project>.functions.supabase.co/mp-webhook
- TEST_BOOKING_ID=<id de um booking existente para usar no teste>

Rode:

```bash
npm run test:e2e
```

O script chamará `mp-create-preference` e então postará um webhook fake para `mp-webhook`. Depois verifique no Supabase Studio as atualizações.

## Configuração local (opcional)
Para facilitar o desenvolvimento local você pode criar um arquivo `config/local.env` baseado no `config/local.env.example` com suas chaves de teste (não commitável).

O projeto inclui um loader usado pelas Edge Functions de exemplo para importar `config/local.env` em `process.env` quando rodando localmente. Não use `config/local.env` em produção — em produção configure variáveis de ambiente no provedor (Supabase, Hostinger, etc.).

Lembrete: nunca comite chaves sensíveis no repositório.

---

Para continuar eu posso:
- Gerar o esboço da Edge Function para Mercado Pago (webhook + update DB) — já adicionado em `functions/mp-webhook/index.js`.
- Criar um pequeno exemplo de `create_preference` Edge Function.

Peça para eu aplicar o próximo passo (ex.: criar o endpoint create_preference, ajustar AgendamentoPage para chamar a função, ou criar policies RLS)."}EOF