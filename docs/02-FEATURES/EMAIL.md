# 📧 Sistema de E-mails

> **Status**: ✅ Implementado e Configurado  
> **Provider**: SMTP Hostinger  
> **Backend**: Supabase Edge Functions

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Configuração](#configuração)
3. [Templates Disponíveis](#templates-disponíveis)
4. [Como Usar](#como-usar)
5. [Arquitetura](#arquitetura)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Sistema completo de envio de e-mails transacionais para:
- ✅ Confirmação de agendamentos
- ✅ Pagamento aprovado
- ✅ Reagendamento
- ✅ Cancelamento
- ✅ Lembretes (24h antes)
- ✅ Agradecimento pós-consulta
- ✅ Recuperação de senha

### Tecnologias

- **SMTP**: Hostinger (smtp.hostinger.com:587)
- **Library**: Nodemailer
- **Backend**: Supabase Edge Functions
- **Templates**: HTML responsivo com CSS inline

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente

#### **Frontend (.env.production)**

```bash
VITE_APP_URL=https://novo.doxologos.com.br
VITE_ENABLE_EMAIL_NOTIFICATIONS=true
```

#### **Supabase Edge Functions (Secrets)**

```bash
# SMTP Hostinger
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=doxologos@doxologos.com.br
SMTP_PASSWORD=sua_senha_smtp
FROM_EMAIL=doxologos@doxologos.com.br
FROM_NAME=Doxologos Psicologia
REPLY_TO_EMAIL=doxologos@doxologos.com.br

# Supabase (para acesso ao banco)
SUPABASE_URL=https://ppwjtvzrhvjinsutrjwk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Como Obter Credenciais SMTP

**Passo a passo Hostinger:**

1. Acesse: https://hpanel.hostinger.com
2. Vá em **E-mails** → **Gerenciar**
3. Selecione a conta: `doxologos@doxologos.com.br`
4. Copie as credenciais SMTP:
   - **Servidor:** smtp.hostinger.com
   - **Porta:** 587 (TLS) ou 465 (SSL)
   - **Usuário:** doxologos@doxologos.com.br
   - **Senha:** (senha da conta de email)

### 3. Configurar Secrets no Supabase

```bash
# Via Supabase CLI
supabase secrets set SMTP_HOST=smtp.hostinger.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=doxologos@doxologos.com.br
supabase secrets set SMTP_PASSWORD=sua_senha

# Ou via Dashboard
# https://supabase.com/dashboard/project/ppwjtvzrhvjinsutrjwk/settings/functions
```

---

## 📬 Templates Disponíveis

### 1. Confirmação de Agendamento

**Enviado:** Imediatamente após criar agendamento

**Conteúdo:**
- ✅ Dados do agendamento (data, hora, profissional, serviço)
- ✅ Link para área do paciente
- ✅ Informações de contato

**Trigger:**
```javascript
await bookingEmailManager.sendConfirmation(booking);
```

**Exemplo de Email:**

```
Olá, João Silva!

Seu agendamento foi confirmado com sucesso! 🎉

📅 Data: 27 de Outubro de 2025
🕐 Horário: 14:00
👨‍⚕️ Profissional: Dra. Maria Santos
📋 Serviço: Consulta Psicológica

[Acessar Minha Área]
```

---

### 2. Pagamento Aprovado

**Enviado:** Após confirmação de pagamento pelo Mercado Pago

**Conteúdo:**
- ✅ Confirmação de pagamento
- ✅ Link da reunião Zoom (se disponível)
- ✅ Checklist de preparação
- ✅ Instruções para iniciantes no Zoom

**Trigger:**
```javascript
await bookingEmailManager.sendApproval(booking, meetingLink);
```

**Exemplo de Email:**

```
Pagamento Confirmado! 💚

Olá, João Silva!

Seu pagamento foi aprovado e sua consulta está confirmada!

🎥 LINK DA CONSULTA ONLINE
[Entrar na Consulta]

🔐 Senha: 123456

📌 DICAS DE PREPARAÇÃO:
✓ Entre 5 minutos antes
✓ Use fones de ouvido
✓ Encontre um local silencioso
✓ Verifique sua conexão de internet

[PASSO A PASSO PARA INICIANTES]
1. Clique no link acima
2. Baixe o Zoom (se necessário)
3. Instale e abra o aplicativo
4. Digite a senha quando solicitado
...
```

---

### 3. Reagendamento

**Enviado:** Quando agendamento é remarcado

**Conteúdo:**
- ✅ Data antiga (riscada) vs nova data
- ✅ Motivo do reagendamento
- ✅ Link para visualizar

**Trigger:**
```javascript
await bookingEmailManager.sendReschedule(newBooking, oldBooking, reason);
```

**Exemplo de Email:**

```
Seu agendamento foi remarcado

Olá, João Silva!

📅 Data antiga: 25 de Outubro de 2025 às 14:00
📅 Nova data: 27 de Outubro de 2025 às 16:00

Motivo: Solicitação do paciente

[Ver Agendamento]
```

---

### 4. Cancelamento

**Enviado:** Quando agendamento é cancelado

**Conteúdo:**
- ✅ Dados do agendamento cancelado
- ✅ Motivo do cancelamento
- ✅ Link para novo agendamento

**Trigger:**
```javascript
await bookingEmailManager.sendCancellation(booking, reason, cancelledBy);
```

**Exemplo de Email:**

```
Agendamento Cancelado

Olá, João Silva!

Seu agendamento foi cancelado:

📅 Data: 27 de Outubro de 2025
🕐 Horário: 14:00
👨‍⚕️ Profissional: Dra. Maria Santos

Motivo: Conflito de agenda
Cancelado por: Profissional

[Fazer Novo Agendamento]
```

---

### 5. Lembrete (24h antes)

**Enviado:** Automaticamente 24 horas antes da consulta

**Conteúdo:**
- ✅ Lembrete amigável
- ✅ Dados da consulta
- ✅ Link da reunião
- ✅ Checklist de preparação

**Trigger:**
```javascript
await bookingEmailManager.sendReminder(booking, meetingLink);
```

**Exemplo de Email:**

```
Lembrete: Sua consulta é amanhã! ⏰

Olá, João Silva!

Sua consulta está agendada para amanhã:

📅 27 de Outubro de 2025
🕐 14:00
👨‍⚕️ Dra. Maria Santos

🎥 [Entrar na Consulta]
🔐 Senha: 123456

✓ Entre 5 minutos antes
✓ Verifique áudio e vídeo
✓ Use fones de ouvido
```

---

### 6. Agradecimento Pós-Consulta

**Enviado:** Após conclusão do atendimento

**Conteúdo:**
- ✅ Mensagem de agradecimento
- ✅ Link para avaliação
- ✅ Incentivo para novo agendamento

**Trigger:**
```javascript
await bookingEmailManager.sendThankYou(booking);
```

**Exemplo de Email:**

```
Obrigado por confiar em nós! 💚

Olá, João Silva!

Esperamos que sua consulta tenha sido proveitosa!

Sua opinião é muito importante para nós.

[Deixar uma Avaliação]

Precisa de uma nova consulta?
[Agendar Novamente]
```

---

### 7. Recuperação de Senha

**Enviado:** Quando usuário solicita reset de senha

**Conteúdo:**
- ✅ Link seguro para reset (expira em 1h)
- ✅ Instruções claras
- ✅ Aviso se não solicitou

**Trigger:**
```javascript
await emailService.sendPasswordReset(email, resetLink);
```

**Exemplo de Email:**

```
Recuperação de Senha

Olá!

Recebemos uma solicitação para redefinir sua senha.

[Redefinir Senha]

Este link expira em 1 hora.

Se você não solicitou, ignore este email.
```

---

## 💻 Como Usar

### Uso Básico

```javascript
import { bookingEmailManager } from '@/lib/bookingEmailManager';

// Objeto booking completo
const booking = {
  id: 'uuid-123',
  patient_email: 'paciente@email.com',
  patient_name: 'João Silva',
  service: { name: 'Consulta Psicológica' },
  professional: { name: 'Dra. Maria Santos' },
  booking_date: '2025-10-27',
  booking_time: '14:00',
  meeting_link: 'https://zoom.us/j/123456',
  meeting_password: '123456'
};

// ✅ Confirmação de agendamento
await bookingEmailManager.sendConfirmation(booking);

// ✅ Pagamento aprovado (com link Zoom)
await bookingEmailManager.sendApproval(
  booking,
  booking.meeting_link
);

// ✅ Reagendamento
const oldBooking = {
  booking_date: '2025-10-25',
  booking_time: '14:00'
};
await bookingEmailManager.sendReschedule(
  booking,
  oldBooking,
  'Solicitação do paciente'
);

// ✅ Cancelamento
await bookingEmailManager.sendCancellation(
  booking,
  'Conflito de agenda',
  'Paciente'
);

// ✅ Lembrete
await bookingEmailManager.sendReminder(
  booking,
  booking.meeting_link
);

// ✅ Agradecimento
await bookingEmailManager.sendThankYou(booking);
```

### Uso Direto (emailService)

```javascript
import emailService from '@/lib/emailService';

// Enviar email customizado
await emailService.send({
  to: 'paciente@email.com',
  subject: 'Assunto do Email',
  html: '<h1>Conteúdo HTML</h1>',
  text: 'Conteúdo texto plano' // Opcional
});

// Recuperação de senha
await emailService.sendPasswordReset(
  'usuario@email.com',
  'https://novo.doxologos.com.br/reset-password?token=abc123'
);
```

---

## 🏗️ Arquitetura

### Estrutura de Arquivos

```
src/lib/
├── emailService.js          # Core service (Nodemailer)
├── emailTemplates.js        # HTML templates
└── bookingEmailManager.js   # High-level helpers

supabase/functions/
└── send-email/              # Edge Function
    └── index.ts
```

### Fluxo de Envio

```
┌──────────────────┐
│   Frontend       │
│ (React Component)│
└────────┬─────────┘
         │
         │ bookingEmailManager.sendConfirmation(booking)
         ▼
┌──────────────────┐
│ bookingEmail     │
│   Manager        │────► Formata dados do booking
└────────┬─────────┘
         │
         │ emailService.send({ to, subject, html })
         ▼
┌──────────────────┐
│  emailService    │────► Valida e prepara request
└────────┬─────────┘
         │
         │ POST /functions/v1/send-email
         ▼
┌──────────────────┐
│  Edge Function   │────► Autentica com SERVICE_ROLE_KEY
│   send-email     │
└────────┬─────────┘
         │
         │ nodemailer.sendMail()
         ▼
┌──────────────────┐
│  SMTP Hostinger  │────► smtp.hostinger.com:587
│  (TLS)           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Destinatário    │
└──────────────────┘
```

### emailTemplates.js (Classe)

```javascript
class EmailTemplates {
  constructor() {
    this.brandColor = "#2d8659";
    
    // 🔧 FIX: Não usar localhost em produção
    const currentOrigin = typeof window !== 'undefined' 
      ? window.location.origin 
      : '';
    const isLocalhost = currentOrigin.includes('localhost') 
      || currentOrigin.includes('127.0.0.1');
    
    this.baseUrl = import.meta.env.VITE_APP_URL 
      || (!isLocalhost && currentOrigin) 
      || 'https://novo.doxologos.com.br';
  }

  // Métodos de template
  bookingConfirmation(data) { /* ... */ }
  paymentApproved(data) { /* ... */ }
  bookingRescheduled(data) { /* ... */ }
  bookingCancelled(data) { /* ... */ }
  bookingReminder(data) { /* ... */ }
  thankYou(data) { /* ... */ }
  passwordReset(data) { /* ... */ }
}
```

### Edge Function: send-email

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createTransport } from 'npm:nodemailer@6.9.7';

serve(async (req) => {
  // Verificar autenticação
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { to, subject, html, text } = await req.json();

  // Configurar transporter
  const transporter = createTransport({
    host: Deno.env.get('SMTP_HOST'),
    port: Number(Deno.env.get('SMTP_PORT')),
    secure: Deno.env.get('SMTP_SECURE') === 'true',
    auth: {
      user: Deno.env.get('SMTP_USER'),
      pass: Deno.env.get('SMTP_PASSWORD')
    }
  });

  // Enviar email
  const info = await transporter.sendMail({
    from: `"${Deno.env.get('FROM_NAME')}" <${Deno.env.get('FROM_EMAIL')}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
    replyTo: Deno.env.get('REPLY_TO_EMAIL')
  });

  return new Response(JSON.stringify({
    success: true,
    messageId: info.messageId
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## 🔧 Troubleshooting

### Erro: "Unauthorized" ou "missing sub claim"

**Causa:** Usando ANON_KEY ao invés de SERVICE_ROLE_KEY

**Solução:**
```javascript
// ❌ Errado
const response = await fetch('/functions/v1/send-email', {
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
  }
});

// ✅ Correto (via emailService)
// emailService.js já usa SERVICE_ROLE_KEY automaticamente
await emailService.send({ to, subject, html });
```

### Erro: "SMTP Authentication Failed"

**Causa:** Credenciais SMTP incorretas

**Solução:**
1. Verificar secrets no Supabase
2. Testar credenciais via telnet:
```bash
telnet smtp.hostinger.com 587
```

### Email não chega

**Possíveis causas:**

1. **Email na caixa de SPAM**
   - Verificar pasta de spam do destinatário
   - Configurar SPF/DKIM no Hostinger

2. **Email inválido**
   - Validar formato do email
   - Verificar logs da Edge Function

3. **Rate limit do SMTP**
   - Hostinger limita envios (verificar plano)
   - Implementar fila de emails se necessário

### Links apontam para localhost

**Causa:** baseUrl usando window.location.origin em desenvolvimento

**Solução:** Já corrigido em emailTemplates.js:
```javascript
// Detecta localhost e usa produção
const isLocalhost = currentOrigin.includes('localhost');
this.baseUrl = !isLocalhost && currentOrigin 
  || 'https://novo.doxologos.com.br';
```

### Email com formatação quebrada

**Causa:** Cliente de email não suporta CSS externo

**Solução:** Templates já usam **CSS inline** para máxima compatibilidade:
```javascript
<div style="background-color: #2d8659; padding: 20px;">
  ...
</div>
```

---

## 📚 Referências

- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Hostinger SMTP Settings](https://support.hostinger.com/en/articles/1583218-how-to-use-hostinger-smtp)
- [HTML Email Best Practices](https://www.campaignmonitor.com/css/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Última atualização**: 28/01/2025 | [Voltar ao Índice](../README.md)
