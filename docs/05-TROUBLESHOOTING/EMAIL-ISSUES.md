# 📧 Problemas com Emails

> **Guia para troubleshooting do sistema de emails**

---

## ❌ Email não enviado

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
import emailService from '@/lib/emailService';
await emailService.send({ to, subject, html });
// emailService.js já usa SERVICE_ROLE_KEY automaticamente
```

### Erro: "SMTP Authentication Failed"

**Causa:** Credenciais SMTP incorretas

**Solução:**
1. Verificar secrets no Supabase:
```bash
supabase secrets list
```

2. Testar credenciais via telnet:
```bash
telnet smtp.hostinger.com 587
# Deve conectar sem erro
```

3. Reconfigurar secrets:
```bash
supabase secrets set SMTP_USER=doxologos@doxologos.com.br
supabase secrets set SMTP_PASSWORD=sua_senha
```

### Erro: "Connection timeout"

**Causa:** Porta SMTP bloqueada ou incorreta

**Solução:**
```bash
# Testar portas
telnet smtp.hostinger.com 587  # TLS
telnet smtp.hostinger.com 465  # SSL
telnet smtp.hostinger.com 25   # Plain (geralmente bloqueada)

# Usar porta 587 (TLS)
SMTP_PORT=587
SMTP_SECURE=false
```

---

## 📬 Email não chega

### Email na caixa de SPAM

**Causa:** Falta de SPF/DKIM

**Solução:**
1. Configurar SPF no DNS (Hostinger):
```
Tipo: TXT
Nome: @
Valor: v=spf1 include:_spf.hostinger.com ~all
```

2. Configurar DKIM no DNS:
```
Tipo: TXT
Nome: default._domainkey
Valor: (fornecido pela Hostinger)
```

3. Melhorar conteúdo do email:
- Evitar palavras como "grátis", "promoção"
- Incluir endereço físico no rodapé
- Permitir unsubscribe

### Email para destinatário inválido

**Solução:**
```javascript
// Validar email antes de enviar
const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

if (!isValidEmail(to)) {
  throw new Error('Email inválido');
}
```

### Rate limit atingido

**Causa:** Hostinger limita envios por hora/dia

**Solução:**
1. Verificar limites do plano Hostinger
2. Implementar fila de emails:
```javascript
// Usar tabela email_queue
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

// Edge Function processa fila gradualmente
```

---

## 🔗 Links no email

### Links apontam para localhost

**Causa:** baseUrl usando `window.location.origin` em dev

**Solução:** Já corrigido em `emailTemplates.js`:
```javascript
constructor() {
  const currentOrigin = typeof window !== 'undefined' 
    ? window.location.origin 
    : '';
  const isLocalhost = currentOrigin.includes('localhost') 
    || currentOrigin.includes('127.0.0.1');
  
  // Usa produção se for localhost
  this.baseUrl = import.meta.env.VITE_APP_URL 
    || (!isLocalhost && currentOrigin) 
    || 'https://novo.doxologos.com.br';
}
```

### Links quebrados

**Solução:**
```javascript
// Sempre usar baseUrl
const link = `${this.baseUrl}/area-do-paciente?booking_id=${bookingId}`;

// Não usar paths relativos
// ❌ const link = '/area-do-paciente';
```

---

## 🎨 Formatação

### CSS não aplicado

**Causa:** Cliente de email não suporta CSS externo

**Solução:** Usar **CSS inline**:
```javascript
// ❌ Não funciona
<style>.button { background: blue; }</style>
<a class="button">Clique</a>

// ✅ Funciona
<a style="background-color: blue; padding: 10px; color: white;">
  Clique
</a>
```

### Imagens não aparecem

**Causa:** URL relativa ou HTTPS inválido

**Solução:**
```javascript
// ✅ URL absoluta com HTTPS
<img src="https://novo.doxologos.com.br/logo.png" alt="Logo" />

// ❌ URL relativa
<img src="/logo.png" alt="Logo" />
```

### Layout quebrado no Outlook

**Solução:** Usar tabelas ao invés de divs:
```html
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding: 20px;">
      Conteúdo aqui
    </td>
  </tr>
</table>
```

---

## 🔍 Debug

### Ver logs de envio

```bash
# Logs da Edge Function
supabase functions logs send-email --limit 50

# Filtrar por erro
supabase functions logs send-email | grep ERROR
```

### Testar envio manual

```javascript
// Console do browser
import emailService from '@/lib/emailService';

await emailService.send({
  to: 'seu-email@test.com',
  subject: 'Teste',
  html: '<h1>Email de teste</h1>'
});
```

### Query de emails enviados

```sql
-- Se houver tabela de log de emails
SELECT 
  to_email,
  subject,
  status,
  created_at,
  error_message
FROM email_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 📊 Monitoramento

### Taxa de entrega

```sql
-- Se implementado email_queue
SELECT 
  status,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM email_queue
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY status;
```

### Emails mais enviados

```sql
SELECT 
  subject,
  COUNT(*) as total
FROM email_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY subject
ORDER BY total DESC
LIMIT 10;
```

---

**Última atualização**: 28/01/2025 | [Voltar ao Índice](../README.md)
