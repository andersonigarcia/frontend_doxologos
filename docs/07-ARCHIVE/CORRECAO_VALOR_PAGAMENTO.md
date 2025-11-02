# 🔧 CORREÇÃO: Invalid transaction_amount

## ❌ Problema Encontrado

Ao testar o pagamento em produção, apareceu erro:

```
Invalid transaction_amount
Error code: 4037
```

**Causa**: O valor do pagamento estava sendo enviado como `null`, `undefined` ou `0` para a API do Mercado Pago.

---

## ✅ CORREÇÃO APLICADA

### **O que foi corrigido:**

1. **Validação do valor**: Adicionada verificação se o valor é válido antes de processar
2. **Fallback para valorParam**: Se não encontrar valor em booking/inscricao, usa o parâmetro da URL
3. **Conversão para número**: Garantia que o valor é `parseFloat` com 2 casas decimais
4. **Validação de email**: Adicionada verificação de email obrigatório
5. **Log do valor**: Console log mostra valor antes de enviar

### **Código adicionado:**

```javascript
// Obter valor do pagamento
let amount = 0;
if (type === 'evento') {
    amount = inscricao?.evento?.valor || parseFloat(valorParam) || 0;
} else {
    amount = booking?.valor_consulta || booking?.services?.price || parseFloat(valorParam) || 0;
}

// Validar valor
if (!amount || amount <= 0) {
    throw new Error('Valor do pagamento inválido. Por favor, retorne à página anterior.');
}

// Garantir que é número com 2 casas decimais
amount = parseFloat(amount.toFixed(2));

console.log('💰 Valor do pagamento:', amount);
```

---

## 📦 NOVO ARQUIVO PARA DEPLOY

**Arquivo atualizado:** `deploy-novo-doxologos-v2.zip` (279 KB)  
**Localização:** `C:\Users\ander\source\repos\frontend_doxologos\`

**Arquivo JS atualizado:** `index-42c5dbca.js` (era `index-e487f607.js`)

---

## 🚀 DEPLOY RÁPIDO

### **Passos:**

1. **Acessar hPanel**: https://hpanel.hostinger.com
2. **Gerenciador de Arquivos**: /public_html/novo/
3. **Deletar arquivos antigos**:
   - ❌ `assets/index-e487f607.js` (arquivo antigo)
   - ✅ Manter `index.html` e `assets/index-d9c85f00.css`
4. **Upload**: `deploy-novo-doxologos-v2.zip`
5. **Extrair**: Botão direito → Extract
6. **Substituir**: Confirmar substituição dos arquivos

**OU**

1. **Deletar tudo** na pasta `/novo/`
2. **Upload e extrair** `deploy-novo-doxologos-v2.zip`

---

## 🧪 TESTAR NOVAMENTE

### **URL:**
```
https://novo.doxologos.com.br/checkout-direct?valor=0.01&type=booking
```

**Importante**: Adicione `?valor=0.01` na URL para testar com valor mínimo!

### **Cartão de Teste:**
```
Número: 5031 7557 3453 0604
Nome: APRO
Validade: 11/25
CVV: 123
CPF: 123.456.789-09
Parcelas: 1x
```

---

## ✅ O QUE ESPERAR

### **Console do Browser (F12):**
```javascript
✅ Mercado Pago SDK inicializado
🔵 Criando token do cartão...
✅ Token criado: tok_xxxxx
💰 Valor do pagamento: 0.01          ← NOVO LOG!
💳 Processando pagamento...
✅ Pagamento processado!
```

### **Resultado:**
- ✅ Pagamento aprovado
- ✅ Redireciona para /checkout/success
- ✅ Payment record criado no banco
- ✅ Booking atualizado (se houver)

---

## 🔍 SE AINDA DER ERRO

### **Verificar:**

1. **Console mostra valor?**
   - ✅ `💰 Valor do pagamento: 0.01` → Valor está OK
   - ❌ `💰 Valor do pagamento: 0` → URL sem parâmetro `valor`

2. **Erro "Valor inválido"?**
   - Adicionar `?valor=0.01` na URL

3. **Erro 502?**
   - Verificar logs do Supabase Dashboard
   - Edge Function pode estar com erro

---

## 📝 URLS DE TESTE

### **Com valor fixo (mais fácil):**
```
https://novo.doxologos.com.br/checkout-direct?valor=0.01&type=booking&titulo=Teste
```

### **Com booking real:**
```
https://novo.doxologos.com.br/checkout-direct?booking_id=SEU_ID&type=booking
```

### **Com inscrição real:**
```
https://novo.doxologos.com.br/checkout-direct?inscricao_id=SEU_ID&type=evento
```

---

## ✅ CHECKLIST

- [ ] Deploy do novo ZIP concluído
- [ ] Arquivo `index-42c5dbca.js` presente em assets/
- [ ] Acessou URL com `?valor=0.01`
- [ ] Console mostra `💰 Valor do pagamento: 0.01`
- [ ] Token criado com sucesso
- [ ] Pagamento processado sem erro 502
- [ ] Redirecionou para /checkout/success

---

**Status:** ✅ Correção aplicada  
**Arquivo:** deploy-novo-doxologos-v2.zip (279 KB)  
**Data:** 28/01/2025

**DEPLOY E TESTE NOVAMENTE! 🚀**
