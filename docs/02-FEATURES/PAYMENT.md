# 💳 Sistema de Pagamentos

> **Status**: ✅ Implementado e em Produção  
> **Última Atualização**: 28 de Janeiro de 2025

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Métodos de Pagamento](#métodos-de-pagamento)
3. [Arquitetura](#arquitetura)
4. [Pagamento PIX](#pagamento-pix)
5. [Pagamento com Cartão Direto](#pagamento-com-cartão-direto)
6. [Webhook e Notificações](#webhook-e-notificações)
7. [Edge Functions](#edge-functions)
8. [Configuração](#configuração)
9. [Testes](#testes)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema de pagamentos do Doxologos integra-se com **Mercado Pago** para processar:

- **PIX** (QR Code inline, sem redirecionamento)
- **Cartão de Crédito** (formulário direto no site)
- **Cartão de Débito** (via redirect MP)
- **Boleto** (via redirect MP)

### Tecnologias

- **Frontend**: React + Mercado Pago SDK v2
- **Backend**: Supabase Edge Functions (Deno)
- **API**: Mercado Pago REST API v1
- **Database**: PostgreSQL (Supabase)

### Credenciais

```bash
# Produção
MP_PUBLIC_KEY=APP_USR-4fdd0ea3-c204-438a-9eea-4f503bca869d
MP_ACCESS_TOKEN=APP_USR-****** (em secrets do Supabase)

# URLs
SUPABASE_URL=https://ppwjtvzrhvjinsutrjwk.supabase.co
PRODUCTION_URL=https://novo.doxologos.com.br
```

---

## 💰 Métodos de Pagamento

### 1. PIX (Recomendado)

✅ **Vantagens:**
- Pagamento instantâneo
- QR Code inline (sem redirecionamento)
- Verificação automática de status
- Melhor UX para o cliente

**Valores:**
- Mínimo: R$ 0.01
- Máximo: Sem limite

**Fluxo:**
1. Cliente escolhe PIX
2. Sistema gera QR Code
3. Cliente paga via app bancário
4. Sistema detecta pagamento (polling 3s)
5. Redireciona para tela de sucesso

### 2. Cartão de Crédito (Formulário Direto)

✅ **Vantagens:**
- Formulário direto no site
- Sem redirecionamento
- Tokenização segura (PCI-DSS)
- Parcelamento até 12x

⚠️ **Requisitos:**
- **HTTPS obrigatório** (MP SDK exige SSL)
- **Valor mínimo**: R$ 0.50

**Fluxo:**
1. Cliente preenche dados do cartão
2. SDK tokeniza o cartão (client-side)
3. Token enviado para Edge Function
4. Edge Function cria pagamento no MP
5. Retorna status (approved/rejected)

### 3. Cartão de Débito (Redirect)

Via redirecionamento para Mercado Pago.

### 4. Boleto (Redirect)

Via redirecionamento para Mercado Pago.

---

## 🏗️ Arquitetura

### Diagrama de Fluxo Completo

```
┌──────────────┐
│   CLIENTE    │
│  (Paciente)  │
└──────┬───────┘
       │
       │ 1. Preenche agendamento
       ▼
┌─────────────────┐
│ AgendamentoPage │────────► INSERT INTO bookings
└────────┬────────┘
         │
         │ 2. Redireciona para checkout
         ▼
┌─────────────────┐
│  CheckoutPage   │
│                 │
│ Escolhe método: │
│  ☑ PIX          │
│  ☐ Crédito      │
│  ☐ Débito       │
│  ☐ Boleto       │
└────────┬────────┘
         │
         ├─────── PIX ────────►  CheckoutPage (QR Code inline)
         │                      │
         │                      ├─► mp-create-payment (Edge Function)
         │                      │   └─► POST /v1/payments (MP API)
         │                      │
         │                      ├─► Polling (checkPaymentStatus)
         │                      │   └─► mp-check-payment (Edge Function)
         │                      │
         │                      └─► CheckoutSuccessPage
         │
         ├─── CRÉDITO ────────► CheckoutDirectPage (Formulário)
         │                      │
         │                      ├─► mp.createCardToken() (MP SDK)
         │                      │
         │                      ├─► mp-process-card-payment (Edge Function)
         │                      │   └─► POST /v1/payments (MP API)
         │                      │
         │                      └─► CheckoutSuccessPage
         │
         └─ DÉBITO/BOLETO ────► Redirect MP (init_point)
                                │
                                ├─► mp-create-preference (Edge Function)
                                │   └─► POST /checkout/preferences (MP API)
                                │
                                └─► CheckoutPendingPage (aguarda webhook)
                                    └─► CheckoutSuccessPage
```

### Tabelas do Banco de Dados

#### `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  inscricao_id UUID REFERENCES inscricoes_eventos(id),
  mercadopago_payment_id TEXT,
  preference_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL, -- pending, approved, rejected, cancelled
  payment_method TEXT, -- pix, credit_card, debit_card, ticket
  payer_email TEXT,
  payer_identification TEXT,
  external_reference TEXT,
  qr_code TEXT,
  qr_code_base64 TEXT,
  ticket_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `bookings`
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY,
  patient_id UUID REFERENCES patients(id),
  service_id UUID REFERENCES services(id),
  professional_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMP NOT NULL,
  valor_consulta DECIMAL(10,2),
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled
  payment_status TEXT, -- pending, paid, failed
  -- ...
);
```

---

## 🟢 Pagamento PIX

### Implementação Frontend

#### **CheckoutPage.jsx**

```javascript
// Estado para PIX
const [pixPayment, setPixPayment] = useState(null);
const [pollingInterval, setPollingInterval] = useState(null);

// Criar pagamento PIX
const handlePixPayment = async () => {
  const result = await MercadoPagoService.createPixPayment({
    booking_id: bookingId,
    inscricao_id: inscricaoId,
    amount: valor,
    description: `Consulta - ${booking?.services?.name}`,
    payer: {
      email: user.email,
      identification: {
        type: 'CPF',
        number: cpf
      }
    }
  });

  if (result.success) {
    setPixPayment({
      qr_code: result.qr_code,
      qr_code_base64: result.qr_code_base64,
      payment_id: result.payment_id
    });
    startPaymentPolling(result.payment_id);
  }
};

// Polling de status (verifica a cada 3s)
const startPaymentPolling = (paymentId) => {
  const interval = setInterval(async () => {
    const status = await MercadoPagoService.checkPaymentStatus(paymentId);
    
    if (status.status === 'approved') {
      clearInterval(interval);
      await updateBookingPaymentStatus('paid');
      navigate('/checkout-success?payment_id=' + paymentId);
    } else if (status.status === 'rejected') {
      clearInterval(interval);
      showError('Pagamento rejeitado');
    }
  }, 3000);

  setPollingInterval(interval);
};

// Cleanup ao desmontar
useEffect(() => {
  return () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  };
}, [pollingInterval]);
```

#### **mercadoPagoService.js**

```javascript
class MercadoPagoService {
  // Criar pagamento PIX
  static async createPixPayment(paymentData) {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/mp-create-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(paymentData)
      }
    );

    return await response.json();
  }

  // Verificar status
  static async checkPaymentStatus(paymentId) {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/mp-check-payment?payment_id=${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      }
    );

    return await response.json();
  }
}
```

### Edge Function: `mp-create-payment`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async (req) => {
  const { booking_id, inscricao_id, amount, description, payer } = await req.json();

  // Validar amount
  const transactionAmount = Math.round(Number(amount) * 100) / 100;
  if (isNaN(transactionAmount) || transactionAmount <= 0) {
    return new Response(JSON.stringify({ error: 'invalid_amount' }), { status: 400 });
  }

  // Criar pagamento PIX no MP
  const paymentPayload = {
    transaction_amount: transactionAmount,
    payment_method_id: 'pix',
    payer: {
      email: payer.email,
      identification: {
        type: payer.identification.type,
        number: payer.identification.number
      }
    },
    description,
    external_reference: booking_id || inscricao_id,
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`
  };

  const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`
    },
    body: JSON.stringify(paymentPayload)
  });

  const payment = await mpResponse.json();

  // Salvar no banco
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  await supabase.from('payments').insert({
    booking_id: booking_id || null,
    inscricao_id: inscricao_id || null,
    mercadopago_payment_id: String(payment.id),
    amount: transactionAmount,
    status: payment.status,
    payment_method: 'pix',
    payer_email: payer.email,
    external_reference: booking_id || inscricao_id,
    qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
    qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
    ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url
  });

  return new Response(JSON.stringify({
    success: true,
    payment_id: payment.id,
    status: payment.status,
    qr_code: payment.point_of_interaction?.transaction_data?.qr_code,
    qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
    ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Edge Function: `mp-check-payment`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get('payment_id');

  if (!paymentId) {
    return new Response(JSON.stringify({ error: 'missing_payment_id' }), { status: 400 });
  }

  const mpResponse = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`
      }
    }
  );

  const payment = await mpResponse.json();

  return new Response(JSON.stringify({
    payment_id: payment.id,
    status: payment.status,
    status_detail: payment.status_detail
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## 💳 Pagamento com Cartão Direto

### Problema Resolvido

**Situação Anterior**: Ao escolher cartão/boleto, usuários logados no MP viam "Saldo em conta" ao invés do formulário.

**Causa**: Comportamento padrão do MP quando detecta usuário logado.

**Solução**: Implementar formulário de cartão direto usando Mercado Pago.js SDK v2 com tokenização client-side.

### Implementação Frontend

#### **index.html** (SDK)

```html
<!-- Mercado Pago SDK v2 -->
<link rel="preconnect" href="https://sdk.mercadopago.com">
<script src="https://sdk.mercadopago.com/js/v2"></script>
```

#### **CheckoutDirectPage.jsx** (Formulário)

```javascript
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MercadoPagoService from '../lib/mercadoPagoService';

const CheckoutDirectPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Mercado Pago SDK
  const [mp, setMp] = useState(null);
  
  // Dados do cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardExpiration, setCardExpiration] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [identificationType] = useState('CPF');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [installments, setInstallments] = useState(1);

  // Inicializar MP SDK
  useEffect(() => {
    const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
    const mpInstance = new window.MercadoPago(publicKey, {
      locale: 'pt-BR'
    });
    setMp(mpInstance);
  }, []);

  // Formatadores
  const formatCardNumber = (value) => {
    return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  const formatExpiration = (value) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);
  };

  const formatCPF = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  // Processar pagamento
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Validar valor
      const bookingId = searchParams.get('booking_id');
      const inscricaoId = searchParams.get('inscricao_id');
      const type = searchParams.get('type');
      const valorParam = searchParams.get('valor');

      let amount = 0;
      if (type === 'evento') {
        amount = inscricao?.evento?.valor || parseFloat(valorParam) || 0;
      } else {
        amount = booking?.valor_consulta || booking?.services?.price || parseFloat(valorParam) || 0;
      }

      if (!amount || amount <= 0) {
        throw new Error('Valor do pagamento inválido');
      }

      amount = parseFloat(amount.toFixed(2));

      // 2. Tokenizar cartão
      const [month, year] = cardExpiration.split('/');
      const token = await mp.createCardToken({
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardholderName,
        cardExpirationMonth: month,
        cardExpirationYear: `20${year}`,
        securityCode,
        identificationType,
        identificationNumber: identificationNumber.replace(/\D/g, '')
      });

      // 3. Enviar para Edge Function
      const result = await MercadoPagoService.processCardPayment({
        token: token.id,
        amount,
        installments: parseInt(installments),
        description: type === 'evento' 
          ? `Inscrição - ${inscricao?.evento?.titulo}`
          : `Consulta - ${booking?.services?.name}`,
        payer: {
          email: user.email,
          identification: {
            type: identificationType,
            number: identificationNumber.replace(/\D/g, '')
          }
        },
        booking_id: bookingId,
        inscricao_id: inscricaoId
      });

      if (result.success && result.status === 'approved') {
        navigate(`/checkout-success?payment_id=${result.payment_id}`);
      } else {
        setError('Pagamento rejeitado. Verifique os dados do cartão.');
      }
    } catch (err) {
      console.error('Erro ao processar pagamento:', err);
      setError(err.message || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-direct-page">
      <h2>Pagamento com Cartão</h2>
      
      <form onSubmit={handleSubmit}>
        {/* Número do cartão */}
        <div>
          <label>Número do Cartão</label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="0000 0000 0000 0000"
            maxLength={19}
            required
          />
        </div>

        {/* Nome no cartão */}
        <div>
          <label>Nome no Cartão</label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
            placeholder="NOME COMPLETO"
            required
          />
        </div>

        {/* Validade e CVV */}
        <div className="row">
          <div>
            <label>Validade</label>
            <input
              type="text"
              value={cardExpiration}
              onChange={(e) => setCardExpiration(formatExpiration(e.target.value))}
              placeholder="MM/AA"
              maxLength={5}
              required
            />
          </div>
          <div>
            <label>CVV</label>
            <input
              type="text"
              value={securityCode}
              onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123"
              maxLength={4}
              required
            />
          </div>
        </div>

        {/* CPF */}
        <div>
          <label>CPF do Titular</label>
          <input
            type="text"
            value={identificationNumber}
            onChange={(e) => setIdentificationNumber(formatCPF(e.target.value))}
            placeholder="000.000.000-00"
            required
          />
        </div>

        {/* Parcelas */}
        <div>
          <label>Parcelas</label>
          <select
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
              <option key={i} value={i}>
                {i}x de R$ {(amount / i).toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Processando...' : 'Pagar'}
        </button>
      </form>
    </div>
  );
};
```

#### **mercadoPagoService.js** (método)

```javascript
static async processCardPayment(paymentData) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/mp-process-card-payment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify(paymentData)
    }
  );

  return await response.json();
}
```

### Edge Function: `mp-process-card-payment`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async (req) => {
  const {
    token,
    amount,
    installments,
    description,
    payer,
    booking_id,
    inscricao_id
  } = await req.json();

  // Validar amount (mínimo R$ 0.50 para cartão)
  let transactionAmount = Number(amount);
  if (isNaN(transactionAmount) || transactionAmount <= 0) {
    return new Response(JSON.stringify({ 
      success: false,
      error: 'invalid_amount',
      message: 'Valor inválido'
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // MP requer mínimo R$ 0.50 para cartão
  if (transactionAmount < 0.50) {
    console.warn('[MP Card] Valor muito baixo, ajustando para R$ 0,50');
    transactionAmount = 0.50;
  }

  transactionAmount = Math.round(transactionAmount * 100) / 100;

  // Criar pagamento no MP
  const external_reference = booking_id || inscricao_id;
  const paymentPayload = {
    token,
    transaction_amount: transactionAmount,
    installments: Number(installments) || 1,
    payment_method_id: 'master', // Detectado automaticamente pelo MP
    payer: {
      email: payer.email,
      identification: {
        type: payer.identification.type,
        number: payer.identification.number
      }
    },
    external_reference,
    statement_descriptor: 'DOXOLOGOS',
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`
  };

  const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
      'X-Idempotency-Key': `${booking_id || inscricao_id}-${Date.now()}`
    },
    body: JSON.stringify(paymentPayload)
  });

  if (!mpResponse.ok) {
    const errorData = await mpResponse.json();
    console.error('[MP Card] Erro API:', errorData);
    return new Response(JSON.stringify({
      success: false,
      error: 'mp_api_error',
      details: errorData
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const payment = await mpResponse.json();

  // Salvar no banco
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  await supabase.from('payments').insert({
    booking_id: booking_id || null,
    inscricao_id: inscricao_id || null,
    mercadopago_payment_id: String(payment.id),
    amount: transactionAmount,
    status: payment.status,
    payment_method: 'credit_card',
    payer_email: payer.email,
    payer_identification: payer.identification.number,
    external_reference
  });

  // Se aprovado, atualizar booking/inscricao
  if (payment.status === 'approved') {
    if (booking_id) {
      await supabase.from('bookings')
        .update({ 
          status: 'confirmed',
          payment_status: 'paid'
        })
        .eq('id', booking_id);
    }
    if (inscricao_id) {
      await supabase.from('inscricoes_eventos')
        .update({ 
          status: 'confirmado',
          payment_status: 'paid'
        })
        .eq('id', inscricao_id);
    }
  }

  return new Response(JSON.stringify({
    success: true,
    payment_id: payment.id,
    status: payment.status,
    status_detail: payment.status_detail
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### Requisitos Importantes

⚠️ **HTTPS Obrigatório**

O Mercado Pago SDK exige HTTPS para tokenização (PCI-DSS compliance):

```javascript
// ❌ Não funciona em localhost HTTP
const token = await mp.createCardToken(...); // Erro: SSL certificate required

// ✅ Funciona em:
// - https://novo.doxologos.com.br (produção)
// - https://localhost:3000 (com certificado local mkcert)
```

**Para desenvolvimento local com SSL:**

```powershell
# Instalar mkcert
choco install mkcert

# Gerar certificados
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Configurar Vite (vite.config.js)
import fs from 'fs';

export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem')
    },
    port: 3000
  }
});
```

⚠️ **Valor Mínimo**

Mercado Pago exige **R$ 0.50 mínimo** para pagamentos com cartão:

```typescript
// Edge Function valida e ajusta automaticamente
if (transactionAmount < 0.50) {
  console.warn('Ajustando para R$ 0,50');
  transactionAmount = 0.50;
}
```

---

## 🔔 Webhook e Notificações

### Edge Function: `mp-webhook`

Recebe notificações do Mercado Pago quando status de pagamento muda:

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async (req) => {
  // MP envia POST com { data: { id }, type, action }
  const body = await req.json();
  
  if (body.type !== 'payment') {
    return new Response('OK', { status: 200 });
  }

  const paymentId = body.data.id;

  // Buscar detalhes do pagamento
  const mpResponse = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`
      }
    }
  );

  const payment = await mpResponse.json();

  // Atualizar banco
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Atualizar payment
  await supabase.from('payments')
    .update({ 
      status: payment.status,
      updated_at: new Date().toISOString()
    })
    .eq('mercadopago_payment_id', String(paymentId));

  // Se aprovado, atualizar booking/inscricao
  if (payment.status === 'approved') {
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('booking_id, inscricao_id')
      .eq('mercadopago_payment_id', String(paymentId))
      .single();

    if (paymentRecord?.booking_id) {
      await supabase.from('bookings')
        .update({ 
          status: 'confirmed',
          payment_status: 'paid'
        })
        .eq('id', paymentRecord.booking_id);
    }

    if (paymentRecord?.inscricao_id) {
      await supabase.from('inscricoes_eventos')
        .update({ 
          status: 'confirmado',
          payment_status: 'paid'
        })
        .eq('id', paymentRecord.inscricao_id);
    }
  }

  return new Response('OK', { status: 200 });
});
```

### Configuração do Webhook no MP

1. Acesse: https://www.mercadopago.com.br/developers/panel/webhooks
2. Adicione URL: `https://ppwjtvzrhvjinsutrjwk.supabase.co/functions/v1/mp-webhook`
3. Eventos: `payment.created`, `payment.updated`

