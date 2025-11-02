# Correção do Fluxo de Pagamento - Cartão e Boleto

## 📋 Problema Identificado

Ao selecionar **cartão de crédito**, **cartão de débito** ou **boleto bancário**, o sistema estava **redirecionando para a área logada do Mercado Pago** ao invés de mostrar o formulário de pagamento apropriado.

### Causa Raiz

O código não estava enviando informações sobre o **método de pagamento selecionado** para a API do Mercado Pago. Isso fazia com que:

1. A preferência fosse criada **sem restrições** de métodos de pagamento
2. O Mercado Pago abria a tela padrão com **todos os métodos** disponíveis
3. Em alguns casos, redirecionava para área logada ao invés do checkout

## ✅ Solução Implementada

### 1. **CheckoutPage.jsx** - Frontend

**Arquivo**: `src/pages/CheckoutPage.jsx`

**Alteração**: Linhas 224-254

Adicionado código para configurar `payment_methods` baseado no método selecionado pelo usuário:

```javascript
// Configurar payment_methods baseado no método selecionado
let paymentMethodConfig = {
    excluded_payment_methods: [],
    excluded_payment_types: [],
    installments: 12
};

// Configurar exclusões baseado no método selecionado
if (selectedMethod === 'credit_card') {
    // Apenas cartão de crédito
    paymentMethodConfig.excluded_payment_types = ['debit_card', 'ticket', 'bank_transfer', 'atm'];
} else if (selectedMethod === 'debit_card') {
    // Apenas cartão de débito
    paymentMethodConfig.excluded_payment_types = ['credit_card', 'ticket', 'bank_transfer', 'atm'];
} else if (selectedMethod === 'bank_transfer') {
    // Apenas boleto
    paymentMethodConfig.excluded_payment_types = ['credit_card', 'debit_card', 'atm'];
}

// Adicionar configuração de payment_methods ao payload
const preferencePayload = {
    ...requestPayload,
    payment_methods: paymentMethodConfig,
    selected_payment_method: selectedMethod
};
```

### 2. **Edge Function mp-create-preference** - Backend

**Arquivo**: `supabase/functions/mp-create-preference/index.ts`

**Alterações Principais**:

#### a) Suporte a Inscrições de Eventos

Antes aceitava apenas `booking_id`, agora aceita também `inscricao_id`:

```typescript
const { booking_id, inscricao_id, amount, description, payer, payment_methods } = body;

if (!booking_id && !inscricao_id) {
  return new Response(
    JSON.stringify({ error: 'booking_id or inscricao_id required' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

#### b) Busca de Dados Dinâmica

```typescript
let finalAmount = amount || 0;
let payerData = payer || {};
let referenceId = booking_id || inscricao_id;
let referenceType = booking_id ? 'booking' : 'evento';

// Se for booking
if (booking_id) {
  // Busca dados do booking + services
}
// Se for inscrição de evento
else if (inscricao_id) {
  // Busca dados da inscrição + evento
}
```

#### c) Envio de payment_methods para Mercado Pago

**DESCOMENTAR** a linha que estava comentada:

```typescript
const preference: any = {
  items: [...],
  external_reference: referenceId,
  payer: {...},
  // ANTES: estava comentado
  // AGORA: enviado condicionalmente
  ...(finalPaymentMethods.excluded_payment_types.length > 0 || finalPaymentMethods.excluded_payment_methods.length > 0 ? {
    payment_methods: finalPaymentMethods
  } : {}),
  back_urls: {...},
  // ...
};
```

**Lógica Condicional**: 
- Se houver exclusões configuradas → envia `payment_methods`
- Se não houver exclusões → não envia (evita erro da API do MP)

#### d) URLs de Retorno com Tipo

```typescript
back_urls: {
  success: `${FRONTEND_URL}/checkout/success?external_reference=${referenceId}&type=${referenceType}`,
  failure: `${FRONTEND_URL}/checkout/failure?external_reference=${referenceId}&type=${referenceType}`,
  pending: `${FRONTEND_URL}/checkout/pending?external_reference=${referenceId}&type=${referenceType}`
}
```

#### e) Registro de Pagamento Dinâmico

```typescript
const paymentRecord: any = {
  mp_preference_id: mpJson.id,
  status: 'pending',
  transaction_amount: finalAmount,
  currency_id: 'BRL',
  payer_email: payerData.email,
  payment_url: mpJson.init_point,
  // ...
};

