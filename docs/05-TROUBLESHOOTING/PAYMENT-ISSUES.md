# 💳 Problemas com Pagamentos

> **Guia específico para troubleshooting de pagamentos**

---

## 🟢 PIX

### QR Code não aparece

**Causa:** Edge Function não retornou `qr_code_base64`

**Solução:**
```javascript
// Verificar resposta
console.log('Payment response:', result);
console.log('QR Code Base64:', result.qr_code_base64);

// Edge Function deve retornar:
{
  qr_code: "00020126...",
  qr_code_base64: "iVBORw0KGgo..."
}
```

### Pagamento não detectado

**Causa:** Polling não está rodando ou webhook não configurado

**Solução:**
1. Verificar polling no console:
```javascript
console.log('[Polling] Checking payment status:', paymentId);
```

2. Verificar webhook configurado no MP:
   - URL: `https://ppwjtvzrhvjinsutrjwk.supabase.co/functions/v1/mp-webhook`
   - Eventos: `payment.created`, `payment.updated`

3. Testar webhook manualmente:
```bash
curl -X POST https://ppwjtvzrhvjinsutrjwk.supabase.co/functions/v1/mp-webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"123456"}}'
```

---

## 💳 Cartão Direto

### Erro: "SSL certificate is required"

**Causa:** MP SDK exige HTTPS para tokenização

**Solução:**
- ✅ Deploy em produção (HTTPS automático)
- ✅ Ou usar mkcert para SSL local:

```powershell
# Instalar mkcert
choco install mkcert

# Gerar certificados
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Configurar Vite
# vite.config.js
import fs from 'fs';

export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem')
    }
  }
});
```

### Erro: "invalid_amount"

**Causa:** Mercado Pago exige mínimo R$ 0.50 para cartão

**Solução:** Edge Function já ajusta automaticamente:
```typescript
if (transactionAmount < 0.50) {
  console.warn('Ajustando para R$ 0,50');
  transactionAmount = 0.50;
}
```

### Cartão recusado

**Possíveis causas:**
1. Cartão sem limite
2. Dados incorretos
3. Cartão bloqueado
4. CPF inválido

**Solução:**
```javascript
// Usar cartões de teste do MP
const testCards = {
  mastercard: '5031 4332 1540 6351', // Aprovado
  visa: '4509 9535 6623 3704',       // Aprovado
  rejected: '5031 7557 3453 0604'    // Recusado
};
```

### Token inválido

**Causa:** Erro na tokenização

**Solução:**
```javascript
// Verificar dados antes de tokenizar
const token = await mp.createCardToken({
  cardNumber: cardNumber.replace(/\s/g, ''), // Remover espaços
  cardholderName: cardholderName.toUpperCase(),
  cardExpirationMonth: month.padStart(2, '0'),
  cardExpirationYear: `20${year}`,
  securityCode: securityCode,
  identificationType: 'CPF',
  identificationNumber: cpf.replace(/\D/g, '') // Só números
});

console.log('Token gerado:', token.id);
```

---

## 🔄 Redirect (Débito/Boleto)

### Erro: "payment_methods.excluded_payment_types is not an array"

**Causa:** Bug do Deno que serializa arrays como strings

**Solução:** Remover campo `payment_methods` da preference:
```typescript
// ❌ Não funciona no Deno
const preference = {
  payment_methods: {
    excluded_payment_types: [{ id: 'ticket' }] // Vira string
  }
};

// ✅ Remover campo
const preference = {
  // Sem payment_methods
};
```

### Redirect mostra "Saldo em conta"

**Causa:** Usuário logado no MP

**Solução:** Usar pagamento com cartão direto (sem redirect)

---

## 🔔 Webhook

### Webhook não chama

**Verificar:**
1. URL configurada no MP Dashboard
2. HTTPS válido (não localhost)
3. Logs da Edge Function:

```bash
supabase functions logs mp-webhook --limit 50
```

4. Testar manualmente:
```bash
curl -X POST \
  https://ppwjtvzrhvjinsutrjwk.supabase.co/functions/v1/mp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "data": { "id": "PAYMENT_ID_TESTE" }
  }'
```

### Webhook recebe mas não atualiza

**Causa:** Erro no processamento

**Solução:**
```typescript
// Adicionar logs detalhados
console.log('[Webhook] Payment ID:', paymentId);
console.log('[Webhook] Payment status:', payment.status);
console.log('[Webhook] Updating booking:', bookingId);

// Verificar se atualização funcionou
const { error } = await supabase
  .from('bookings')
  .update({ status: 'confirmed' })
  .eq('id', bookingId);

if (error) {
  console.error('[Webhook] Error updating booking:', error);
}
```

---

## 📊 Monitoramento

### Query para pagamentos com erro

```sql
SELECT 
  p.id,
  p.mercadopago_payment_id,
  p.amount,
  p.status,
  p.payment_method,
  p.created_at,
  l.message as error_message,
  l.data as error_data
FROM payments p
LEFT JOIN logs l ON l.data->>'payment_id' = p.mercadopago_payment_id
WHERE p.status = 'rejected'
  OR l.level = 'ERROR'
ORDER BY p.created_at DESC
LIMIT 20;
```

### Estatísticas de pagamentos

```sql
SELECT 
  payment_method,
  status,
  COUNT(*) as total,
  SUM(amount) as valor_total,
  ROUND(AVG(amount), 2) as valor_medio
FROM payments
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY payment_method, status
ORDER BY total DESC;
```

---

**Última atualização**: 28/01/2025 | [Voltar ao Índice](../README.md)
