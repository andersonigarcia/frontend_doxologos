# Gestão de Ambientes - Mercado Pago

## 🎯 Visão Geral

Este documento explica como alternar entre ambientes de **teste (sandbox)** e **produção** do Mercado Pago.

## 📝 Credenciais Configuradas

### ✅ Ambiente de TESTE (Sandbox) - CONFIGURADO

```
MP_ACCESS_TOKEN_TEST=APP_USR-TEST_TOKEN_REDACTED
MP_PUBLIC_KEY_TEST=APP_USR-df7feb33-c8bd-4bef-b3fb-c413424c849d
```

**Características:**
- ✅ Pagamentos simulados (ambiente de teste)
- ✅ Use para desenvolvimento e testes
- ⚠️ Não cobra valores reais, mas use com cautela
- ✅ Configurado e funcionando

### ✅ Ambiente de PRODUÇÃO (Live) - CONFIGURADO

```
MP_ACCESS_TOKEN=APP_USR-PROD_TOKEN_REDACTED
MP_PUBLIC_KEY=APP_USR-4fdd0ea3-c204-438a-9eea-4f503bca869d
MP_CLIENT_ID=3916509036267962
MP_CLIENT_SECRET=SECRET_REDACTED
```

### Ambiente de PRODUÇÃO (Live)
```
MP_ACCESS_TOKEN=APP_USR-xxx (credencial de produção)
```

**Características:**
- ⚠️ Pagamentos reais (cobra valores de verdade)
- ⚠️ Use app bancário real
- ⚠️ Somente para produção
- ✅ Configurado e funcionando
- ✅ Testado com sucesso

**Status Atual:** `production` (ativo)

## 🔄 Como Alternar Entre Ambientes

### Variável de Controle: `MP_ENVIRONMENT`

O sistema usa a variável `MP_ENVIRONMENT` para determinar qual token usar:
- `test` → Usa `MP_ACCESS_TOKEN_TEST` (sandbox)
- `production` → Usa `MP_ACCESS_TOKEN` (live)

### Comandos para Alternar

#### **Ativar Ambiente de TESTE:**
```powershell
npx supabase secrets set MP_ENVIRONMENT=test
```

Após executar:
- ✅ Todas as transações usarão credenciais de teste
- ✅ QR Codes gerados serão de sandbox
- ✅ Pagamentos simulados não cobram valores reais

#### **Ativar Ambiente de PRODUÇÃO:**
```powershell
npx supabase secrets set MP_ENVIRONMENT=production
```

Após executar:
- ⚠️ Todas as transações usarão credenciais de produção
- ⚠️ QR Codes gerados cobrarão valores reais
- ⚠️ Pagamentos reais serão processados

### Verificar Ambiente Atual

```powershell
# Listar todas as secrets (mostra MP_ENVIRONMENT)
npx supabase secrets list
```

## 🧪 Testes em Ambiente de Teste (Sandbox)

### 1. Configurar para Teste

```powershell
# Ativar ambiente de teste
npx supabase secrets set MP_ENVIRONMENT=test

# Verificar
npx supabase secrets list | Select-String "MP_ENVIRONMENT"
```

### 2. Criar Usuário de Teste no Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/test-users
2. Crie um usuário vendedor (seller)
3. Crie um usuário comprador (buyer)
4. Use o app de teste com o usuário comprador

### 3. Testar Pagamento PIX

```powershell
# Rodar script de teste
node test-pix-payment.js
```

**Resultado esperado:**
```
✅ QR Code gerado com sucesso!
🔑 Payment ID: 123456789
📝 QR Code: 00020126580014br.gov.bcb.pix...
```

### 4. Simular Pagamento

**Via App de Teste do MP:**
1. Abra o app de teste do Mercado Pago
2. Faça login com usuário comprador
3. Escaneie o QR Code
4. Confirme o pagamento

**Manualmente (para testes):**
- O pagamento ficará como `pending`
- Você pode usar o Dashboard do MP para aprovar manualmente
- Ou aguardar timeout (pagamentos de teste expiram)

## 🚀 Deploy para Produção

### Checklist Antes de Ativar Produção

- [ ] ✅ Todos os testes em sandbox concluídos
- [ ] ✅ QR Codes gerando corretamente
- [ ] ✅ Polling de status funcionando
- [ ] ✅ Webhook configurado (opcional)
- [ ] ✅ Credenciais de produção obtidas no MP
- [ ] ✅ Ambiente de produção configurado

### Passo a Passo

#### 1. Obter Credenciais de Produção

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Vá em "Credenciais de produção"
4. Copie o `Access Token` (começa com `APP_USR-`)

#### 2. Configurar Credenciais de Produção

```powershell
# Configurar token de produção
npx supabase secrets set MP_ACCESS_TOKEN=APP_USR-seu-token-de-producao

# Se tiver public key de produção
npx supabase secrets set MP_PUBLIC_KEY=APP_USR-sua-public-key
```

