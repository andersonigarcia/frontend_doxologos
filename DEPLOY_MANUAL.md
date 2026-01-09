# Deploy Manual das Funções - Guia Rápido

## Pré-requisitos
O comando `npx supabase functions list` retornou erro 401, indicando que você precisa fazer login no Supabase CLI.

## Passo a Passo

### 1. Login no Supabase
```powershell
npx supabase login
```
- Isso abrirá o navegador para autenticação
- Faça login com sua conta Supabase

### 2. Link com o Projeto (se necessário)
```powershell
npx supabase link --project-ref ppwjtvzrhvjinsutrjwk
```
- Use a referência do seu projeto
- Confirme quando solicitado

### 3. Deploy do Webhook (PRINCIPAL)
```powershell
npx supabase functions deploy mp-webhook
```
- Esta é a função mais importante
- Aguarde confirmação de sucesso

### 4. Deploy da Criação de Pagamento
```powershell
npx supabase functions deploy mp-create-payment
```
- Função secundária, também atualizada
- Aguarde confirmação de sucesso

### 5. Verificar Deploy
```powershell
npx supabase functions list
```
- Deve listar as funções deployadas
- Verificar versão atualizada

## Alternativa: Deploy via Dashboard

Se preferir, pode fazer deploy manual via Supabase Dashboard:

1. Acesse: https://supabase.com/dashboard/project/ppwjtvzrhvjinsutrjwk
2. Vá em **Edge Functions**
3. Encontre `mp-webhook`
4. Clique em **Deploy new version**
5. Cole o conteúdo do arquivo `supabase/functions/mp-webhook/index.ts`
6. Clique em **Deploy**
7. Repita para `mp-create-payment`

## Após o Deploy

Execute o health check para verificar:
```sql
-- No Supabase SQL Editor
-- Arquivo: database/scripts/webhook_health_check.sql
```

## Status Atual

✅ **Migrations executadas com sucesso**
- Campos adicionados em `bookings` e `payments`
- 6 bookings sincronizados automaticamente
- 0 inconsistências encontradas

✅ **Código atualizado**
- Webhook sincroniza `payment_status` e `marketplace_payment_id`
- Logs detalhados adicionados

⏳ **Aguardando deploy**
- Fazer login no Supabase CLI
- Deploy das funções atualizadas