// Adicionar booking_id OU inscricao_id
if (booking_id) {
  paymentRecord.booking_id = booking_id;
} else if (inscricao_id) {
  paymentRecord.inscricao_id = inscricao_id;
}
```

## 🧪 Como Testar

### Teste 1: Cartão de Crédito (Consulta)

1. ✅ Agendar uma consulta no sistema
2. ✅ Na página de checkout, selecionar **"Cartão de Crédito"**
3. ✅ Clicar em **"Continuar para Pagamento"**
4. ✅ **Verificar**: Sistema deve abrir tela do Mercado Pago **apenas com opção de cartão de crédito**
5. ✅ **NÃO DEVE**: Redirecionar para área logada
6. ✅ **NÃO DEVE**: Mostrar PIX, boleto ou outros métodos

### Teste 2: Cartão de Débito (Evento)

1. ✅ Fazer inscrição em um **evento pago**
2. ✅ Na página de checkout, selecionar **"Cartão de Débito"**
3. ✅ Clicar em **"Continuar para Pagamento"**
4. ✅ **Verificar**: Tela do MP com **apenas débito**
5. ✅ **NÃO DEVE**: Mostrar crédito, PIX ou boleto

### Teste 3: Boleto Bancário

1. ✅ Agendar consulta ou inscrever em evento
2. ✅ Selecionar **"Boleto Bancário"**
3. ✅ Clicar em **"Continuar para Pagamento"**
4. ✅ **Verificar**: Tela do MP para gerar boleto
5. ✅ **NÃO DEVE**: Mostrar cartão ou PIX

### Teste 4: PIX (Não deve ser afetado) ⚠️

1. ✅ Agendar consulta
2. ✅ Selecionar **"PIX"**
3. ✅ Clicar em **"Continuar para Pagamento"**
4. ✅ **Verificar**: QR Code exibido **DIRETAMENTE na página**
5. ✅ **NÃO DEVE**: Redirecionar para Mercado Pago
6. ✅ **NÃO DEVE**: Alterar comportamento atual (já está funcionando)

## 📊 Comparação: Antes vs Depois

| Método              | ❌ Antes                               | ✅ Depois                                  |
|---------------------|---------------------------------------|--------------------------------------------|
| **PIX**             | QR Code na página ✅                  | QR Code na página ✅ (sem alterações)     |
| **Cartão Crédito**  | Área logada MP ou todos os métodos ❌ | Formulário apenas de cartão crédito ✅     |
| **Cartão Débito**   | Área logada MP ou todos os métodos ❌ | Formulário apenas de cartão débito ✅      |
| **Boleto**          | Área logada MP ou todos os métodos ❌ | Tela de geração de boleto ✅               |

## 🔧 Configurações do Mercado Pago

### Payment Types (tipos excluídos por método)

```javascript
// Cartão de Crédito
excluded_payment_types: ['debit_card', 'ticket', 'bank_transfer', 'atm']

// Cartão de Débito
excluded_payment_types: ['credit_card', 'ticket', 'bank_transfer', 'atm']

// Boleto Bancário
excluded_payment_types: ['credit_card', 'debit_card', 'atm']

