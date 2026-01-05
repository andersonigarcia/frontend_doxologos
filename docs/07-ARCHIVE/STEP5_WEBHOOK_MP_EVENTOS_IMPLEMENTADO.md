# ✅ STEP 5: Webhook Mercado Pago para Eventos - IMPLEMENTADO

**Data:** 29/10/2025  
**Arquivo modificado:** `supabase/functions/mp-webhook/index.ts`  
**Status:** ✅ COMPLETO

---

## 📋 Resumo da Implementação

### Objetivo
Detectar pagamentos de eventos pelo Mercado Pago e:
1. Atualizar status da inscrição para `'confirmed'`
2. Registrar `payment_status='approved'` e `payment_date`
3. Enviar email com link da sala Zoom
4. Marcar `zoom_link_sent=true`

---

## 🔍 Detecção de Pagamentos de Eventos

### Lógica Implementada:

```typescript
const externalRef = mpPayment.external_reference || null;

// Detectar prefixo EVENTO_
if (externalRef && externalRef.startsWith('EVENTO_')) {
    const inscricaoId = externalRef.replace('EVENTO_', '');
    // Processar pagamento de evento
}
```

### Fluxo de Processamento:

1. **Webhook recebe notificação** do Mercado Pago
2. **Busca dados do pagamento** via API MP
3. **Extrai `external_reference`** (ex: `EVENTO_123abc`)
4. **Detecta prefixo `EVENTO_`** → identifica como pagamento de evento
5. **Extrai ID da inscrição** (remove prefixo)
6. **Busca inscrição + evento** no banco (`inscricoes_eventos JOIN eventos`)
7. **Atualiza status** se pagamento aprovado
8. **Envia email** com link Zoom
9. **Marca email enviado** (`zoom_link_sent=true`)

---

## 🎯 Quando o Webhook é Acionado

### Gatilho:
- Mercado Pago envia POST para: `{SUPABASE_URL}/functions/v1/mp-webhook`
- Payload contém: `{ id: "payment_id", data: { id: "payment_id" } }`

### Status processados:
- ✅ `approved` → Pagamento aprovado
- ✅ `paid` → Pagamento recebido

### Status ignorados:
- ⏳ `pending` → Aguardando pagamento
- ❌ `rejected` → Pagamento rejeitado
- 🚫 `cancelled` → Pagamento cancelado

---

## 📧 Email Enviado (Pagamento Confirmado)

