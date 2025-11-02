# 📚 Documentação - Doxologos Psicologia# 📁 Estrutura de Pastas - Doxologos



> **Sistema de Gestão de Clínica de Psicologia**  Este documento descreve a organização dos arquivos no projeto Doxologos após a reestruturação.

> **Versão**: 2.0  

> **Última Atualização**: 28 de Janeiro de 2025## 📂 Estrutura Principal



---```

frontend_doxologos/

## 🎯 Visão Geral├── 📄 Arquivos de Configuração Raiz

│   ├── package.json              # Dependências e scripts

Sistema completo para gestão de clínica de psicologia com:│   ├── vite.config.js           # Configuração Vite

│   ├── tailwind.config.js       # Configuração Tailwind

- ✅ Agendamento online│   ├── postcss.config.js        # Configuração PostCSS

- ✅ Pagamentos (PIX, Cartão, Boleto)│   └── index.html               # Template HTML principal

- ✅ Integração Zoom│

- ✅ Sistema de emails├── 📚 docs/                     # Documentação

- ✅ Área do paciente│   ├── ACCESSIBILITY_IMPROVEMENTS.md

- ✅ Painel administrativo│   ├── DATABASE_STRUCTURE.md

- ✅ Eventos e workshops│   ├── GA4_SETUP_GUIDE.md

│   ├── IMPLEMENTATION_GUIDE.md

---│   ├── MONITORING_SYSTEM.md

│   └── USERS_GUIDE.md

## 📋 Índice da Documentação│

├── 🗄️ database/                 # Scripts de Banco de Dados

### 🚀 01. Setup e Configuração│   ├── migrations/              # Scripts de migração

│   │   ├── create_reviews_table.sql

- 📄 [Setup Completo](01-SETUP/SETUP.md) - Instalação e configuração inicial│   │   ├── add_direct_fields_to_reviews.sql

- 🔑 [Variáveis de Ambiente](01-SETUP/ENVIRONMENT.md) - Todas as env vars necessárias│   │   └── insert_sample_reviews.sql

- 🗄️ [Banco de Dados](01-SETUP/DATABASE.md) - Estrutura e migrations│   └── scripts/                 # Scripts utilitários

│       ├── diagnose_bookings_table.sql

### 💡 02. Funcionalidades (Features)│       ├── diagnose_reviews_table.sql

│       ├── supabase_add_valor_consulta.sql

#### Pagamentos│       ├── supabase_setup_storage.sql

- 💳 [**Sistema de Pagamentos**](02-FEATURES/PAYMENT.md) - PIX, Cartão Direto, Boleto, Mercado Pago│       ├── supabase_update_availability.sql

  - Pagamento PIX inline com QR Code│       └── supabase_update_professionals.sql

  - Formulário de cartão direto (sem redirect)│

  - Integração completa com MP API├── 📊 analytics/                # Arquivos de Analytics

  - Webhook e notificações│   ├── ga4-setup-report.json

  - Edge Functions│   └── ga4-validation.js

│

#### Comunicação├── ⚡ src/                      # Código Fonte Principal

- 📧 [**Sistema de Emails**](02-FEATURES/EMAIL.md) - SMTP Hostinger, templates, automações│   ├── components/              # Componentes React

  - 7 templates responsivos│   ├── pages/                   # Páginas da aplicação

  - Confirmações, lembretes, agradecimentos│   ├── hooks/                   # Custom hooks

  - Recuperação de senha│   ├── lib/                     # Bibliotecas e utilitários

  - Integração com bookings│   ├── contexts/                # Context providers

│   └── config/                  # Configurações

#### Integrações│

- 🎥 [**Integração Zoom**](02-FEATURES/ZOOM.md) - Criação automática de salas├── 🔧 config/                   # Configurações de Ambiente

  - OAuth Server-to-Server│   └── local.env.example        # Exemplo de variáveis de ambiente

  - Salas automáticas por agendamento│

  - Instruções para iniciantes├── 📦 supabase/                 # Configurações Supabase

  │   └── functions/               # Edge Functions

#### Core Features│

- 📅 [**Sistema de Agendamentos**](02-FEATURES/BOOKING.md) - Criar, reagendar, cancelar├── 🛠️ tools/                    # Ferramentas de Build

- 🎫 [**Sistema de Eventos**](02-FEATURES/EVENTS.md) - Workshops e eventos pagos│   ├── deploy.mjs

- 🔐 [**Autenticação**](02-FEATURES/AUTH.md) - Login, registro, recuperação de senha│   ├── setup-ga4.mjs

│   └── outros scripts...

### 🚀 03. Deploy│

├── 🔌 plugins/                  # Plugins Vite

- 📦 [**Guia de Deploy**](03-DEPLOY/DEPLOY.md) - Deploy completo no Hostinger│   └── vite-plugin-*

  - Passo a passo com screenshots│

  - Configuração .htaccess├── 🧪 temp/                     # Arquivos Temporários/Teste

  - Deploy de Edge Functions│   ├── create-test-user.js

  - Configuração de secrets│   ├── test-user.js

  │   └── test-admin-function.js

- ✅ [**Checklist de Deploy**](03-DEPLOY/CHECKLIST.md) - Use antes de cada deploy│

  - Pré-deploy└── 📜 scripts/                  # Scripts de Build

  - Deploy    └── build-production.sh

  - Pós-deploy```

  - Testes funcionais

