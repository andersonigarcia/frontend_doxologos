# Guia de Implantação - Sistema de Pagamentos Mercado Pago

## 📋 Visão Geral

Este guia detalha o processo completo de implantação do sistema de pagamentos integrado com Mercado Pago, incluindo:
- PIX (com QR Code)
- Cartão de Crédito (até 12x)
- Cartão de Débito
- Boleto Bancário

## 🗂️ Arquivos Criados/Modificados

### Banco de Dados
- ✅ `database/migrations/create_payments_table.sql` - Tabela de pagamentos

### Backend (Edge Functions)
- ✅ `functions/mp-create-preference/index.js` - Criação de preferências MP (atualizado)
- ✅ `functions/mp-refund/index.js` - Processamento de reembolsos (novo)
- ⚠️ `functions/mp-webhook/index.js` - Webhook de notificações (verificar)

### Frontend - Serviços
- ✅ `src/lib/mercadoPagoService.js` - Service layer para API MP

### Frontend - Páginas
- ✅ `src/pages/CheckoutPage.jsx` - Página de checkout do usuário
- ✅ `src/pages/PaymentsPage.jsx` - Dashboard admin de pagamentos
- ✅ `src/pages/CheckoutSuccessPage.jsx` - Callback de sucesso
- ✅ `src/pages/CheckoutFailurePage.jsx` - Callback de falha
- ✅ `src/pages/CheckoutPendingPage.jsx` - Callback de pendente (PIX/Boleto)

### Frontend - Rotas
- ✅ `src/App.jsx` - Rotas adicionadas
- ✅ `src/pages/AdminPage.jsx` - Tab de pagamentos adicionada
- ✅ `src/pages/AgendamentoPage.jsx` - Redirecionamento para checkout

---

## 🚀 Passo a Passo de Implantação

### **1. Configurar Conta Mercado Pago**

