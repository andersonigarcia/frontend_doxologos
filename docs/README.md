# 📚 Documentação - Doxologos Psicologia

> **Sistema de Gestão de Clínica de Psicologia**  
> **Versão**: 3.2  
> **Última Atualização**: Agosto de 2026

---

## 🎯 Visão Geral

Sistema completo para gestão de clínica de psicologia com:

- ✅ Agendamento online 24/7 com tolerância dinâmica de pendências
- ✅ Pagamentos (PIX inline mobile-first, Cartão Direto sem redirect, Boleto, Créditos Financeiros)
- ✅ Gestão de disponibilidade dos psicólogos com replicação trimestral (v3.1)
- ✅ Otimização de conversão mobile e formulários nativos iOS/Android (v3.1)
- ✅ Painel administrativo com Data Table de alta densidade e DRE/Ledger reconciliado (v3.2)
- ✅ Integração Zoom OAuth Server-to-Server
- ✅ Sistema de emails transacionais SMTP Hostinger
- ✅ Área do paciente e painel administrativo do profissional
- ✅ Eventos, workshops e blog integrado (Substack)

---

## 📋 Índice da Documentação

### 🚀 01. Setup e Configuração

- 📄 [Setup Completo](01-SETUP/SETUP.md) - Instalação e configuração inicial
- 🔑 [Variáveis de Ambiente](01-SETUP/ENVIRONMENT.md) - Todas as env vars necessárias
- 🗄️ [Banco de Dados](01-SETUP/DATABASE.md) - Estrutura e migrations
- 👤 [Guia do Usuário](01-SETUP/USER_GUIDE.md) - Como usar a plataforma

### 💡 02. Funcionalidades (Features)

#### Pagamentos
- 💳 [**Sistema de Pagamentos**](02-FEATURES/PAYMENT.md) - PIX, Cartão Direto, Boleto, Mercado Pago
  - Pagamento PIX inline com QR Code
  - Formulário de cartão direto (sem redirect)
  - Integração completa com MP API
  - Webhook e notificações

#### Comunicação
- 📧 [**Sistema de Emails**](02-FEATURES/EMAIL.md) - SMTP Hostinger, templates, automações
  - 7 templates responsivos
  - Confirmações, lembretes, agradecimentos
  - Recuperação de senha

#### Integrações
- 🎥 [**Integração Zoom**](02-FEATURES/ZOOM.md) - Criação automática de salas
  - OAuth Server-to-Server
  - Salas automáticas por agendamento

#### Core Features
- 📅 [**Sistema de Agendamentos**](02-FEATURES/BOOKING.md) - Criar, reagendar, cancelar
- 🎫 [**Sistema de Eventos**](02-FEATURES/EVENTS.md) - Workshops e eventos pagos
- 🔐 [**Autenticação**](02-FEATURES/AUTH.md) - Login, registro, recuperação de senha
- 📄 [**Sistema de Documentos**](02-FEATURES/DOCUMENTS.md) - Upload e gestão de documentos
- 💼 [**Trabalhe Conosco**](02-FEATURES/CAREERS.md) - Sistema de candidaturas
- 📰 [**Blog (Substack)**](02-FEATURES/BLOG.md) - Sincronização e exibição de artigos

### 🚀 03. Deploy

- 📦 [**Guia de Deploy**](03-DEPLOY/DEPLOY.md) - Deploy completo no Hostinger
  - Passo a passo com screenshots
  - Configuração .htaccess
  - Deploy de Edge Functions
  - Configuração de secrets

- ✅ [**Checklist de Deploy**](03-DEPLOY/CHECKLIST.md) - Use antes de cada deploy
  - Pré-deploy
  - Deploy
  - Pós-deploy
  - Testes funcionais

### 🛠️ 04. Desenvolvimento

- 📊 [**Logs e Monitoramento**](04-DEVELOPMENT/LOGGING.md) - Sistema de logs estruturados
- 🔒 [**Segurança**](04-DEVELOPMENT/SECURITY.md) - RLS, validações, autenticação
- ⚡ [**Performance**](04-DEVELOPMENT/PERFORMANCE.md) - Otimizações e loading
- 📖 [**Guia de Implementação**](04-DEVELOPMENT/IMPLEMENTATION_GUIDE.md) - Guia técnico
- ✅ [**Checklist de Validação**](04-DEVELOPMENT/IMPLEMENTATION_VALIDATION_CHECKLIST.md) - Validação de implementações

### 🐛 05. Troubleshooting