### Template HTML Inline:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    /* CSS inline para compatibilidade com email clients */
    body { font-family: Arial, sans-serif; }
    .header { background: linear-gradient(135deg, #2d8659 0%, #236b47 100%); }
    .zoom-box { background: #e8f5ee; border: 2px solid #2d8659; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Pagamento Confirmado!</h1>
      <p>Sua vaga está garantida</p>
    </div>
    
    <div class="content">
      <p>Olá <strong>{NOME}</strong>,</p>
      <p>Recebemos a confirmação do seu pagamento!</p>
      
      <div class="event-box">
        <h2>{TITULO_EVENTO}</h2>
        <p>📅 Data: {DATA_FORMATADA}</p>
        <p>⏰ Horário: {HORA_FORMATADA}</p>
        <p>💰 Valor pago: R$ {VALOR}</p>
        <p>✅ Status: Confirmado</p>
      </div>
      
      <div class="zoom-box">
        <h3>🎥 Link da Sala Zoom</h3>
        <p><a href="{ZOOM_LINK}">{ZOOM_LINK}</a></p>
        <p>🔒 Senha: {ZOOM_PASSWORD}</p>
        <a href="{ZOOM_LINK}" class="btn">Acessar Sala Zoom</a>
      </div>
      
      <div class="checklist">
        <h4>📋 Checklist para o evento:</h4>
        <ul>
          <li>✅ Pagamento confirmado</li>
          <li>📧 Adicione ao calendário</li>
          <li>🎥 Teste o Zoom antes</li>
          <li>📱 Entre 5-10 min antes</li>
          <li>🎧 Use fone de ouvido</li>
          <li>📝 Papel e caneta</li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>
```

### Campos Dinâmicos:
- `{NOME}` → `inscricao.patient_name`
- `{TITULO_EVENTO}` → `evento.titulo`
- `{DATA_FORMATADA}` → `new Date(evento.data_inicio).toLocaleDateString('pt-BR')`
- `{HORA_FORMATADA}` → `new Date(evento.data_inicio).toLocaleTimeString('pt-BR')`
- `{VALOR}` → `parseFloat(evento.valor).toFixed(2).replace('.', ',')`
- `{ZOOM_LINK}` → `evento.meeting_link`
- `{ZOOM_PASSWORD}` → `evento.meeting_password`

### Subject:
```
✅ Pagamento Confirmado - {titulo_evento}
```

---

## 🔄 Atualizações no Banco de Dados

### Tabela: `inscricoes_eventos`

| Campo | Valor Antes | Valor Depois |
|-------|-------------|--------------|
| `status` | `'pending'` | `'confirmed'` ✅ |
| `payment_status` | `'pending'` | `'approved'` ✅ |
| `payment_date` | `null` | `2025-10-29T21:30:00.000Z` ✅ |
| `zoom_link_sent` | `false` | `true` ✅ |
| `zoom_link_sent_at` | `null` | `2025-10-29T21:30:15.000Z` ✅ |

### Query de Atualização (Status):
```typescript
await fetch(`${SUPABASE_URL}/rest/v1/inscricoes_eventos?id=eq.${inscricaoId}`, {
  method: 'PATCH',
  headers: { /* auth headers */ },
  body: JSON.stringify({
    status: 'confirmed',
    payment_status: 'approved',
    payment_date: new Date().toISOString()
  })
});
```

### Query de Atualização (Email Enviado):
```typescript
await fetch(`${SUPABASE_URL}/rest/v1/inscricoes_eventos?id=eq.${inscricaoId}`, {
  method: 'PATCH',
  headers: { /* auth headers */ },
  body: JSON.stringify({
    zoom_link_sent: true,
    zoom_link_sent_at: new Date().toISOString()
  })
});
```

---

## 🔒 Segurança Implementada

### 1. Verificação de External Reference
```typescript
if (externalRef && externalRef.startsWith('EVENTO_')) {
  // Processar apenas se tiver prefixo EVENTO_
}
```
→ Garante que não confunda com pagamentos de consultas

### 2. Verificação de Inscrição Existente
```typescript
const inscArr = await inscRes.json();
const inscricao = inscArr[0];

if (!inscricao) {
  console.error(`❌ Inscrição ${inscricaoId} não encontrada`);
  return new Response('inscricao not found', { status: 404 });
}
```
→ Retorna 404 se inscrição não existe

### 3. Verificação de Status de Pagamento
```typescript
if (mpPayment.status === 'approved' || mpPayment.status === 'paid') {
  // Processar apenas pagamentos aprovados
}
```
→ Ignora pagamentos pendentes/rejeitados/cancelados

### 4. Tratamento de Erros de Email
```typescript
try {
  // Enviar email
  const emailSent = await sendEmail(...);
  if (emailSent) {
    // Marcar como enviado
  }
} catch (emailError) {
  console.error('❌ Erro ao enviar email:', emailError);
  // Não bloqueia o webhook
}
```
→ Webhook retorna 200 mesmo se email falhar

---

## 📊 Logs e Debug

### Console Logs Adicionados:

```typescript
console.log(`🎫 Processando pagamento de evento - Inscrição ID: ${inscricaoId}`);
console.log(`✅ Inscrição ${inscricaoId} confirmada - Enviando email com Zoom`);
console.log(`✅ Email com Zoom enviado para ${patientEmail}`);
console.error(`❌ Inscrição ${inscricaoId} não encontrada`);
console.error('❌ Erro ao enviar email:', emailError);
```

### Como Visualizar Logs:
```bash
# Supabase Dashboard → Edge Functions → mp-webhook → Logs
# Ou via CLI:
supabase functions logs mp-webhook --follow
```

---

## 🔄 Fluxo Completo (Diagrama)

```
Usuario faz PIX
    ↓
Mercado Pago confirma pagamento
    ↓
MP envia webhook para Supabase
    ↓
Edge Function mp-webhook
    ↓
Busca dados do pagamento (MP API)
    ↓
Extrai external_reference: "EVENTO_123abc"
    ↓
Detecta prefixo "EVENTO_" ✅
    ↓
Extrai inscricaoId: "123abc"
    ↓
Busca inscricao + evento no banco
    ↓
Status do pagamento = "approved"? ✅
    ↓
UPDATE inscricoes_eventos SET status='confirmed'
    ↓
Envia email com Zoom via SendGrid
    ↓
Email enviado com sucesso? ✅
    ↓
UPDATE zoom_link_sent=true
    ↓
Retorna HTTP 200 OK
```

---

## 🧪 Como Testar

### 1. Teste Local (Simulação):
```bash
# Simular webhook local
curl -X POST http://localhost:54321/functions/v1/mp-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "payment_id_teste",
    "data": { "id": "payment_id_teste" }
  }'
```

### 2. Teste em Produção (Mercado Pago Sandbox):
1. Criar evento de teste no admin
2. Fazer inscrição com CPF de teste do MP
3. Gerar PIX de teste
4. "Pagar" usando ferramenta de testes do MP
5. Aguardar webhook (até 30 segundos)
6. Verificar logs no Supabase Dashboard

### 3. Verificar no Banco:
```sql
SELECT 
  id,
  evento_id,
  patient_name,
  patient_email,
  status,
  payment_status,
  payment_date,
  zoom_link_sent,
  zoom_link_sent_at
FROM inscricoes_eventos
WHERE id = 'inscricao_id_teste';
```

---

## ⚠️ Pontos de Atenção

### 1. External Reference deve ter prefixo `EVENTO_`
- ✅ Correto: `EVENTO_123abc456def`
- ❌ Errado: `123abc456def` (será tratado como booking)

### 2. Email Template é Inline (não usa emailTemplates.js)
- Motivo: Edge Function (Deno) não tem acesso ao código React
- Solução futura: Mover templates para banco ou arquivo .ts separado

### 3. Webhook pode ser chamado múltiplas vezes
- Mercado Pago pode reenviar webhook se não receber 200 OK
- Sistema é idempotente: atualiza status mesmo se já confirmado

### 4. Timezone da data/hora
- Usa `toLocaleDateString('pt-BR')` para formatar no email
- Data vem do banco em UTC, formatação converte automaticamente

---

## 📝 Variáveis de Ambiente Necessárias

```bash
# Supabase Dashboard → Project Settings → Edge Functions → Secrets

SUPABASE_URL=https://ppwjtvzrhvjinsutrjwk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
MP_ACCESS_TOKEN=APP_USR-123456789...
SENDGRID_API_KEY=SG.abcdefghijklmnop...
SENDGRID_FROM_EMAIL=noreply@doxologos.com.br
```

---

## ✅ STEP 5 COMPLETO

**Funcionalidades implementadas:**
- ✅ Detecção de pagamentos de eventos (prefixo `EVENTO_`)
- ✅ Atualização de status para `'confirmed'`
- ✅ Registro de `payment_status='approved'` e `payment_date`
- ✅ Envio de email com link Zoom
- ✅ Marcação de `zoom_link_sent=true`
- ✅ Logs detalhados para debug
- ✅ Tratamento de erros sem bloquear webhook

**Pronto para:** STEP 6 - Página de Inscrições do Usuário

---

## 🚀 Próximo Passo: STEP 6

**Objetivo:** Criar página onde usuário visualiza suas inscrições

**Arquivo a criar:** `src/pages/MinhasInscricoesPage.jsx`

**Funcionalidades:**
- Listar eventos inscritos do usuário
- Mostrar status (confirmado, pendente, cancelado)
- Exibir link Zoom **apenas** se `status='confirmed'`
- Badge visual de status
- Detalhes do evento (data, hora, valor)
- Link para o evento no site