1. Acesse [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
2. Faça login ou crie uma conta
3. Vá em **"Suas aplicações"** → **"Criar aplicação"**
4. Escolha o modelo: **"Pagamentos online"**
5. Copie as credenciais:
   - **Access Token de Teste** (para desenvolvimento)
   - **Access Token de Produção** (para produção)

> ⚠️ **Importante**: Nunca compartilhe ou comite suas credenciais no código!

---

### **2. Executar Migração do Banco de Dados**

1. Acesse o painel do Supabase: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor** → **New Query**
4. Copie e cole o conteúdo de `database/migrations/create_payments_table.sql`
5. Clique em **Run**

**Verificação:**
```sql
-- Verificar se a tabela foi criada
SELECT * FROM payments LIMIT 5;

-- Verificar índices
SELECT indexname FROM pg_indexes WHERE tablename = 'payments';
```

---

### **3. Configurar Variáveis de Ambiente no Supabase**

#### 3.1 Variáveis Locais (Desenvolvimento)

Edite `config/local.env`:
```bash
# Mercado Pago
MP_ACCESS_TOKEN=TEST-1234567890-abcdef-1234567890abcdef-123456789
FRONTEND_URL=http://localhost:5173

# Supabase (já existentes)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

#### 3.2 Secrets no Supabase (Produção)

Via CLI do Supabase:
```bash
# Instalar CLI (se ainda não tiver)
npm install -g supabase

# Login
supabase login

# Link com seu projeto
supabase link --project-ref seu-project-ref

# Configurar secrets
supabase secrets set MP_ACCESS_TOKEN=PROD-1234567890-abcdef-1234567890abcdef-123456789
supabase secrets set FRONTEND_URL=https://seu-dominio.com.br
```

Ou via Dashboard:
1. Vá em **Project Settings** → **Edge Functions**
2. Adicione os secrets:
   - `MP_ACCESS_TOKEN`
   - `FRONTEND_URL`

---

### **4. Deploy das Edge Functions**

#### 4.1 Verificar Estrutura

Certifique-se de que as pastas estão organizadas:
```
functions/
├── mp-create-preference/
│   └── index.ts  ← TypeScript (Deno)
├── mp-refund/
│   └── index.ts  ← TypeScript (Deno)
└── mp-webhook/
    └── index.js  ← Verificar e converter para .ts se necessário
```

> ⚠️ **Importante**: As Edge Functions do Supabase usam **Deno**, não Node.js.
> - Use imports de CDN (ex: `https://esm.sh/@supabase/supabase-js@2`)
> - Use `Deno.env.get()` em vez de `process.env`
> - Use `serve()` em vez de `export default`

#### 4.2 Deploy via CLI

```bash
# Deploy individual
supabase functions deploy mp-create-preference
supabase functions deploy mp-refund
supabase functions deploy mp-webhook

# Ou deploy de todas
supabase functions deploy
```

#### 4.3 Verificar Deploy

```bash
# Listar funções
supabase functions list

# Testar função
curl -X POST https://seu-projeto.supabase.co/functions/v1/mp-create-preference \
  -H "Authorization: Bearer sua-anon-key" \
  -H "Content-Type: application/json" \
  -d '{"booking_id": "test-id", "amount": 100}'
```

---

### **5. Configurar Webhook no Mercado Pago**

1. Acesse [Mercado Pago → Suas aplicações](https://www.mercadopago.com.br/developers/panel/app)
2. Selecione sua aplicação
3. Vá em **"Notificações" → "Webhook"**
4. Configure a URL:
   ```
   https://seu-projeto.supabase.co/functions/v1/mp-webhook
   ```
5. Eventos para ouvir:
   - ✅ `payment`
   - ✅ `merchant_order`

6. Salve e anote o **Webhook Secret** (se disponível)

#### 5.1 Testar Webhook Localmente

Para desenvolvimento local, use [ngrok](https://ngrok.com/):
```bash
# Instalar ngrok
npm install -g ngrok

# Expor porta local
ngrok http 54321

# Use a URL gerada no Mercado Pago
https://abc123.ngrok.io/functions/v1/mp-webhook
```

---

### **6. Testar Fluxo de Pagamento**

#### 6.1 Modo Sandbox (Teste)

1. Use o Access Token de **TESTE**
2. Acesse o checkout na aplicação
3. Use cartões de teste do MP:

**Cartões aprovados:**
```
Número: 5031 4332 1540 6351
Validade: 11/25
CVV: 123
Titular: APRO
```

**Cartões rejeitados:**
```
Número: 5031 4332 1540 6351
Validade: 11/25
CVV: 123
Titular: OTHE (Other reason)
```

**PIX de teste:**
- O QR Code será gerado
- No sandbox, o pagamento é simulado automaticamente

#### 6.2 Checklist de Testes

- [ ] Criar agendamento
- [ ] Redirecionar para checkout
- [ ] Selecionar método PIX
  - [ ] QR Code é exibido
  - [ ] Código PIX pode ser copiado
  - [ ] Status atualiza automaticamente
- [ ] Selecionar cartão de crédito
  - [ ] Redireciona para MP
  - [ ] Pagamento aprovado → /checkout/success
  - [ ] Pagamento rejeitado → /checkout/failure
- [ ] Verificar email de confirmação
- [ ] Admin consegue ver pagamento no dashboard
- [ ] Admin consegue processar reembolso

---

### **7. Verificar Integração com Bookings**

Confirme que os agendamentos estão sendo associados corretamente aos pagamentos:

```sql
-- Verificar agendamentos com pagamentos
SELECT 
  b.id as booking_id,
  b.booking_date,
  b.status,
  p.mp_payment_id,
  p.status as payment_status,
  p.transaction_amount,
  p.payment_method_id
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
ORDER BY b.created_at DESC
LIMIT 10;
```

---

### **8. Configurar Emails (Opcional mas Recomendado)**

Atualmente os emails são enviados via `bookingEmailManager`. Para pagamentos, adicione templates:

1. Criar template de pagamento aprovado
2. Criar template de pagamento rejeitado
3. Criar template de reembolso processado

**Exemplo de integração no webhook:**
```javascript
// Em functions/mp-webhook/index.js
if (payment.status === 'approved') {
  await bookingEmailManager.sendPaymentConfirmation(booking, payment);
}
```

---

### **9. Monitoramento e Logs**

#### 9.1 Logs do Supabase

```bash
# Ver logs das Edge Functions
supabase functions logs mp-create-preference
supabase functions logs mp-refund
supabase functions logs mp-webhook
```

#### 9.2 Monitorar Tabela de Pagamentos

```sql
-- Pagamentos pendentes há mais de 1 hora
SELECT 
  id,
  booking_id,
  mp_payment_id,
  status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_pending
FROM payments
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at;

-- Taxa de aprovação
SELECT 
  status,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM payments
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY status;
```

#### 9.3 Webhook Logs

Crie uma tabela de logs (opcional):
```sql
CREATE TABLE webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT,
  payload JSONB,
  status TEXT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### **10. Segurança e Boas Práticas**

#### 10.1 Checklist de Segurança

- [ ] Access Token armazenado em variáveis de ambiente
- [ ] Service Role Key apenas em Edge Functions
- [ ] Webhook valida origem (Mercado Pago)
- [ ] HTTPS obrigatório em produção
- [ ] Rate limiting nas APIs
- [ ] Logs de todas as transações

#### 10.2 Rate Limiting (Supabase)

Configure no painel:
1. **Project Settings** → **API**
2. Ajuste limites de requisições
3. Configure políticas RLS (Row Level Security)

#### 10.3 Políticas RLS para Tabela Payments

```sql
-- Apenas admins podem ver todos os pagamentos
CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    auth.jwt() ->> 'user_role' = 'admin' OR
    auth.jwt() ->> 'user_role' = 'professional'
  );

-- Pacientes veem apenas seus pagamentos
CREATE POLICY "Patients can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
        AND bookings.user_id = auth.uid()
    )
  );

