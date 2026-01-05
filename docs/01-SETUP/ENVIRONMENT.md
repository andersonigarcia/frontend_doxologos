# 🔑 Variáveis de Ambiente - Doxologos

Este documento lista todas as variáveis de ambiente necessárias para o projeto.

---

## 📋 Variáveis Obrigatórias

### Supabase
```bash
# URL do projeto Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co

# Chave pública (anon key)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Chave de serviço (apenas backend/edge functions)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Mercado Pago
```bash
# Access Token (TEST para desenvolvimento, PROD para produção)
MP_ACCESS_TOKEN=TEST-1234567890-123456-abcdef1234567890abcdef1234567890-123456789
# ou
MP_ACCESS_TOKEN=APP_USR-1234567890-123456-abcdef1234567890abcdef1234567890-123456789

# Public Key (frontend)
VITE_MP_PUBLIC_KEY=TEST-abcd1234-efgh-5678-ijkl-9012mnop3456
```

### SMTP (Hostinger)
```bash
# Configurações de email
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=contato@doxologos.com.br
SMTP_PASSWORD=sua-senha-aqui
SMTP_FROM=contato@doxologos.com.br
SMTP_FROM_NAME=Doxologos Psicologia
```

### Zoom (Opcional)
```bash
# OAuth Server-to-Server
ZOOM_ACCOUNT_ID=abc123def456
ZOOM_CLIENT_ID=AbCdEfGhIjKlMnOp
ZOOM_CLIENT_SECRET=1234567890abcdefghijklmnopqrstuv
```

---

## 🌐 Variáveis por Ambiente

### Desenvolvimento (.env.development)
```bash
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Mercado Pago (TEST)
MP_ACCESS_TOKEN=TEST-...
VITE_MP_PUBLIC_KEY=TEST-...

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Debug
VITE_DEBUG=true
```

### Produção (.env.production)
```bash
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Mercado Pago (PROD)
MP_ACCESS_TOKEN=APP_USR-...
VITE_MP_PUBLIC_KEY=APP_USR-...

# Frontend URL
FRONTEND_URL=https://novo.doxologos.com.br

# Debug
VITE_DEBUG=false
```

---

## 🔒 Secrets do Supabase

### Configurar via CLI
```bash
# Mercado Pago
supabase secrets set MP_ACCESS_TOKEN=seu-token-aqui

# Frontend URL
supabase secrets set FRONTEND_URL=https://novo.doxologos.com.br

# SMTP
supabase secrets set SMTP_HOST=smtp.hostinger.com
supabase secrets set SMTP_PORT=465
supabase secrets set SMTP_USER=contato@doxologos.com.br
supabase secrets set SMTP_PASSWORD=sua-senha
supabase secrets set SMTP_FROM=contato@doxologos.com.br

# Zoom (se usar)
supabase secrets set ZOOM_ACCOUNT_ID=abc123
supabase secrets set ZOOM_CLIENT_ID=AbCdEf
supabase secrets set ZOOM_CLIENT_SECRET=123456
```

### Listar Secrets
```bash
supabase secrets list
```

---

## 📝 Arquivo .env.example

```bash
# ===================================
# SUPABASE
# ===================================
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# ===================================
# MERCADO PAGO
# ===================================
# Use TEST para desenvolvimento, APP_USR para produção
MP_ACCESS_TOKEN=TEST-ou-APP_USR-token-aqui
VITE_MP_PUBLIC_KEY=TEST-ou-APP_USR-public-key-aqui

# ===================================
# SMTP (Hostinger)
# ===================================
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=seu-email@dominio.com.br
SMTP_PASSWORD=sua-senha-aqui
SMTP_FROM=seu-email@dominio.com.br
SMTP_FROM_NAME=Nome da Clínica

# ===================================
# ZOOM (Opcional)
# ===================================
ZOOM_ACCOUNT_ID=seu-account-id
ZOOM_CLIENT_ID=seu-client-id
ZOOM_CLIENT_SECRET=seu-client-secret

# ===================================
# APLICAÇÃO
# ===================================
FRONTEND_URL=http://localhost:5173
VITE_DEBUG=true

# ===================================
# GOOGLE ANALYTICS (Opcional)
# ===================================
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 🛡️ Segurança

### ⚠️ NUNCA Commitar
- ❌ `.env`
- ❌ `.env.local`
- ❌ `.env.production`
- ❌ Qualquer arquivo com credenciais reais

### ✅ Pode Commitar
- ✅ `.env.example` (sem valores reais)
- ✅ `.env.development.example`

### .gitignore
```gitignore
# Environment variables
.env
.env.local
.env.development
.env.production
.env.*.local

# Mas mantenha os examples
!.env.example
!.env.*.example
```

---

## 🔍 Como Obter as Credenciais

### Supabase
1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### Mercado Pago
1. Acesse [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers)
2. Vá em **Suas integrações**
3. Selecione ou crie uma aplicação
4. Copie:
   - Access Token (TEST ou PROD) → `MP_ACCESS_TOKEN`
   - Public Key → `VITE_MP_PUBLIC_KEY`

### SMTP Hostinger
1. Acesse [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Vá em **Emails**
3. Configure uma conta de email
4. Use:
   - Host: `smtp.hostinger.com`
   - Porta: `465` (SSL) ou `587` (TLS)
   - Usuário: seu email completo
   - Senha: senha do email

### Zoom
1. Acesse [marketplace.zoom.us](https://marketplace.zoom.us)
2. Crie um app **Server-to-Server OAuth**
3. Copie:
   - Account ID
   - Client ID
   - Client Secret

---

## ✅ Checklist de Configuração

### Desenvolvimento
- [ ] Arquivo `.env.development` criado
- [ ] Todas as variáveis preenchidas
- [ ] Usando credenciais de TEST do Mercado Pago
- [ ] Frontend URL apontando para localhost

### Produção
- [ ] Secrets configurados no Supabase
- [ ] Usando credenciais de PROD do Mercado Pago
- [ ] Frontend URL apontando para domínio real
- [ ] Debug mode desativado
- [ ] Arquivo `.env` no .gitignore

---

**Última atualização**: 30 de Dezembro de 2025