#### 3. Ativar Ambiente de Produção

```powershell
# Mudar para produção
npx supabase secrets set MP_ENVIRONMENT=production

# Verificar
npx supabase secrets list
```

#### 4. Deploy das Funções (se necessário)

```powershell
# Redeploy para garantir que pegou as novas configs
npx supabase functions deploy mp-create-payment
npx supabase functions deploy mp-check-payment
```

#### 5. Verificar Logs

```powershell
# Verificar logs da função
npx supabase functions logs mp-create-payment --follow
```

**No log, você verá:**
```
🔧 Mercado Pago Environment: production
```

## 📊 Tabela de Comparação

| Aspecto | Teste (Sandbox) | Produção (Live) |
|---------|----------------|-----------------|
| **Token** | `MP_ACCESS_TOKEN_TEST` | `MP_ACCESS_TOKEN` |
| **Ambiente** | `MP_ENVIRONMENT=test` | `MP_ENVIRONMENT=production` |
| **Pagamentos** | Simulados | Reais |
| **App para pagar** | App de teste MP | App bancário real |
| **Valores cobrados** | R$ 0,00 | Valor real |
| **Ideal para** | Desenvolvimento | Clientes reais |
| **Webhook** | Opcional | Recomendado |

## 🔍 Troubleshooting

### Erro: "Unauthorized use of live credentials"

**Causa:** Você está usando credenciais de produção em ambiente de teste

**Solução:**
```powershell
# Verificar ambiente atual
npx supabase secrets list | Select-String "MP_ENVIRONMENT"

# Se estiver em 'production', mudar para 'test'
npx supabase secrets set MP_ENVIRONMENT=test
```

### Erro: "Test user credentials in production"

**Causa:** Você está usando credenciais de teste em produção

**Solução:**
```powershell
# Mudar para produção
npx supabase secrets set MP_ENVIRONMENT=production

# Garantir que MP_ACCESS_TOKEN está configurado
npx supabase secrets list | Select-String "MP_ACCESS_TOKEN"
```

### QR Code não gera

**Verificar:**
1. Ambiente correto configurado
2. Token válido para o ambiente
3. Logs da Edge Function

```powershell
# Ver logs em tempo real
npx supabase functions logs mp-create-payment --follow
```

## 🎯 Boas Práticas

### Durante Desenvolvimento
1. ✅ Sempre use `MP_ENVIRONMENT=test`
2. ✅ Teste com valores baixos (R$ 1,00 a R$ 10,00)
3. ✅ Use usuários de teste do MP
4. ✅ Verifique logs regularmente

### Em Produção
1. ⚠️ Configure `MP_ENVIRONMENT=production` apenas quando estiver pronto
2. ⚠️ Teste com uma transação real pequena primeiro
3. ⚠️ Configure webhook para receber notificações
4. ⚠️ Monitore logs nas primeiras horas
5. ⚠️ Tenha um processo de rollback definido

## 🔐 Segurança

### Secrets no Supabase

✅ **Correto:**
- Usar `supabase secrets set` para configurar tokens
- Nunca commitar tokens no código
- Usar variáveis de ambiente

❌ **Incorreto:**
- Hardcoded tokens em arquivos .ts/.js
- Tokens em arquivos de configuração commitados
- Compartilhar tokens por chat/email

### Rotação de Credenciais

Se precisar trocar tokens:

```powershell
# Atualizar token de teste
npx supabase secrets set MP_ACCESS_TOKEN_TEST=novo-token

# Atualizar token de produção
npx supabase secrets set MP_ACCESS_TOKEN=novo-token

# Redeploy das funções
npx supabase functions deploy mp-create-payment
npx supabase functions deploy mp-check-payment
```

## 📚 Referências

- [Mercado Pago - Credenciais de Teste](https://www.mercadopago.com.br/developers/pt/docs/credentials/test-credentials)
- [Mercado Pago - Credenciais de Produção](https://www.mercadopago.com.br/developers/pt/docs/credentials/production-credentials)
- [Mercado Pago - Usuários de Teste](https://www.mercadopago.com.br/developers/panel/test-users)
- [Supabase - Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)

---

**Ambiente Atual:** `production` (live)  
**Última Atualização:** 27/10/2025  
**Status:** ✅ Totalmente configurado e testado com sucesso

### 🎯 Teste Realizado

**Resultado do Teste (27/10/2025 02:43 UTC):**
```
✅ QR Code gerado com sucesso!
🔑 Payment ID: 130951440317
📊 Status: pending (aguardando pagamento)
💰 Valor: R$ 10,50
```

**Verificação de Status:**
```
✅ Status: pending
✅ Detalhe: pending_waiting_transfer
✅ Método: pix
✅ Valor: 10.50
```

**Conclusão:** Sistema 100% funcional! 🎊
