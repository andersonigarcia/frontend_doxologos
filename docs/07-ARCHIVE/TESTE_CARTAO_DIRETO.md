# 🧪 Como Testar Pagamento com Cartão Direto

## Status: ✅ PRONTO PARA TESTE

---

## 📍 Acesso ao Formulário de Cartão Direto

### Opção 1: Via CheckoutPage (Recomendado)
1. Acesse a página de checkout normal:
   ```
   http://localhost:3000/checkout?booking_id=XXX&type=booking
   ```
   
2. Selecione **"Cartão de Crédito"** ou **"Cartão de Débito"**

3. Você verá **duas opções**:
   - ✅ **"Pagar com Cartão (Formulário Direto)"** ← Nova opção sem redirect
   - 🔄 **"Pagar via Mercado Pago (Redirect)"** ← Opção antiga com redirect

4. Clique em **"Pagar com Cartão (Formulário Direto)"**

### Opção 2: Acesso Direto
```
http://localhost:3000/checkout-direct?booking_id=XXX&type=booking
```

---

## 💳 Cartões de Teste do Mercado Pago

### ✅ Cartão APROVADO
```
Número: 5031 7557 3453 0604
Nome: APRO
Validade: 11/25 (qualquer data futura)
CVV: 123 (qualquer 3 dígitos)
CPF: 123.456.789-09 (qualquer CPF válido)
```

### ❌ Cartão REJEITADO (para testar erro)
```
Número: 5031 4332 1540 6351
Nome: OTHE
Validade: 11/25
CVV: 123
CPF: 123.456.789-09
```

### ⏰ Cartão PENDENTE
```
Número: 5031 7557 3453 0604
Nome: CONT
Validade: 11/25
CVV: 123
CPF: 123.456.789-09
```

---

## 🎯 O Que Testar

### 1. Formatação Automática
- [ ] Número do cartão adiciona espaços automaticamente (XXXX XXXX XXXX XXXX)
- [ ] CPF adiciona pontos e traço (XXX.XXX.XXX-XX)
- [ ] Data de expiração aceita apenas MM/YY
- [ ] Nome do titular fica em UPPERCASE

### 2. Validações
- [ ] Tenta submeter com campos vazios (deve mostrar erro)
- [ ] Tenta usar CPF inválido
- [ ] Tenta usar data expirada (deve rejeitar)
- [ ] Tenta usar CVV com menos de 3 dígitos

### 3. Processamento
- [ ] Loading aparece durante tokenização
- [ ] Cartão APROVADO redireciona para /checkout/success
- [ ] Cartão REJEITADO redireciona para /checkout/failure
- [ ] Mensagens de erro são claras

### 4. Backend
- [ ] Payment record criado no banco (table: payments)
- [ ] Booking atualizado para payment_status: 'paid' (se aprovado)
- [ ] Edge Function logs no Supabase Dashboard

---

## 🔍 Debug Console

### Frontend (Browser Console)
Você verá logs como:
```javascript
🔵 Iniciando processamento de pagamento...
💳 Criando token do cartão...
✅ Token criado: tok_xxxxx
📤 Enviando para Edge Function...
✅ Pagamento processado: { payment_id, status: 'approved' }
```

### Edge Function (Supabase Dashboard)
1. Acesse: https://supabase.com/dashboard/project/ppwjtvzrhvjinsutrjwk/functions
2. Clique em **mp-process-card-payment**
3. Veja os logs em tempo real

---

## 🐛 Troubleshooting

### ❌ "SDK do Mercado Pago não carregado"
**Causa**: Script tag não carregou  
**Solução**: Verifique console, recarregue a página

### ❌ "Erro ao criar token"
**Causa**: Dados do cartão inválidos  
**Solução**: 
- Use cartões de teste corretos
- Verifique se todos os campos estão preenchidos
- Valide formato do CPF (XXX.XXX.XXX-XX)

### ❌ "Erro ao processar pagamento"
**Causa**: Edge Function retornou erro  
**Solução**: 
- Verifique logs no Supabase Dashboard
- Confirme MP_ACCESS_TOKEN configurado
- Teste se Edge Function está ativa

### ❌ Página em branco
**Causa**: Erro de renderização  
**Solução**: 
- Abra console do browser (F12)
- Procure por erros JavaScript
- Verifique se `window.MercadoPago` está definido

---

## 📊 Comparação: Direto vs Redirect

| Aspecto | Formulário Direto | Redirect MP |
|---------|-------------------|-------------|
| **UX** | ✅ Usuário permanece no site | ❌ Redirect para MP |
| **Usuário Logado** | ✅ Não afeta | ❌ Mostra "Saldo em conta" |
| **Controle** | ✅ Total sobre UI/UX | ❌ Layout do MP |
| **Segurança** | ✅ Token client-side | ✅ Redirect server-side |
| **Parcelas** | ✅ 1-12x | ✅ 1-12x |
| **PIX** | ❌ Não suportado | ✅ Suportado |
| **Boleto** | ❌ Não suportado | ✅ Suportado |

---

## ✅ Fluxo de Sucesso Esperado

1. **Usuário preenche formulário**
   - Todos os campos formatados automaticamente
   - Seleciona parcelas (1-12x)

2. **Clica em "Finalizar Pagamento"**
   - Loading aparece
   - SDK tokeniza o cartão (não envia dados sensíveis ao servidor)

3. **Token enviado para Edge Function**
   - Edge Function chama MP API com token
   - MP processa pagamento

4. **MP retorna status**
   - `approved` → Sucesso
   - `rejected` → Erro
   - `pending` → Aguardando

5. **Sistema atualiza banco**
   - Cria registro em `payments`
   - Atualiza `booking.payment_status` para 'paid'

6. **Usuário redirecionado**
   - Sucesso → `/checkout/success?payment_id=XXX`
   - Falha → `/checkout/failure?payment_id=XXX`

---

## 🎯 Teste Rápido (1 minuto)

```bash
# 1. Acesse
http://localhost:3000/checkout?booking_id=SEU_ID&type=booking

# 2. Selecione "Cartão de Crédito"

# 3. Clique "Pagar com Cartão (Formulário Direto)"

# 4. Preencha:
Número: 5031 7557 3453 0604
Nome: APRO
Validade: 11/25
CVV: 123
CPF: 123.456.789-09

# 5. Selecione parcelas: 1x

# 6. Clique "Finalizar Pagamento"

# 7. Aguarde → Deve redirecionar para /checkout/success ✅
```

---

## 📝 Próximos Passos Após Teste

- [ ] Se tudo funcionar: Deploy em produção
- [ ] Se houver erros: Debug com logs do Supabase
- [ ] Adicionar Google Analytics para track de conversões
- [ ] Documentar para equipe de suporte

---

**Última atualização**: 28/01/2025  
**Pronto para testar!** 🚀
