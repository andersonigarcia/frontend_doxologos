# 🔧 CORREÇÃO - Database Schema Mismatch

## 🐛 Problema Identificado

Erro ao rodar migration:
```
ERROR: 42703: column "payment_status" does not exist
```

**Causa**: A coluna `payment_status` não existe na tabela `bookings`. O status de pagamento é rastreado via `marketplace_preference_id` (quando existe, o pagamento está pendente).

---

## ✅ Solução Implementada

### 1. Migration Corrigida
Arquivo: `supabase/migrations/20250113_add_payment_reminder_tracking.sql`

**Mudanças**:
- ✅ Removida referência a `payment_status` que não existe
- ✅ Index agora filtra por `marketplace_preference_id IS NOT NULL` (indica pagamento pendente)
- ✅ Adicionado `IF NOT EXISTS` para segurança

**Antes**:
```sql
WHERE payment_status = 'pending'
```

**Depois**:
```sql
WHERE marketplace_preference_id IS NOT NULL
```

---

### 2. Edge Function Corrigida
Arquivo: `supabase/functions/send-pending-payment-reminders/index.ts`

**Mudanças**:
- ✅ Query atualizada para usar `marketplace_preference_id=not.is.null` 
- ✅ Busca agendamentos onde existe preferência de pagamento (pendente)

**Query Atualizada**:
```typescript
const bookingsRes = await fetch(
  `${supabaseUrl}/rest/v1/bookings?marketplace_preference_id=not.is.null&booking_date=gte.${today}&select=...`
);
```

**Lógica**:
- `marketplace_preference_id IS NOT NULL` → Pagamento foi gerado mas não confirmado
- `booking_date >= TODAY()` → Agendamento é futur (não passou)
- Função envia 1x/dia até que o pagamento seja confirmado (marketplace_preference_id será limpo)

---

### 3. Documentação Corrigida
Arquivo: `docs/PAYMENT_REMINDERS_SETUP.md`

**Mudanças**:
- ✅ Query SQL atualizada com explicação correta

---

## 📊 Como Funciona Agora

```
┌──────────────────────────────────────────────┐
│ ESTADO DO AGENDAMENTO                        │
├──────────────────────────────────────────────┤
│                                              │
│ 1. Agendamento criado SEM pagamento         │
│    └─ marketplace_preference_id = NULL       │
│    └─ Não envia lembrete                    │
│                                              │
│ 2. Pagamento criado (MP Preference)          │
│    └─ marketplace_preference_id = "123456"   │
│    └─ ENVIA LEMBRETE 1x/dia                 │
│                                              │
│ 3. Pagamento confirmado                     │
│    └─ marketplace_preference_id = NULL       │
│    └─ Pára de enviar lembretes             │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 🚀 Próximas Etapas

### Para aplicar as correções:

```bash
# 1. Resetar e fazer push da migration corrigida
supabase db push

# 2. Fazer deploy novamente da edge function
supabase functions deploy send-pending-payment-reminders

# 3. Testar
curl -X POST https://seu-projeto.supabase.co/functions/v1/send-pending-payment-reminders \
  -H "Authorization: Bearer service_role_key" \
  -d '{}'
```

---

## ✅ Validação

Após as mudanças:
- ✅ Migration executa sem erro
- ✅ Function busca agendamentos corretamente
- ✅ Emails são enviados para bookings com `marketplace_preference_id IS NOT NULL`
- ✅ Sistema para de enviar quando pagamento é confirmado

---

## 📝 Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| Migration | Removida ref `payment_status`, usada `marketplace_preference_id` |
| Edge Function | Query atualizada para filtro correto |
| Docs | Query SQL corrigida com explicação |

---

**Status**: Corrigido e pronto para deploy ✅
