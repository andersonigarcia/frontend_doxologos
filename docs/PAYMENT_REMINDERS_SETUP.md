# Configuração da Edge Function - send-pending-payment-reminders

## 📋 Sumário

Esta edge function envia lembretes de pagamento pendente **1 vez por dia** para agendamentos com status de pagamento `pending`. 

**Fluxo:**
1. Consulta agendamentos com `payment_status = 'pending'` e `booking_date >= hoje`
2. Verifica se já foi notificado hoje (coluna `last_payment_reminder_sent_at`)
3. Envia email com CTA direto para `/paciente`
4. Atualiza timestamp `last_payment_reminder_sent_at`

---

## 🚀 Deploy da Edge Function

### Pré-requisitos
```bash
# Ter o Supabase CLI instalado
npm install -g supabase

# Fazer login
supabase login
```

### Deploy
```bash
# Na raiz do projeto
supabase functions deploy send-pending-payment-reminders

# Verificar se foi deployada
supabase functions list
```

---

## ⏰ Configurar Agendamento (Cron Job)

### Via Supabase Dashboard

1. **Acessar**: [Supabase Dashboard](https://app.supabase.com) → Seu Projeto → Edge Functions → send-pending-payment-reminders

2. **Buscar a aba "Cron"** ou **"Scheduled Functions"**

3. **Criar novo cron job**:
   - **Function**: `send-pending-payment-reminders`
   - **Schedule**: `0 9 * * *` (9 AM diariamente - UTC)
   - **Timezone**: UTC (ou seu fuso horário preferido)
   - **Descrição**: "Daily payment reminders for pending bookings"

### Exemplos de Cron Expressions

| Schedule | Expressão | Descrição |
|----------|-----------|-----------|
| 9 AM diariamente (UTC) | `0 9 * * *` | 9 AM em todos os dias |
| 9 AM weekdays (seg-sex) | `0 9 * * 1-5` | Apenas segunda a sexta |
| 9 AM e 3 PM diariamente | `0 9,15 * * *` | Duas vezes por dia |
| Toda segunda 9 AM | `0 9 * * 1` | Apenas segunda-feira |

---

## 🔧 Variáveis de Ambiente Necessárias

Adicionar ao seu projeto Supabase (Edge Function Settings):

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key

# SendGrid
SENDGRID_API_KEY=sua_chave_sendgrid
SENDGRID_FROM_EMAIL=doxologos@doxologos.com.br

# Frontend
FRONTEND_URL=https://appsite.doxologos.com.br
```

---

## 📊 Lógica da Function

### Query do Banco

```sql
-- Busca agendamentos com pagamento pendente a partir de hoje
-- zoom_link IS NULL indica que a reunião Zoom ainda não foi criada
-- Isso só acontece após pagamento confirmado, então esse critério
-- indica pagamento ainda não processado/confirmado
SELECT * FROM bookings
WHERE zoom_link IS NULL
  AND booking_date >= TODAY()
ORDER BY booking_date ASC
```

**Lógica**:
- Quando pagamento é feito: `zoom_link` recebe o link da reunião
- Quando `zoom_link` é NULL: pagamento ainda não foi confirmado
- A function envia 1x/dia enquanto `zoom_link` for NULL

### Verificação de Envio Hoje

```javascript
// Se last_payment_reminder_sent_at existe e é de hoje
if (lastSent.getTime() === todayStartOfDay.getTime()) {
  // Pula este agendamento
  remindersSkipped++;
  continue;
}
```

### Email Template

O email include:
- ✅ Cabeçalho destacando pagamento pendente
- 📅 Data, hora, profissional e valor
- 💳 **CTA Button** → `/paciente` para finalizar pagamento
- ℹ️ Info box explicando próximos passos
- 🔐 Security reminder

---

## 🧪 Testar Localmente

### Teste manual via curl

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/send-pending-payment-reminders \
  -H "Authorization: Bearer seu_service_role_key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Esperado

```json
{
  "success": true,
  "reminders_sent": 2,
  "reminders_skipped": 1,
  "errors": [],
  "timestamp": "2025-01-13T14:30:45.123Z"
}
```

---

## 📋 Checklist de Implementação

- [ ] **Database**: Executar migration SQL para adicionar coluna `last_payment_reminder_sent_at`
  ```bash
  supabase db push
  ```

- [ ] **Edge Function**: Deploy da function
  ```bash
  supabase functions deploy send-pending-payment-reminders
  ```

- [ ] **Variáveis de Ambiente**: Configurar no Supabase Dashboard
  
- [ ] **Cron Job**: Agendar execução diária (Supabase Dashboard → Edge Functions → Cron)

- [ ] **Teste Manual**: Executar a function manualmente para verificar
  - Criar um agendamento com `payment_status = 'pending'`
  - Chamar a function via curl ou dashboard
  - Verificar se email foi enviado

- [ ] **Monitoramento**: Acessar logs da function no Supabase Dashboard
  - Edge Functions → send-pending-payment-reminders → Logs

---

## 🔍 Monitoramento

### Via Supabase Dashboard

1. Edge Functions → send-pending-payment-reminders → "Logs"
2. Filtrar por data/hora
3. Procurar por erros ou warnings

### Métricas Esperadas

Após execução bem-sucedida:
- `reminders_sent`: número de emails enviados
- `reminders_skipped`: agendamentos já notificados hoje
- `errors`: lista de problemas encontrados

---

## 🐛 Troubleshooting

### Problema: "Supabase credentials missing"
**Solução**: Verificar se `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão configurados no Supabase Dashboard

### Problema: "SendGrid API key missing"
**Solução**: Verificar se `SENDGRID_API_KEY` está configurado

### Problema: Email não está sendo enviado
**Solução**: 
1. Verificar logs da function
2. Confirmar se há bookings com `payment_status = 'pending'`
3. Verificar se `booking_date >= TODAY()`

### Problema: Emails duplicados
**Solução**:
- A function valida `last_payment_reminder_sent_at` para evitar duplicatas
- Se recebendo duplicatas, verificar se há múltiplas triggers de cron

---

## 🔐 Segurança

- ✅ Usa `SUPABASE_SERVICE_ROLE_KEY` (seguro no edge)
- ✅ Emails enviados via SendGrid (seguro)
- ✅ Sem exposição de dados sensíveis nos logs
- ✅ Valida credenciais antes de processar

---

## 📞 Suporte

Para dúvidas:
1. Verificar logs da function: Supabase Dashboard → Edge Functions
2. Consultar Supabase docs: https://supabase.com/docs/guides/functions
3. Testar endpoint diretamente com curl