-- Apenas Edge Functions podem inserir/atualizar
CREATE POLICY "Service role can manage payments"
  ON payments FOR ALL
  USING (auth.role() = 'service_role');
```

Ative as políticas:
```sql
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
```

---

### **11. Deploy Frontend**

#### 11.1 Build de Produção

```bash
# Instalar dependências
npm install

# Build
npm run build

# Preview (opcional)
npm run preview
```

#### 11.2 Variáveis de Ambiente (.env.production)

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-producao
VITE_FRONTEND_URL=https://seu-dominio.com.br
```

#### 11.3 Deploy (exemplo com Vercel)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Configurar variáveis
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

---

### **12. Transição Teste → Produção**

#### 12.1 Checklist Pré-Produção

- [ ] Todos os testes no sandbox passaram
- [ ] Webhook configurado corretamente
- [ ] Emails de notificação funcionando
- [ ] Dashboard admin acessível
- [ ] Políticas RLS configuradas
- [ ] Logs e monitoramento ativos

#### 12.2 Trocar para Credenciais de Produção

1. Gerar Access Token de Produção no Mercado Pago
2. Atualizar secret no Supabase:
   ```bash
   supabase secrets set MP_ACCESS_TOKEN=PROD-seu-token-aqui
   ```
3. Atualizar webhook URL (se mudou o domínio)
4. Testar com transação real de baixo valor (R$ 0,50)

#### 12.3 Modo Manutenção (Se necessário)

Adicione uma flag no Supabase:
```sql
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value BOOLEAN,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_config (key, value) VALUES ('payments_enabled', true);
```

No CheckoutPage, verifique antes de processar:
```javascript
const { data } = await supabase
  .from('system_config')
  .select('value')
  .eq('key', 'payments_enabled')
  .single();

if (!data?.value) {
  // Mostrar mensagem de manutenção
}
```

---

## 🔧 Troubleshooting

### Problema: QR Code do PIX não aparece
**Solução:**
1. Verifique se `qrcode.react` está instalado: `npm list qrcode.react`
2. Confirme que a preferência retorna `qr_code` na resposta
3. Veja logs: `supabase functions logs mp-create-preference`

