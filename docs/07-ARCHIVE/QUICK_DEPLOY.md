# Quick Deploy - Sistema de Pagamentos

## 🚀 Comandos Rápidos (Copy & Paste)

### 1. Deploy das Edge Functions

```bash
# Login no Supabase (primeira vez)
supabase login

# Link com seu projeto
supabase link --project-ref seu-project-ref

# Deploy das 3 funções
supabase functions deploy mp-create-preference
supabase functions deploy mp-refund
supabase functions deploy mp-webhook
```

### 2. Configurar Secrets

```bash
# Token do Mercado Pago (obtenha em https://www.mercadopago.com.br/developers)
supabase secrets set MP_ACCESS_TOKEN=TEST-seu-token-de-teste-aqui

# URL do seu frontend
supabase secrets set FRONTEND_URL=http://localhost:5173
```

### 3. Executar Migration SQL

Copie o conteúdo de `database/migrations/create_payments_table.sql` e execute no **Supabase Dashboard → SQL Editor**.

Ou via CLI:
```bash
psql $DATABASE_URL < database/migrations/create_payments_table.sql
```

### 4. Testar Função

```bash
# Obtenha sua ANON_KEY no dashboard do Supabase
export ANON_KEY=sua-anon-key-aqui

# Teste a função
curl -X POST https://seu-projeto.supabase.co/functions/v1/mp-create-preference \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "test-123",
    "amount": 100
  }'
```

### 5. Configurar Webhook no Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Vá em "Notificações" → "Webhook"
4. Configure a URL:
   ```
   https://seu-projeto.supabase.co/functions/v1/mp-webhook
   ```
5. Marque os eventos: `payment` e `merchant_order`

---

## 📝 Checklist Pré-Deploy

- [ ] Tenho conta no Mercado Pago Developers
- [ ] Criei uma aplicação no MP
- [ ] Copiei o Access Token (TEST ou PROD)
- [ ] Tenho Supabase CLI instalado (`npm install -g supabase`)
- [ ] Fiz login no Supabase CLI (`supabase login`)
- [ ] Conheço o project-ref do meu projeto Supabase

---

## 🔍 Verificar Deploy

```bash
# Listar funções deployadas
supabase functions list

# Ver logs
supabase functions logs mp-create-preference

# Ver secrets configurados
supabase secrets list
```

---

## 🧪 Ambiente de Desenvolvimento

```bash
# 1. Configurar arquivo local
cp config/local.env.example config/local.env

# 2. Editar config/local.env com suas credenciais
# MP_ACCESS_TOKEN=TEST-...
# FRONTEND_URL=http://localhost:5173

# 3. Iniciar Supabase local (opcional)
supabase start

# 4. Servir função localmente
supabase functions serve mp-create-preference --env-file config/local.env

# 5. Em outro terminal, iniciar frontend
npm run dev
```

---

## 🚨 Troubleshooting

### Erro: "Relative import path not prefixed"
✅ **Solução:** Certifique-se de usar `index.ts` (não `.js`) e imports de CDN

### Erro: "Cannot find module 'https://deno.land/...'"
✅ **Normal no VS Code!** A função funciona no Supabase. Para remover o aviso, instale a extensão Deno.

### Erro: "MP_ACCESS_TOKEN not set"
```bash
supabase secrets set MP_ACCESS_TOKEN=seu-token-aqui
```

### Erro: "Failed to create preference"
1. Verifique o token no MP Dashboard
2. Veja os logs: `supabase functions logs mp-create-preference`
3. Teste a API do MP diretamente:
   ```bash
   curl -X POST https://api.mercadopago.com/checkout/preferences \
     -H "Authorization: Bearer $MP_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"items":[{"title":"Test","unit_price":100,"quantity":1}]}'
   ```

### Webhook não está atualizando
1. Verifique URL no MP: `https://SEU-PROJETO.supabase.co/functions/v1/mp-webhook`
2. Teste manualmente:
   ```bash
   curl -X POST https://seu-projeto.supabase.co/functions/v1/mp-webhook \
     -H "Content-Type: application/json" \
     -d '{"type":"payment","data":{"id":"123"}}'
   ```
3. Veja logs: `supabase functions logs mp-webhook`

---

## 📊 Monitoramento

```bash
# Logs em tempo real
supabase functions logs --follow

# Logs específicos
supabase functions logs mp-create-preference --limit 50

# Ver tabela de pagamentos
psql $DATABASE_URL -c "SELECT id, status, payment_method_id, transaction_amount FROM payments ORDER BY created_at DESC LIMIT 10;"
```

---

## 🔐 Transição Teste → Produção

```bash
# 1. Obter Access Token de PRODUÇÃO no MP

# 2. Atualizar secret
supabase secrets set MP_ACCESS_TOKEN=PROD-seu-token-de-producao

# 3. Atualizar URL do frontend
supabase secrets set FRONTEND_URL=https://seu-dominio.com.br

# 4. Atualizar webhook no MP com a URL de produção

# 5. Testar com transação real de baixo valor (R$ 0,50)
```

---

## 📞 Suporte

- **Documentação completa:** `docs/PAYMENT_SYSTEM_DEPLOYMENT.md`
- **Arquitetura:** `docs/PAYMENT_SYSTEM_ARCHITECTURE.md`
- **Resumo:** `docs/PAYMENT_SYSTEM_SUMMARY.md`
- **Edge Functions:** `functions/README.md`

---

**Última atualização:** Outubro 2025
