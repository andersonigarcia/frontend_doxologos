# 🚀 Quick Deploy Guide - Email Notification Flow

**Tempo estimado**: 10 minutos

---

## 1️⃣ Executar Migration SQL (1 min)

```bash
# No terminal, no diretório do projeto
supabase db push
```

Verifica se:
- ✅ Nova coluna `last_payment_reminder_sent_at` foi criada em `bookings`
- ✅ Index de performance foi criado

---

## 2️⃣ Deploy da Edge Function (2 min)

```bash
# Deploy a new edge function
supabase functions deploy send-pending-payment-reminders

# Verificar se foi deployada
supabase functions list
```

Output esperado:
```
✅ send-pending-payment-reminders
```

---

## 3️⃣ Configurar Variáveis de Ambiente (2 min)

No **Supabase Dashboard**:

1. Projeto → Edge Functions → send-pending-payment-reminders
2. Aba "Settings" ou "Environment Variables"
3. Adicionar:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key_aqui
SENDGRID_API_KEY=sua_chave_sendgrid_aqui
SENDGRID_FROM_EMAIL=doxologos@doxologos.com.br
FRONTEND_URL=https://appsite.doxologos.com.br
```

Onde encontrar:
- `SUPABASE_URL`: Supabase Dashboard → Project Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Project Settings → API → Service Role
- `SENDGRID_API_KEY`: SendGrid Dashboard → Settings → API Keys
- `SENDGRID_FROM_EMAIL`: Seu email configurado no SendGrid

---

## 4️⃣ Configurar Cron Job (3 min)

No **Supabase Dashboard**:

1. Projeto → Edge Functions → send-pending-payment-reminders
2. Aba "Cron" ou "Scheduled Functions"
3. Criar novo job:
   - **Function**: `send-pending-payment-reminders`
   - **Schedule**: `0 9 * * *` ← 9 AM, todo dia, UTC
   - **Timezone**: UTC (ou seu fuso)
   - **Description**: "Daily payment reminders for pending bookings"
   - **Enabled**: ✅ Sim

---

## 5️⃣ Testar Localmente (2 min)

### Teste manual via curl

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/send-pending-payment-reminders \
  -H "Authorization: Bearer seu_service_role_key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Output esperado

```json
{
  "success": true,
  "reminders_sent": 2,
  "reminders_skipped": 0,
  "errors": [],
  "timestamp": "2025-01-13T14:30:45.123Z"
}
```

Se houver agendamentos com `payment_status = 'pending'`, deve enviar emails.

---

## ✅ Checklist Final

- [ ] Migration executada (`supabase db push`)
- [ ] Function deployada (`supabase functions deploy`)
- [ ] Variáveis de ambiente configuradas
- [ ] Cron job agendado (Schedule: `0 9 * * *`)
- [ ] Teste manual executado com sucesso
- [ ] Logs verificados no Supabase Dashboard

---

## 🔍 Verificar Após Deploy

### Via Supabase Dashboard

1. **Logs da Function**:
   - Edge Functions → send-pending-payment-reminders → Logs
   - Filtrar por data/hora
   - Procurar por ✅ `Lembrete enviado para...` ou ❌ erros

2. **Última Execução do Cron**:
   - Edge Functions → send-pending-payment-reminders → Cron
   - Ver "Last Run" e status

3. **Database**:
   - SQL Editor → Query: `SELECT * FROM bookings LIMIT 5;`
   - Verificar coluna `last_payment_reminder_sent_at`

---

## 🐛 Se algo não funcionou

### Problema: Function não aparece em `supabase functions list`
**Solução**: 
```bash
# Fazer login novamente
supabase logout
supabase login

# Tentar deploy novamente
supabase functions deploy send-pending-payment-reminders
```

### Problema: "Missing environment variables"
**Solução**: Verificar Supabase Dashboard → Edge Function → Settings → Environment Variables

### Problema: Nenhum email sendo enviado
**Solução**:
1. Criar agendamento com `payment_status = 'pending'`
2. Executar curl de teste
3. Verificar logs para erros
4. Confirmar `SENDGRID_API_KEY` está correto

### Problema: Cron job não executa automaticamente
**Solução**:
1. Verificar se function está "Enabled" no cron config
2. Verificar cron expression: `0 9 * * *`
3. Consultar logs em "Last Run"

---

## 📧 Emails Enviados Após Deploy

Quando tudo estiver configurado, o sistema enviará:

### Confirmação de Agendamento
```
De: doxologos@doxologos.com.br
Assunto: ✅ Seu Agendamento Foi Confirmado
CTA: 💳 Finalizar Pagamento → /paciente
```

### Notificação Diária (Pagamento Pendente)
```
De: doxologos@doxologos.com.br
Assunto: 💳 Lembrete: Finalize o Pagamento
CTA: 💳 Finalizar Pagamento → /paciente
Frequência: 1x por dia até data da consulta
```

### Pagamento Confirmado
```
De: doxologos@doxologos.com.br
Assunto: ✅ Pagamento Confirmado - Consulta Garantida!
CTA: 🔐 Acessar Minha Área - Link da Reunião → /paciente
```

---

## 💡 Dicas Úteis

1. **Testar com data futura**: Criar agendamento para data próxima (ex: amanhã)
2. **Forçar execução**: Use curl para testar sem aguardar cron
3. **Logs em tempo real**: Supabase Dashboard → Functions → Logs (auto-atualiza)
4. **Horário do cron**: `0 9 * * *` = 9 AM UTC. Se seu fuso é diferente, ajustar expressão

---

## 📚 Referência Rápida

| Comando | Propósito |
|---------|-----------|
| `supabase db push` | Aplicar migrations |
| `supabase functions deploy send-pending-payment-reminders` | Deploy da function |
| `supabase functions list` | Listar todas as functions |
| `supabase functions delete send-pending-payment-reminders` | Deletar function |

---

## ❓ Documentação Completa

Para detalhes completos, ver: `docs/PAYMENT_REMINDERS_SETUP.md`

Lá você encontra:
- ✅ Explicação completa da função
- ✅ Exemplos de cron expressions
- ✅ Guia de troubleshooting detalhado
- ✅ Como testar end-to-end
