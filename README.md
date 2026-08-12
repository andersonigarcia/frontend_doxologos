# Doxologos — Plataforma de Telepsicologia

> SPA React + Vite com Supabase como BaaS. Oferece agendamento, pagamentos (PIX e cartão via Mercado Pago), videoconferência (Google Meet / Zoom), e gestão administrativa completa.

📐 **Decisões técnicas e modelo de dados:** [ARCH.md](./ARCH.md)  
🧠 **Squad Multiagente & Inteligência do Projeto:** [.squad/README.md](./.squad/README.md)  
📚 **Documentação Técnica Completa:** [docs/README.md](./docs/README.md)  


---

## Índice

- [Visão Geral](#visão-geral)
- [Stack](#stack)
- [Instalação Local](#instalação-local)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Deploy](#deploy)
- [Testes](#testes)

---

## Visão Geral

O Doxologos é uma plataforma de saúde mental online que conecta pacientes a psicólogos. O sistema resolve:

- **Agendamento** de consultas com seleção de profissional, serviço, data e horário.
- **Pagamento online** via PIX e cartão de crédito, integrado ao Mercado Pago.
- **Videoconferência** via Google Meet / Zoom, com links gerados automaticamente pós-confirmação de pagamento.
- **Área do Paciente** para acompanhar histórico de consultas, inscrições em eventos e remarcações.
- **Painel Administrativo** completo (agendas, pagamentos, usuários, finanças).
- **Eventos e inscrições** com controle de vagas e envio de lembretes automáticos.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, Vite 4, React Router v6 |
| UI | TailwindCSS 3, Radix UI, Framer Motion, Lucide Icons |
| Formulários | react-hook-form + Zod |
| Server State | @tanstack/react-query |
| Auth | Supabase Auth (email/senha + Magic Link) |
| Database | Supabase PostgreSQL (com RLS) |
| Backend-as-a-Service | Supabase Edge Functions (Deno) |
| Pagamentos | Mercado Pago (PIX + Cartão) |
| Videoconferência | Zoom API / Google Meet |
| Notificações | Nodemailer (SMTP Hostinger) + Twilio (WhatsApp) |
| Observabilidade | Web Vitals, Audit Logger, Logger estruturado |
| Hospedagem | Netlify (frontend) + Supabase (BaaS + functions) |

---

## Instalação Local

**Pré-requisitos:** Node.js ≥ 18, npm ≥ 9.

```bash
# 1. Clone o repositório
git clone <repo-url>
cd frontend_doxologos

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp config/local.env.example config/local.env
# Edite config/local.env com suas chaves

# 4. Inicie o servidor de desenvolvimento
npm run dev
# Acessível em http://localhost:3000
```

> **HTTPS local (necessário para Mercado Pago):** `.\start-https-dev.ps1`

---

## Variáveis de Ambiente

Separadas por contexto. **Nunca comite chaves reais no git.**

### Frontend (`VITE_*` — expostas ao browser)

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL pública do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase (pública) |
| `VITE_APP_URL` | URL base da aplicação (ex: `https://doxologos.com.br`) |
| `VITE_APP_ENV` | Ambiente: `development`, `staging`, `production` |
| `VITE_LOG_LEVEL` | Nível de log: `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `VITE_GA4_MEASUREMENT_ID` | ID do Google Analytics 4 (opcional) |

### Backend — Edge Functions (configuradas no Supabase Dashboard)

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔐 Chave de serviço (acesso total, **nunca expor**) |
| `MP_ACCESS_TOKEN` | 🔐 Token OAuth Mercado Pago (backend only) |
| `ZOOM_BEARER_TOKEN` | 🔐 Token da API do Zoom |
| `ZOOM_USER_ID` | ID do usuário host no Zoom |
| `SMTP_HOST` | Host SMTP para envio de emails |
| `SMTP_PORT` | Porta SMTP (ex: `587`) |
| `SMTP_USER` | Usuário SMTP |
| `SMTP_PASS` | 🔐 Senha SMTP |
| `SMTP_FROM_EMAIL` | E-mail remetente |
| `TWILIO_ACCOUNT_SID` | 🔐 SID da conta Twilio |
| `TWILIO_AUTH_TOKEN` | 🔐 Token auth Twilio |
| `TWILIO_WHATSAPP_FROM` | Número WhatsApp Twilio (ex: `whatsapp:+55...`) |

---

## Scripts Disponíveis

```bash
npm run dev                        # Servidor local (porta 3000)
npm run build                      # Build de produção (gera dist/)
npm run preview                    # Preview do build local

npm test                           # Testes unitários (Jest)
npm run test:coverage              # Cobertura de testes
npm run test:e2e:ui                # Testes E2E (Playwright)

npm run test:flow                  # Simula fluxo de agendamento + pagamento
npm run test:e2e                   # Teste de integração com Edge Functions

npm run supabase:deploy:functions  # Deploy mp-create-preference e mp-webhook
npm run supabase:deploy:all        # Idem

npm run deploy:netlify             # Deploy frontend no Netlify
npm run analyze:bundle             # Analisa bundle gerado
```

---

## Deploy

### Frontend (Netlify)
1. `npm run build` — gera a pasta `dist/`.
2. `netlify deploy --prod` ou configure o CI no painel Netlify.
3. Configure as variáveis `VITE_*` nas **Environment Variables** do Netlify.

### Edge Functions (Supabase)
```bash
supabase login
supabase link --project-ref <project-ref>
npm run supabase:deploy:all
```
Configure as variáveis de backend no painel **Supabase → Settings → Edge Function Secrets**.

---

## Testes

| Tipo | Framework | Comando |
|---|---|---|
| Unitários | Jest + Testing Library | `npm test` |
| E2E (UI) | Playwright | `npm run test:e2e:ui` |
| Integração Pagamento | Node script | `npm run test:flow` |
| Integração Edge Functions | Node script | `npm run test:e2e` |

> Consulte [ARCH.md](./ARCH.md) para fluxos detalhados, modelo de dados e políticas RLS.