## 🎯 Benefícios da Nova Organização

### 🛠️ 04. Desenvolvimento

### ✅ **Organização Clara**

- 📊 [**Logs e Monitoramento**](04-DEVELOPMENT/LOGGING.md) - Sistema de logs estruturados- Cada tipo de arquivo tem sua pasta específica

- 🔒 [**Segurança**](04-DEVELOPMENT/SECURITY.md) - RLS, validações, autenticação- Documentação centralizada em `/docs`

- ⚡ [**Performance**](04-DEVELOPMENT/PERFORMANCE.md) - Otimizações e loading- Scripts de banco separados por tipo



### 🐛 05. Troubleshooting### ✅ **Manutenção Facilitada**

- Fácil localização de arquivos

- 🔧 [**Problemas Comuns**](05-TROUBLESHOOTING/COMMON-ISSUES.md)- Separação entre código, docs e utilitários

- 💳 [**Problemas com Pagamentos**](05-TROUBLESHOOTING/PAYMENT-ISSUES.md)- Estrutura escalável

- 📧 [**Problemas com Emails**](05-TROUBLESHOOTING/EMAIL-ISSUES.md)

### ✅ **Deploy Limpo**

### 🎨 06. Design- Arquivos temporários isolados em `/temp`

- Configurações organizadas

- 🎨 [**Sistema de Design**](06-DESIGN/DESIGN-SYSTEM.md) - Componentes, cores, tipografia- Build files separados

- ♿ [**Acessibilidade**](06-DESIGN/ACCESSIBILITY.md) - WCAG 2.1, melhorias A11y

## 🔍 Onde Encontrar Cada Tipo de Arquivo

### 📦 07. Arquivo

| Tipo de Arquivo | Localização | Exemplo |

- 📂 [**Correções Antigas**](07-ARCHIVE/) - Histórico de fixes implementados|-----------------|-------------|---------|

| 📚 Documentação | `/docs/` | USERS_GUIDE.md |

---| 🗄️ SQL Migrations | `/database/migrations/` | create_reviews_table.sql |

| 🛠️ SQL Scripts | `/database/scripts/` | diagnose_bookings_table.sql |

## 🚀 Quick Start| 📊 Analytics | `/analytics/` | ga4-setup-report.json |

| 🧪 Testes/Temp | `/temp/` | test-user.js |

### Pré-requisitos| ⚙️ Configs | `/config/` | local.env.example |



- Node.js 18+## 🚀 Próximos Passos

- npm ou yarn

- Conta Supabase1. **Atualizar imports** se houver referências hardcoded

- Conta Mercado Pago2. **Atualizar documentação** com novos caminhos

- Conta Zoom (opcional)3. **Configurar .gitignore** para ignorar `/temp/` se necessário

- Hospedagem Hostinger4. **Atualizar scripts** de build se referenciarem arquivos movidos



### Instalação Rápida---

*Estrutura atualizada em: 26 de Outubro de 2025*
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
│   ├── components/       # Componentes React
│   ├── pages/           # Páginas/rotas
│   ├── lib/             # Services (Supabase, MP, Zoom, Email)
│   ├── hooks/           # Custom hooks
│   └── styles/          # CSS/Tailwind
├── supabase/
│   └── functions/       # Edge Functions (Deno)
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

---

## 📊 Fluxo de Uso

### 1. Paciente Agenda Consulta

```
Paciente acessa site
  → Escolhe profissional e horário
  → Cria conta (se necessário)
  → Sistema cria booking (status: pending)
  → Envia email de confirmação
  → Redireciona para checkout
```

### 2. Pagamento

#### Opção A: PIX
```
Escolhe PIX
  → Sistema gera QR Code (inline)
  → Paciente paga via app bancário
  → Sistema detecta pagamento (polling 3s)
  → Atualiza status (confirmed)
  → Envia email com link Zoom
```

#### Opção B: Cartão Direto
```
Escolhe Cartão
  → Preenche formulário no site
  → SDK tokeniza cartão (client-side)
  → Edge Function processa pagamento
  → MP aprova instantaneamente
  → Atualiza status (confirmed)
  → Envia email com link Zoom
```

### 3. Consulta

```
24h antes
  → Sistema envia lembrete automático
  
No dia
  → Paciente clica no link do email
  → Abre Zoom automaticamente
  → Profissional inicia reunião
  → Consulta acontece
  
Após consulta
  → Sistema envia email de agradecimento
  → Solicita avaliação
```

---

## 🔗 Links Úteis

### Produção
- **Site**: https://novo.doxologos.com.br
- **Admin**: https://novo.doxologos.com.br/admin
- **Área do Paciente**: https://novo.doxologos.com.br/area-do-paciente

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

### v2.0 (28/01/2025)
- ✅ Implementação de pagamento com cartão direto
- ✅ Correção de links de email (localhost → produção)
- ✅ Sistema de logs estruturados
- ✅ Reorganização completa da documentação
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