- 🔧 [**Problemas Comuns**](05-TROUBLESHOOTING/COMMON-ISSUES.md) - Build, Auth, Database, UI
- 💳 [**Problemas com Pagamentos**](05-TROUBLESHOOTING/PAYMENT-ISSUES.md) - PIX, Cartão, Webhook
- 📧 [**Problemas com Emails**](05-TROUBLESHOOTING/EMAIL-ISSUES.md) - SMTP, Links, Entrega

### 🎨 06. Design

- 🎨 [**Paleta de Cores**](06-DESIGN/COLORS.md) - Sistema de cores e comparações
- ♿ [**Acessibilidade**](06-DESIGN/ACCESSIBILITY.md) - WCAG 2.1, melhorias A11y
- 🔍 [**SEO**](06-DESIGN/SEO.md) - Otimização para motores de busca
- 📊 [**Analytics**](06-DESIGN/ANALYTICS.md) - Google Analytics 4
- 🎯 [**UX de Conversão**](06-DESIGN/UX_CONVERSION.md) - Melhorias de interface e marketing

### 📦 07. Arquivo

- 📂 [**Correções Antigas**](07-ARCHIVE/) - Histórico de fixes implementados
- 📂 [**Versões Anteriores**](07-ARCHIVE/) - Documentação histórica

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase
- Conta Mercado Pago
- Conta Zoom (opcional)
- Hospedagem Hostinger

### Instalação Rápida