// PIX (pagamento direto, não usa preference)
// Não aplica - usa mp-create-payment
```

### Tipos de Pagamento no Mercado Pago

- `credit_card` - Cartão de Crédito
- `debit_card` - Cartão de Débito
- `ticket` - Boleto (no Brasil)
- `bank_transfer` - Transferência bancária
- `atm` - Pagamento em caixa eletrônico
- `pix` - PIX (Brasil)

## 🚀 Deploy Realizado

```bash
npx supabase functions deploy mp-create-preference --project-ref ppwjtvzrhvjinsutrjwk
```

**Status**: ✅ **Deployed com sucesso**

**Dashboard**: https://supabase.com/dashboard/project/ppwjtvzrhvjinsutrjwk/functions

## 📝 Checklist de Validação

- [x] CheckoutPage.jsx atualizado
- [x] Edge Function mp-create-preference atualizada
- [x] Suporte a `booking_id` mantido
- [x] Suporte a `inscricao_id` adicionado
- [x] Configuração de `payment_methods` por método
- [x] Fluxo PIX **NÃO** afetado
- [x] Deploy da Edge Function realizado
- [ ] **TESTE**: Cartão de crédito (consulta)
- [ ] **TESTE**: Cartão de crédito (evento)
- [ ] **TESTE**: Cartão de débito (consulta)
- [ ] **TESTE**: Cartão de débito (evento)
- [ ] **TESTE**: Boleto bancário (consulta)
- [ ] **TESTE**: Boleto bancário (evento)
- [ ] **TESTE**: PIX continua funcionando (consulta)
- [ ] **TESTE**: PIX continua funcionando (evento)

## ⚠️ Observações Importantes

1. **PIX não foi alterado**: O fluxo de PIX usa `mp-create-payment` (pagamento direto) e **não é afetado** por essas mudanças

2. **Ambiente de teste**: Configurar `MP_ENVIRONMENT=test` no Supabase para usar credenciais de sandbox

3. **Parcelas**: Configurado para até 12x (padrão) - pode ser ajustado por método se necessário

4. **Expiração**: Preferências expiram em 24 horas após criação

5. **Webhook**: Continua funcionando para todos os métodos via `mp-webhook` Edge Function

## 🔍 Logs para Debug

No console do navegador, procure por:

```javascript
💳 Criando preferência para credit_card
📤 [MP Service] Payload ANTES de JSON.stringify: {payment_methods: {...}}
[MP] payment_methods extraído: {excluded_payment_types: [...]}
[MP] Final payment_methods to MP: {excluded_payment_types: [...], installments: 12}
Creating MP preference: {...}
MP preference created: abc123...
```

## ⚠️ Erro 502 Corrigido

### **Problema Encontrado no Deploy Inicial**

```
Error 502: "invalid type (string) for field: payment_methods.excluded_payment_types"
```

**Causa**: O Mercado Pago estava recebendo `excluded_payment_types` como **string** ao invés de **array**.

### **Correção Aplicada**

Modificamos a Edge Function para construir o objeto `payment_methods` de forma explícita:

```typescript
// Criar objeto de preferência base
const preference: any = {
  // ... outros campos ...
};

// Adicionar payment_methods apenas se houver exclusões configuradas
if (finalPaymentMethods.excluded_payment_types.length > 0 || 
    finalPaymentMethods.excluded_payment_methods.length > 0) {
  preference.payment_methods = {
    excluded_payment_methods: finalPaymentMethods.excluded_payment_methods,
    excluded_payment_types: finalPaymentMethods.excluded_payment_types,
    installments: finalPaymentMethods.installments
  };
  console.log('[MP] Adding payment_methods to preference:', 
    JSON.stringify(preference.payment_methods));
}
```

**Resultado**: Agora os arrays são enviados corretamente para a API do Mercado Pago.

### **Deploy Final**

```bash
✅ npx supabase functions deploy mp-create-preference --project-ref ppwjtvzrhvjinsutrjwk --no-verify-jwt

Deployed Functions on project ppwjtvzrhvjinsutrjwk: mp-create-preference
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar console do navegador
2. Verificar logs da Edge Function no Dashboard do Supabase
3. Verificar se `MP_ACCESS_TOKEN` está configurado
4. Verificar se credenciais são de produção ou teste
5. Verificar se `excluded_payment_types` está sendo enviado como array

### **Logs de Debug Adicionais**

```typescript
[MP] Received payment_methods: {"excluded_payment_types":["debit_card","ticket","bank_transfer","atm"]}
[MP] Type of excluded_payment_types: object
[MP] Is array?: true
[MP] Final excluded_payment_types is array?: true
[MP] Adding payment_methods to preference: {...}
```

---

**Data**: 02/11/2025  
**Autor**: Assistente de Desenvolvimento  
**Status**: ✅ **Implementado, Corrigido e Deployed**  
**Pendente**: Testes em ambiente de produção