---

## ⚙️ Configuração

### Variáveis de Ambiente

#### **Frontend (.env.production)**

```bash
VITE_SUPABASE_URL=https://ppwjtvzrhvjinsutrjwk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_MP_PUBLIC_KEY=APP_USR-4fdd0ea3-c204-438a-9eea-4f503bca869d
VITE_APP_URL=https://novo.doxologos.com.br
```

#### **Supabase Edge Functions (Secrets)**

```bash
# Configurar via Supabase Dashboard > Edge Functions > Secrets
MP_ACCESS_TOKEN=APP_USR-****** # Token privado MP
SUPABASE_URL=https://ppwjtvzrhvjinsutrjwk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🧪 Testes

### Testar PIX

```javascript
// CheckoutPage.jsx - Modo teste
const testPixPayment = async () => {
  const result = await MercadoPagoService.createPixPayment({
    booking_id: 'test-123',
    amount: 1.00,
    description: 'Teste PIX',
    payer: {
      email: 'test@test.com',
      identification: { type: 'CPF', number: '12345678900' }
    }
  });

  console.log('QR Code:', result.qr_code);
  console.log('Payment ID:', result.payment_id);
};
```

### Testar Cartão Direto

**Cartões de Teste do Mercado Pago:**

| Bandeira | Número | CVV | Validade | Resultado |
|----------|--------|-----|----------|-----------|
| Mastercard | 5031 4332 1540 6351 | 123 | 11/25 | ✅ Aprovado |
| Visa | 4509 9535 6623 3704 | 123 | 11/25 | ✅ Aprovado |
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 | ❌ Recusado (fundos insuficientes) |

**CPF de Teste:** 12345678909

```bash
# Testar Edge Function diretamente
curl -X POST https://ppwjtvzrhvjinsutrjwk.supabase.co/functions/v1/mp-process-card-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "token": "test_token_123",
    "amount": 10.00,
    "installments": 1,
    "description": "Teste",
    "payer": {
      "email": "test@test.com",
      "identification": { "type": "CPF", "number": "12345678909" }
    },
    "booking_id": "test-123"
  }'
