# Supabase Edge Functions - Mercado Pago Integration

## 📁 Estrutura

```
functions/
├── mp-create-preference/
│   └── index.ts          ← Criar preferência de pagamento
├── mp-refund/
│   └── index.ts          ← Processar reembolsos
├── mp-webhook/
│   └── index.js          ← Receber notificações do MP
└── README.md            ← Este arquivo
```

## 🔧 Tecnologia

**Runtime:** Deno (não Node.js)
- TypeScript nativo
- Imports de CDN (https://esm.sh, https://deno.land)
- `Deno.env.get()` para variáveis de ambiente
- Pattern `serve()` do Deno std

## 📝 Padrão de Edge Function

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });

    // ... sua lógica aqui ...

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## 🚀 Deploy

### Via CLI

```bash
# Login
supabase login

# Link projeto
supabase link --project-ref seu-project-ref

# Deploy individual
supabase functions deploy mp-create-preference

# Deploy todas
supabase functions deploy
```

### Configurar Secrets

```bash
supabase secrets set MP_ACCESS_TOKEN=seu-token-aqui
supabase secrets set FRONTEND_URL=https://seu-dominio.com
```

## 📡 Endpoints

### POST /functions/v1/mp-create-preference

Cria uma preferência de pagamento no Mercado Pago.

**Body:**
```json
{
  "booking_id": "uuid-do-agendamento",
  "amount": 150.00,
  "description": "Consulta Online",
  "payer": {
    "name": "João Silva",
    "email": "joao@email.com"
  },
  "payment_methods": {
    "excluded_payment_types": [],
    "installments": 12
  }
}
```

**Response:**
```json
{
  "success": true,
  "init_point": "https://www.mercadopago.com.br/checkout/...",
  "preference_id": "123456789-abc-def",
  "qr_code": "00020126580014br.gov.bcb.pix...",
  "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### POST /functions/v1/mp-refund

Processa um reembolso no Mercado Pago.

**Body:**
```json
{
  "payment_id": "uuid-do-pagamento",
  "amount": 150.00  // opcional, reembolso parcial
}
```

**Response:**
```json
{
  "success": true,
  "refund_id": "987654321",
  "status": "approved",
  "amount": 150.00,
  "payment_id": "123456789"
}
```

### POST /functions/v1/mp-webhook

Recebe notificações do Mercado Pago.

**Body (enviado pelo MP):**
```json
{
  "type": "payment",
  "action": "payment.updated",
  "data": {
    "id": "123456789"
  }
}
```

**Action:**
- Busca detalhes do pagamento na API do MP
- Atualiza status na tabela `payments`
- Atualiza status do `booking` se necessário

## 🔒 Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `MP_ACCESS_TOKEN` | Access Token do Mercado Pago | ✅ |
| `FRONTEND_URL` | URL do frontend (para back_urls) | ✅ |
| `SUPABASE_URL` | URL do projeto Supabase | ✅ Auto |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | ✅ Auto |

> **Nota:** `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente pelo Supabase.

## 🧪 Teste Local

```bash
# Iniciar Supabase local
supabase start

# Servir função localmente
supabase functions serve mp-create-preference --env-file config/local.env

# Testar com curl
curl -X POST http://localhost:54321/functions/v1/mp-create-preference \
  -H "Authorization: Bearer sua-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "booking_id": "test-123",
    "amount": 100
  }'
```

## 📊 Logs

```bash
# Ver logs em tempo real
supabase functions logs mp-create-preference --follow

# Ver logs de todas
supabase functions logs
```

## ⚠️ Avisos do VS Code

É normal ver erros no VS Code como:
- `Cannot find module 'https://deno.land/...'`
- `Cannot find name 'Deno'`

**Isso não afeta o funcionamento!** As Edge Functions rodam no runtime Deno do Supabase, não no Node.js local.

Para remover os avisos (opcional):
1. Instale a extensão "Deno" no VS Code
2. Configure `.vscode/settings.json`:
   ```json
   {
     "deno.enable": true,
     "deno.enablePaths": ["functions"]
   }
   ```

## 🔗 Links Úteis

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Manual](https://deno.land/manual)
- [Mercado Pago API Reference](https://www.mercadopago.com.br/developers/pt/reference)

---

**Última atualização:** Outubro 2025
