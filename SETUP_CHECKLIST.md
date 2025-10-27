# ✅ Checklist de Configuração - Sistema de Pagamentos

## Status Atual
- ✅ Edge Function `mp-create-preference` deployada
- ✅ Edge Function `mp-refund` deployada
- ✅ Secrets `MP_ACCESS_TOKEN` configurada
- ✅ Secret `FRONTEND_URL` configurada

---

## 🚀 Comandos para Completar a Configuração

### 1. Deploy da função mp-webhook

```powershell
supabase functions deploy mp-webhook
```

### 2. Executar Migration SQL

**Opção A - Via Dashboard (Recomendado):**
1. Acesse https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Copie o conteúdo de `database/migrations/create_payments_table.sql`
5. Cole e clique em **Run**

**Opção B - Via CLI:**
```powershell
# Obtenha a database URL do dashboard
$DATABASE_URL = "postgresql://postgres:[password]@[host]:5432/postgres"

# Execute a migration
Get-Content database\migrations\create_payments_table.sql | psql $DATABASE_URL
```

### 3. Configurar Webhook no Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Vá em **Notificações** → **Webhook**
4. Configure a URL (substitua `SEU-PROJETO` pelo seu project ref):
   ```
   https://SEU-PROJETO.supabase.co/functions/v1/mp-webhook
   ```
5. Selecione eventos:
   - ✅ **payment**
   - ✅ **merchant_order** (opcional)
6. Clique em **Salvar**

---

## 🧪 Testar o Sistema

### 1. Testar criação de preferência

```powershell
# Obtenha sua ANON_KEY do Supabase Dashboard → Settings → API
$ANON_KEY = "sua-anon-key-aqui"
$PROJECT_REF = "seu-project-ref"

# Criar booking de teste primeiro (ou use um ID existente)
$BOOKING_ID = "uuid-de-um-booking-real"

# Testar criação de preferência
curl -X POST "https://$PROJECT_REF.supabase.co/functions/v1/mp-create-preference" `
  -H "Authorization: Bearer $ANON_KEY" `
  -H "Content-Type: application/json" `
  -d "{\"booking_id\": \"$BOOKING_ID\", \"amount\": 100}"
```

### 2. Verificar tabela payments

No **SQL Editor** do Supabase:
```sql
SELECT * FROM payments ORDER BY created_at DESC LIMIT 5;
```

### 3. Testar fluxo completo

1. Acesse sua aplicação: http://localhost:5173
2. Faça um agendamento
3. Você será redirecionado para `/checkout`
4. Selecione método de pagamento (PIX recomendado para teste)
5. Use credenciais de teste do Mercado Pago

**Cartões de Teste:**
```
APROVADO:
Número: 5031 4332 1540 6351
Validade: 11/25
CVV: 123
Nome: APRO

REJEITADO:
Número: 5031 4332 1540 6351
Validade: 11/25  
CVV: 123
Nome: OTHE
```

---

## 📊 Monitorar Logs

```powershell
# Ver logs de todas as funções
supabase functions logs

# Ver logs específicos
supabase functions logs mp-create-preference
supabase functions logs mp-refund
supabase functions logs mp-webhook

# Logs em tempo real
supabase functions logs --follow
```

---

## ✅ Checklist Final

Antes de usar em produção:

### Backend
- [ ] Migration SQL executada (tabela `payments` criada)
- [ ] 3 Edge Functions deployadas
- [ ] Secrets configurados no Supabase
- [ ] Webhook configurado no Mercado Pago
- [ ] Testado com cartões de teste

### Frontend
- [ ] Aplicação rodando: `npm run dev`
- [ ] Página de checkout acessível
- [ ] QR Code do PIX aparecendo
- [ ] Redirecionamentos funcionando

### Testes
- [ ] Pagamento PIX (sandbox)
- [ ] Pagamento cartão crédito (sandbox)
- [ ] Pagamento rejeitado
- [ ] Callback success funciona
- [ ] Callback failure funciona
- [ ] Dashboard admin mostra pagamentos

---

## 🔐 Transição para Produção

Quando estiver pronto para produção:

1. **Obter Access Token de PRODUÇÃO no Mercado Pago**
2. **Atualizar secret:**
   ```powershell
   supabase secrets set MP_ACCESS_TOKEN=PROD-seu-token-producao
   ```
3. **Atualizar URL do frontend:**
   ```powershell
   supabase secrets set FRONTEND_URL=https://seu-dominio.com.br
   ```
4. **Atualizar webhook no MP** para a URL de produção
5. **Testar com valor pequeno** (R$ 0,50) antes de liberar

---

## 🆘 Problemas Comuns

### Erro: "payments table does not exist"
➡️ Execute a migration SQL no SQL Editor

### Erro: "MP_ACCESS_TOKEN not set"
➡️ Configure: `supabase secrets set MP_ACCESS_TOKEN=seu-token`

### Webhook não atualiza status
➡️ Verifique:
1. URL está correta no Mercado Pago?
2. Eventos `payment` estão marcados?
3. Veja logs: `supabase functions logs mp-webhook`

### QR Code não aparece
➡️ Verifique:
1. `qrcode.react` está instalado? `npm list qrcode.react`
2. Preferência retorna `qr_code`? Veja logs da função

---

## 📚 Documentação Completa

- **Guia Completo:** `docs/PAYMENT_SYSTEM_DEPLOYMENT.md`
- **Arquitetura:** `docs/PAYMENT_SYSTEM_ARCHITECTURE.md`
- **Resumo:** `docs/PAYMENT_SYSTEM_SUMMARY.md`
- **Edge Functions:** `functions/README.md`

---

**Última atualização:** Outubro 2025
