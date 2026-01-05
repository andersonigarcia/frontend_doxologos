# 🚀 Guia de Deploy - Hostinger

> **Ambiente**: Produção  
> **URL**: https://novo.doxologos.com.br  
> **Método**: FTP Manual via hPanel

---

## 📋 Checklist Pré-Deploy

- [ ] Variáveis de ambiente configuradas (`.env.production`)
- [ ] Build gerado (`npm run build`)
- [ ] Edge Functions deployadas
- [ ] Secrets do Supabase configurados
- [ ] Testes locais concluídos
- [ ] Backup do banco de dados

---

## 🔧 Passo a Passo

### 1. Configurar Variáveis de Ambiente

Editar `.env.production`:

```bash
VITE_SUPABASE_URL=https://ppwjtvzrhvjinsutrjwk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_MP_PUBLIC_KEY=APP_USR-4fdd0ea3-c204-438a-9eea-4f503bca869d
VITE_APP_URL=https://novo.doxologos.com.br
VITE_ENABLE_EMAIL_NOTIFICATIONS=true
```

### 2. Gerar Build

```powershell
# Limpar build anterior
Remove-Item -Recurse -Force dist

# Gerar novo build
npm run build

# Verificar tamanho
Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum
```

### 3. Criar ZIP para Upload

```powershell
# Criar ZIP do build
Compress-Archive -Path dist\* -DestinationPath deploy-novo-doxologos.zip -Force

# Verificar tamanho do ZIP
Get-Item deploy-novo-doxologos.zip | Select-Object Name, Length
```

### 4. Upload via Hostinger hPanel

1. Acesse: https://hpanel.hostinger.com
2. Vá em **Arquivos** → **Gerenciador de Arquivos**
3. Navegue até `/public_html/novo/`
4. Clique em **Upload** → Selecione `deploy-novo-doxologos.zip`
5. Aguarde upload completo
6. Clique com botão direito no ZIP → **Extract**
7. Confirmar extração
8. Deletar arquivo ZIP após extração

### 5. Configurar .htaccess (SPA)

Criar/atualizar `/public_html/novo/.htaccess`:

```apache
# Suporte a SPA (React Router)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /novo/
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /novo/index.html [L]
</IfModule>

# Habilitar compressão Gzip
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json
</IfModule>

# Cache de assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>

# Forçar HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### 6. Deploy Edge Functions

```bash
# Login no Supabase
supabase login

# Link ao projeto
supabase link --project-ref ppwjtvzrhvjinsutrjwk

# Deploy todas as functions
supabase functions deploy mp-create-payment
supabase functions deploy mp-process-card-payment
supabase functions deploy mp-check-payment
supabase functions deploy mp-webhook
supabase functions deploy send-email
supabase functions deploy create-zoom-meeting

# Verificar deploy
supabase functions list
```

### 7. Configurar Secrets (Supabase)

```bash
# Mercado Pago
supabase secrets set MP_ACCESS_TOKEN=APP_USR-******

# SMTP
supabase secrets set SMTP_HOST=smtp.hostinger.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=doxologos@doxologos.com.br
supabase secrets set SMTP_PASSWORD=*****

# Zoom
supabase secrets set ZOOM_CLIENT_ID=*****
supabase secrets set ZOOM_CLIENT_SECRET=*****
supabase secrets set ZOOM_ACCOUNT_ID=*****

# Supabase
supabase secrets set SUPABASE_URL=https://ppwjtvzrhvjinsutrjwk.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=*****
```

### 8. Testar Produção

**Checklist de Testes:**

- [ ] Abrir https://novo.doxologos.com.br
- [ ] Fazer login
- [ ] Criar agendamento
- [ ] Processar pagamento PIX
- [ ] Processar pagamento Cartão
- [ ] Verificar email de confirmação
- [ ] Verificar link do Zoom no email
- [ ] Testar reagendamento
- [ ] Testar cancelamento
- [ ] Verificar área do paciente

---

## 🔄 Deploy Rápido (Atualizações)

Para pequenas mudanças que não afetam Edge Functions:

```powershell
# 1. Build
npm run build

# 2. ZIP
Compress-Archive -Path dist\* -DestinationPath deploy-v2.zip -Force

# 3. Upload via hPanel
# (mesmo processo acima)

# 4. Extract
# (mesmo processo acima)
```

**Tempo total:** ~5 minutos

---

## 🐛 Troubleshooting

### Build com erro

```powershell
# Limpar cache
npm run clean
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Reinstalar
npm install

# Build novamente
npm run build
```

### Assets não carregam

**Verificar `vite.config.js`:**

```javascript
export default defineConfig({
  base: '/novo/', // ⚠️ Importante para Hostinger
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
```

### Edge Function não responde

**Verificar logs:**

```bash
supabase functions logs mp-process-card-payment --limit 50
```

### CORS Error

**Verificar CORS na Edge Function:**

```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Ou URL específica
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  }
});
```

---

## 📊 Monitoramento Pós-Deploy

### 1. Verificar Logs do Supabase

```bash
# Logs em tempo real
supabase functions logs --tail

# Logs específicos
supabase functions logs mp-webhook --limit 100
```

### 2. Monitorar Pagamentos

```sql
-- Pagamentos das últimas 24h
SELECT 
  status,
  payment_method,
  COUNT(*) as total,
  SUM(amount) as valor_total
FROM payments
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status, payment_method;
```

### 3. Google Analytics

Verificar eventos:
- Page views
- Payment initiated
- Payment completed
- Booking created

---

## 🔒 Segurança

### Checklist de Segurança

- [ ] HTTPS habilitado (forçado via .htaccess)
- [ ] Secrets do Supabase não expostos
- [ ] Row Level Security (RLS) habilitado
- [ ] Rate limiting nas Edge Functions
- [ ] Validação de inputs no backend
- [ ] CORS configurado corretamente

---

## 📚 Recursos

- [Hostinger hPanel](https://hpanel.hostinger.com)
- [Supabase Dashboard](https://supabase.com/dashboard/project/ppwjtvzrhvjinsutrjwk)
- [Mercado Pago Dashboard](https://www.mercadopago.com.br/developers)

---

**Última atualização**: 28/01/2025 | [Voltar ao Índice](../README.md)
