# 🚀 Deploy do Webhook Corrigido

## Correções Implementadas

### 1. ✅ Campo `mercadopago_payment_id` Corrigido
**Problema**: Webhook usava `mercadopago_payment_id` mas tabela tem `mp_payment_id`  
**Correção**: Atualizado em 2 locações (linhas 168 e 208)

### 2. ✅ Validação de UUID Melhorada
**Problema**: Lógica frágil (`length > 30`)  
**Correção**: Regex para validar formato UUID correto

### 3. ✅ Logs Detalhados Adicionados
**Problema**: Difícil diagnosticar falhas  
**Correção**: Console.log em cada etapa crítica

### 4. ✅ Verificação de Existência do Booking
**Problema**: Tentava atualizar booking sem verificar se existe  
**Correção**: Busca booking antes de atualizar, retorna 404 se não encontrar

---

## 📋 Passo a Passo para Deploy

### Opção A: Via Supabase CLI (Recomendado)

```bash
# 1. Navegar até a pasta do projeto
cd c:\Users\ander\source\repos\frontend_doxologos

# 2. Login no Supabase (se necessário)
npx supabase login

# 3. Link com o projeto (se necessário)
npx supabase link --project-ref ppwjtvzrhvjinsutrjwk

# 4. Deploy da função
npx supabase functions deploy mp-webhook

# 5. Verificar deploy
npx supabase functions list
```

### Opção B: Via Supabase Dashboard

1. Acesse: https://supabase.com/dashboard/project/ppwjtvzrhvjinsutrjwk
2. Vá em **Edge Functions**
3. Encontre `mp-webhook`
4. Clique em **Deploy new version**
5. Cole o conteúdo do arquivo `supabase/functions/mp-webhook/index.ts`
6. Clique em **Deploy**

---

## 🧪 Teste do Webhook

### 1. Teste Manual via cURL

```bash
# Teste básico
curl -X POST https://ppwjtvzrhvjinsutrjwk.supabase.co/functions/v1/mp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": {
      "id": "123456789"
    }
  }'
```

### 2. Teste com Pagamento Real

**Melhor opção**: Fazer um novo agendamento de teste

1. Acessar: https://novo.doxologos.com.br
2. Fazer um agendamento
3. Pagar via PIX (valor mínimo R$ 0,01) ou Cartão (mínimo R$ 0,50)
4. Verificar se status muda para "confirmed"

### 3. Monitorar Logs

**Via Dashboard**:
1. Supabase Dashboard → Edge Functions → mp-webhook
2. Clicar em **Logs**
3. Ver logs em tempo real

**Via SQL**:
```sql
-- Ver últimos webhooks
SELECT * FROM webhook_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔍 Diagnóstico (Executar ANTES do Deploy)

### 1. Verificar Agendamentos Problemáticos

Execute no **Supabase Dashboard → SQL Editor**:

```sql
-- Ver bookings pendentes com pagamento aprovado
SELECT 
  b.id,
  b.patient_name,
  b.status as booking_status,
  p.status as payment_status,
  p.mercadopago_payment_id
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized')
  AND b.status = 'pending'
ORDER BY p.created_at DESC;
```

**Resultado Esperado**: Deve mostrar os 2 agendamentos problemáticos (MARIA PAULA e FABRICIO)

### 2. Verificar Logs de Webhook

```sql
-- Ver se webhook foi chamado
SELECT 
  status,
  error_message,
  payload->'data'->>'id' as payment_id,
  created_at
FROM webhook_logs
WHERE provider = 'mercadopago'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🔧 Correção Manual (Se Necessário)

Se os agendamentos problemáticos precisarem ser corrigidos **antes** do deploy:

```sql
-- Atualizar bookings com pagamento aprovado
UPDATE bookings b
SET 
  status = 'confirmed',
  payment_status = 'approved',
  updated_at = NOW()
FROM payments p
WHERE p.booking_id = b.id
  AND p.status IN ('approved', 'authorized')
  AND b.status = 'pending'
  AND b.patient_name IN ('MARIA PAULA PRANDT GODOI', 'FABRICIO TALARICO');

-- Verificar correção
SELECT id, patient_name, status, payment_status 
FROM bookings 
WHERE patient_name IN ('MARIA PAULA PRANDT GODOI', 'FABRICIO TALARICO');
```

---

## ✅ Checklist Pós-Deploy

- [ ] Webhook deployado com sucesso
- [ ] Teste manual via cURL funcionou
- [ ] Logs aparecem no dashboard
- [ ] Fazer pagamento de teste e verificar:
  - [ ] Webhook é chamado
  - [ ] Status do booking muda para "confirmed"
  - [ ] Log de webhook tem status "success"
  - [ ] Tabela `payments` atualizada
- [ ] Corrigir agendamentos problemáticos (se necessário)
- [ ] Monitorar próximos pagamentos por 24h

---

## 🚨 Troubleshooting

### Erro: "Function not found"
- Verificar se função foi deployada: `npx supabase functions list`
- Re-deploy: `npx supabase functions deploy mp-webhook`

### Erro: "Booking not found"
- Verificar se `external_reference` está correto
- Ver logs: `SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 5`

### Webhook não é chamado
- Verificar URL no Mercado Pago Dashboard
- URL correta: `https://ppwjtvzrhvjinsutrjwk.supabase.co/functions/v1/mp-webhook`
- Verificar se eventos "payment" estão marcados

---

## 📊 Monitoramento Contínuo

### Query para Dashboard

```sql
-- Taxa de sucesso de webhooks (últimos 7 dias)
SELECT 
  status,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM webhook_logs
WHERE provider = 'mercadopago'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY status;
```

**Meta**: > 95% de sucesso

---

**Próximo Passo**: Executar diagnóstico SQL e depois fazer deploy