```

---

## 🔧 Troubleshooting

### Erro: "SSL certificate is required"

**Causa:** MP SDK exige HTTPS para tokenização.

**Solução:**
- ✅ Deploy em produção (HTTPS)
- ✅ Usar mkcert para SSL local

### Erro: "invalid_amount" ou "transaction_amount muito baixo"

**Causa:** MP exige mínimo R$ 0.50 para cartão.

**Solução:** Edge Function ajusta automaticamente para 0.50.

### Erro: "invalid type (string) for field: payment_methods.excluded_payment_types"

**Causa:** Bug do Deno que serializa arrays como strings.

**Solução:** Removido campo `payment_methods` da preference. Não afeta cartão direto.

### Pagamento não atualiza após PIX pago

**Causa:** Polling não está rodando ou webhook não configurado.

**Solução:**
1. Verificar polling no console do browser
2. Verificar webhook configurado no MP
3. Verificar logs da Edge Function `mp-webhook`

### QR Code não aparece

**Causa:** Edge Function não retornou `qr_code_base64`.

**Solução:**
```javascript
// Verificar resposta da API
const payment = await mpResponse.json();
console.log('QR Code Base64:', payment.point_of_interaction?.transaction_data?.qr_code_base64);
```

---

## 📚 Referências

- [Mercado Pago API Reference](https://www.mercadopago.com.br/developers/pt/reference)
- [Mercado Pago.js SDK](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/card/integrate-via-cardform)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [PCI-DSS Compliance](https://www.pcisecuritystandards.org/)

---

**Última atualização**: 28/01/2025 | [Voltar ao Índice](../README.md)