### Problema: Erros de TypeScript nas Edge Functions no VS Code
**Solução:**
- ✅ **Isso é normal!** O VS Code não reconhece os tipos do Deno
- Erros como "Cannot find module 'https://deno.land/...'" são esperados
- As funções funcionarão corretamente quando deployadas no Supabase
- Para remover os avisos (opcional), instale a extensão Deno para VS Code

### Problema: "Relative import path not prefixed with / or ./"
**Solução:**
1. Certifique-se de usar `.ts` (não `.js`) para Edge Functions
2. Use imports de CDN: `https://esm.sh/@supabase/supabase-js@2`
3. Não use imports relativos ou do npm (ex: `from '@supabase/supabase-js'`)
4. Use `Deno.env.get()` em vez de `process.env`

### Problema: Webhook não está atualizando o status
**Solução:**
1. Verifique URL do webhook no MP
2. Teste manualmente:
   ```bash
   curl -X POST https://seu-projeto.supabase.co/functions/v1/mp-webhook \
     -H "Content-Type: application/json" \
     -d '{"type": "payment", "data": {"id": "123"}}'
   ```
3. Veja logs: `supabase functions logs mp-webhook`

### Problema: Pagamentos não aparecem no dashboard
**Solução:**
1. Verifique políticas RLS: `SELECT * FROM payments;` (como admin)
2. Confirme que o usuário tem role `admin` ou `professional`
3. Limpe cache do navegador

### Problema: Erro "cors blocked"
**Solução:**
1. Configure CORS nas Edge Functions:
   ```javascript
   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
   };
   ```
2. Retorne headers CORS em todas as respostas

---

## 📊 Monitoramento Contínuo

### Métricas Importantes

1. **Taxa de conversão**: Agendamentos → Pagamentos aprovados
2. **Taxa de aprovação**: Pagamentos tentados → Aprovados
3. **Tempo médio de pagamento**: PIX vs Cartão
4. **Taxa de reembolso**: Reembolsos / Total de pagamentos
5. **Métodos mais usados**: PIX, Crédito, Débito, Boleto

### Query de Dashboard de Métricas

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_payments,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  SUM(transaction_amount) FILTER (WHERE status = 'approved') as revenue,
  AVG(transaction_amount) FILTER (WHERE status = 'approved') as avg_ticket
FROM payments
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 📞 Suporte

### Documentação Oficial
- [Mercado Pago API](https://www.mercadopago.com.br/developers/pt/reference)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

### Links Úteis
- [Status do Mercado Pago](https://status.mercadopago.com/)
- [Cartões de Teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards)
- [Webhook Simulator](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-integration)

### Contato Doxologos
- **Email**: suporte@doxologos.com.br
- **WhatsApp**: (11) 99999-9999

---

## ✅ Checklist Final

Antes de considerar a implantação completa:

### Banco de Dados
- [ ] Tabela `payments` criada
- [ ] Índices configurados
- [ ] Políticas RLS ativas
- [ ] Trigger de updated_at funcionando

### Edge Functions
- [ ] `mp-create-preference` deployed
- [ ] `mp-refund` deployed
- [ ] `mp-webhook` deployed e configurado no MP
- [ ] Secrets configurados (MP_ACCESS_TOKEN, FRONTEND_URL)

### Frontend
- [ ] Todas as páginas acessíveis
- [ ] Rotas funcionando
- [ ] Tab de pagamentos no admin visível
- [ ] QR Code do PIX renderizando
- [ ] Callbacks redirecionando corretamente

### Testes
- [ ] Pagamento PIX (sandbox)
- [ ] Pagamento cartão crédito (sandbox)
- [ ] Pagamento rejeitado
- [ ] Reembolso processado
- [ ] Webhook atualizando status
- [ ] Emails sendo enviados

### Produção
- [ ] Access Token de PRODUÇÃO configurado
- [ ] Domínio configurado (FRONTEND_URL)
- [ ] SSL/HTTPS ativo
- [ ] Monitoramento configurado
- [ ] Backup do banco configurado

---

🎉 **Parabéns!** Sistema de pagamentos totalmente funcional e pronto para produção.