```bash
# 1. Clonar repositório
git clone https://github.com/andersonigarcia/frontend_doxologos.git
cd frontend_doxologos

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp config/local.env.example config/local.env
# Editar config/local.env com suas credenciais

# 4. Executar migrações do banco
# (via Supabase Dashboard ou CLI)

# 5. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

---

## 🏗️ Arquitetura

### Tech Stack

**Frontend:**
- React 18.2
- Vite 4.5.14
- React Router DOM
- TailwindCSS
- Framer Motion (animações)
- Lucide React (ícones)
- Mercado Pago SDK v2

**Backend:**
- Supabase (PostgreSQL + Edge Functions)
- Deno runtime para Edge Functions
- Nodemailer (SMTP)

**Integrações:**
- Mercado Pago API v1 (Pagamentos)
- Zoom API (Video conferências)
- Hostinger SMTP (Emails)

### Estrutura de Pastas

```
frontend_doxologos/
├── src/
│   ├── components/
│   │   ├── home/           # Componentes da página inicial
│   │   │   ├── HomeHeader.jsx
│   │   │   ├── HeroSection.jsx
│   │   │   ├── BlogPreviewSection.jsx  # 🆕 v2.2
│   │   │   ├── FaqSection.jsx
│   │   │   ├── ContactSection.jsx
│   │   │   ├── ProfessionalsCarousel.jsx
│   │   │   ├── TestimonialsSection.jsx
│   │   │   ├── StickyBottomCTA.jsx
│   │   │   └── AnxietyGuideModal.jsx
│   │   ├── booking/        # Componentes de agendamento
│   │   ├── auth/           # Componentes de autenticação
│   │   ├── ui/             # Design system (shadcn/ui)
│   │   └── shared/         # Componentes reutilizáveis
│   ├── pages/           # Páginas/rotas
│   │   ├── HomePage.jsx
│   │   ├── BlogPage.jsx         # 🆕 v2.2
│   │   ├── ArticlePage.jsx      # 🆕 v2.2
│   │   ├── AgendamentoPage.jsx
│   │   ├── CheckoutPage.jsx
│   │   └── ... (demais páginas)
│   ├── lib/             # Services e utiliários
│   ├── hooks/           # Custom hooks
│   └── contexts/        # React Contexts (Auth, etc)
├── supabase/
│   └── functions/       # Edge Functions (Deno)
│       ├── sync-substack-manual/   # 🆕 v2.2 - Sincroniza RSS Substack
│       ├── mp-create-payment/
│       ├── mp-process-card-payment/
│       ├── mp-webhook/
│       ├── mp-check-payment/
│       ├── mp-reconcile-payment/
│       ├── mp-create-preference/
│       ├── send-email/
│       ├── send-pending-payment-reminders/
│       ├── create-zoom-meeting/
│       ├── zoom-create-meeting/
│       ├── zoom-delete-meeting/
│       ├── zoom-update-meeting/
│       ├── event-generate-payment/
│       ├── event-send-reminders/
│       ├── event-cleanup-expired/
│       ├── event-get-meeting/
│       ├── admin-create-user/
│       ├── admin-delete-user/
│       ├── admin-list-users/
│       ├── admin-update-user/
│       ├── financial-credit-manager/
│       ├── manual-refund/
│       ├── manual-refund-notify/
│       ├── manual-refund-overview/
│       ├── manual-refund-proof/
│       ├── patient-cancel-booking/
│       └── patient-notes-manager/
├── database/
│   └── migrations/      # SQL migrations
├── docs/                # 📚 Documentação (VOCÊ ESTÁ AQUI)
│   ├── 01-SETUP/
│   ├── 02-FEATURES/
│   ├── 03-DEPLOY/
│   ├── 04-DEVELOPMENT/
│   ├── 05-TROUBLESHOOTING/
│   ├── 06-DESIGN/
│   └── 07-ARCHIVE/
├── public/              # Assets estáticos
├── config/              # Arquivos de configuração
└── dist/                # Build de produção
```

---

## 🔑 Principais Recursos

### Para Pacientes

- ✅ Agendamento online 24/7
- ✅ Pagamento via PIX (instantâneo)
- ✅ Pagamento com Cartão (parcelado)
- ✅ Reagendamento fácil
- ✅ Área pessoal com histórico
- ✅ Lembretes automáticos (24h antes)
- ✅ Link do Zoom no email
- ✅ Inscrição em eventos/workshops
- ✅ Blog e artigos gratuitos (Substack integrado)

### Para Profissionais

- ✅ Painel administrativo
- ✅ Gestão de agendamentos
- ✅ Controle de pagamentos
- ✅ Criação de eventos
- ✅ Relatórios financeiros
- ✅ Histórico completo de pacientes

### Para Administradores

- ✅ Gestão de usuários
- ✅ Configuração de serviços
- ✅ Controle de preços
- ✅ Logs e monitoramento
- ✅ Analytics (Google Analytics 4)
- ✅ Sincronização de artigos do Blog (Substack)

---

## 🔗 Links Úteis

### Produção
- **Site**: https://novo.doxologos.com.br
- **Admin**: https://novo.doxologos.com.br/admin
- **Área do Paciente**: https://novo.doxologos.com.br/area-do-paciente
- **Blog**: https://novo.doxologos.com.br/artigos
- **Substack**: https://doxologosoficial.substack.com

### Dashboards
- **Supabase**: https://supabase.com/dashboard/project/ppwjtvzrhvjinsutrjwk
- **Mercado Pago**: https://www.mercadopago.com.br/developers
- **Hostinger**: https://hpanel.hostinger.com
- **Zoom**: https://marketplace.zoom.us

### Repositórios
- **GitHub**: https://github.com/andersonigarcia/frontend_doxologos

---

## 🤝 Contribuindo

### Reportar Bugs

Abra uma issue no GitHub com:
- Descrição detalhada
- Steps to reproduce
- Screenshots (se aplicável)
- Console logs
- Ambiente (browser, OS)

### Sugerir Features

Abra uma issue com:
- Descrição da feature
- Casos de uso
- Mockups (se possível)

---

## 📞 Suporte

**Desenvolvedor**: Anderson Garcia  
**Email**: ander.s_97@hotmail.com  
**GitHub**: [@andersonigarcia](https://github.com/andersonigarcia)

---

## 📄 Licença

Proprietary - Doxologos Psicologia © 2025

---

## 🎉 Changelog

### v2.2 (Jul 2026)
- ✅ Integração com Blog (Substack) via Edge Function
- ✅ `BlogPreviewSection` e banner de Newsletter na HomePage
- ✅ Melhorias de UX e marketing de conversão na HomePage
- ✅ Simplificação do cabeçalho (menu focado em conversão)
- ✅ FAQ com CTAs, deduplicação e suporte a JSX
- ✅ Seção de Contato redesenhada (WhatsApp + alerta CVV)
- ✅ Rodapé reorganizado por persona + link Instagram
- ✅ Coesão de marca: logotipo padronizado em 10 páginas
- ✅ Correção de roteamento de links âncora no rodapé

### v2.1 (30/12/2025)
- ✅ Reorganização completa da documentação
- ✅ Estrutura otimizada (7 categorias)
- ✅ Consolidação de arquivos duplicados
- ✅ Criação de pastas 01-SETUP e 06-DESIGN

### v2.0 (28/01/2025)
- ✅ Implementação de pagamento com cartão direto
- ✅ Correção de links de email (localhost → produção)
- ✅ Sistema de logs estruturados
- ✅ Melhoria na experiência de checkout

### v1.5 (Dez/2024)
- ✅ Integração Zoom
- ✅ Sistema de emails SMTP
- ✅ Pagamento PIX inline

### v1.0 (Nov/2024)
- ✅ Lançamento inicial
- ✅ Agendamentos
- ✅ Integração Mercado Pago (redirect)
- ✅ Área do paciente

---

**Boa leitura! 📚**

Para começar, veja [Setup Completo](01-SETUP/SETUP.md).
