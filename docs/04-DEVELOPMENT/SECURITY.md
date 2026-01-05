# 🔒 Segurança - Doxologos

Este documento consolida todas as informações sobre segurança, autenticação e proteção de dados do sistema.

---

## 🎯 Visão Geral

O sistema implementa múltiplas camadas de segurança:
- ✅ Row Level Security (RLS) no Supabase
- ✅ Autenticação JWT
- ✅ Validação de entrada
- ✅ HTTPS obrigatório
- ✅ Proteção contra CSRF
- ✅ Rate limiting

---

## 🔐 Autenticação

### Supabase Auth
```javascript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
});

// Logout
await supabase.auth.signOut();

// Verificar sessão
const { data: { session } } = await supabase.auth.getSession();
```

### Recuperação de Senha
- ✅ Email de reset implementado
- ✅ Token expira em 1 hora
- ✅ Link único por solicitação

---

## 🛡️ Row Level Security (RLS)

### Políticas Implementadas

#### Tabela: bookings
```sql
-- Pacientes veem apenas seus agendamentos
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (
    auth.uid()::text = patient_id OR
    (SELECT role FROM user_metadata WHERE user_id = auth.uid()) = 'admin'
  );

-- Profissionais veem agendamentos com eles
CREATE POLICY "Professionals can view their bookings" ON bookings
  FOR SELECT USING (
    professional_id = auth.uid() OR
    (SELECT role FROM user_metadata WHERE user_id = auth.uid()) = 'admin'
  );
```

#### Tabela: payments
```sql
-- Apenas admins e donos veem pagamentos
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (
    user_id = auth.uid() OR
    (SELECT role FROM user_metadata WHERE user_id = auth.uid()) = 'admin'
  );

-- Apenas sistema pode inserir
CREATE POLICY "System can insert payments" ON payments
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
  );
```

#### Tabela: professionals
```sql
-- Todos podem ver profissionais
CREATE POLICY "Anyone can view professionals" ON professionals
  FOR SELECT USING (true);

-- Apenas admins podem editar
CREATE POLICY "Admins can update professionals" ON professionals
  FOR UPDATE USING (
    (SELECT role FROM user_metadata WHERE user_id = auth.uid()) = 'admin'
  );
```

---

## 🔒 Validação de Entrada

### Frontend
```javascript
// Validação de email
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Sanitização de input
const sanitizeInput = (input) => {
  return input.trim().replace(/[<>]/g, '');
};

// Validação de CPF
const isValidCPF = (cpf) => {
  cpf = cpf.replace(/[^\d]/g, '');
  if (cpf.length !== 11) return false;
  // Lógica de validação...
};
```

### Backend (Edge Functions)
```typescript
// Validação de payload
const validatePayload = (data: any) => {
  if (!data.booking_id || typeof data.booking_id !== 'string') {
    throw new Error('Invalid booking_id');
  }
  if (!data.amount || data.amount <= 0) {
    throw new Error('Invalid amount');
  }
};
```

---

## 🚫 Proteção contra Ataques

### SQL Injection
✅ **Protegido**: Supabase usa prepared statements automaticamente

```javascript
// SEGURO
const { data } = await supabase
  .from('bookings')
  .select('*')
  .eq('id', bookingId);

// NUNCA FAÇA (exemplo de código inseguro)
const query = `SELECT * FROM bookings WHERE id = '${bookingId}'`;
```

### XSS (Cross-Site Scripting)
✅ **Protegido**: React escapa automaticamente

```jsx
// SEGURO - React escapa automaticamente
<div>{userInput}</div>

// PERIGOSO - Evitar dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### CSRF (Cross-Site Request Forgery)
✅ **Protegido**: Tokens JWT no header

```javascript
// Headers automáticos do Supabase
const headers = {
  'Authorization': `Bearer ${session.access_token}`,
  'apikey': SUPABASE_ANON_KEY
};
```

---

## 🔑 Gestão de Secrets

### Variáveis de Ambiente
```bash
# .env (NUNCA commitar)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
MP_ACCESS_TOKEN=APP_USR-xxx
SMTP_PASSWORD=xxx
```

### Supabase Secrets
```bash
# Configurar secrets
supabase secrets set MP_ACCESS_TOKEN=xxx
supabase secrets set FRONTEND_URL=https://novo.doxologos.com.br

# Listar secrets
supabase secrets list
```

---

## 📊 Auditoria de Segurança

### Checklist de Segurança
- [x] RLS habilitado em todas as tabelas
- [x] Políticas de acesso configuradas
- [x] Validação de entrada no frontend
- [x] Validação de entrada no backend
- [x] HTTPS obrigatório
- [x] Secrets não expostos no código
- [x] Logs de acesso implementados
- [x] Rate limiting em APIs críticas
- [x] Backup automático do banco
- [x] Recuperação de senha segura

### Vulnerabilidades Corrigidas
1. ✅ **Exposição de tokens**: Movidos para variáveis de ambiente
2. ✅ **RLS não habilitado**: Políticas criadas para todas as tabelas
3. ✅ **Validação fraca**: Validação robusta implementada
4. ✅ **Logs insuficientes**: Sistema de logs estruturados criado

---

## 🔍 Monitoramento

### Logs de Segurança
```javascript
// Registrar tentativas de login
await supabase.from('security_logs').insert({
  event_type: 'login_attempt',
  user_email: email,
  success: !!data,
  ip_address: req.headers['x-forwarded-for'],
  timestamp: new Date()
});

// Registrar acessos não autorizados
await supabase.from('security_logs').insert({
  event_type: 'unauthorized_access',
  resource: '/admin',
  user_id: userId,
  timestamp: new Date()
});
```

### Alertas
- 🚨 Múltiplas tentativas de login falhadas
- 🚨 Acesso a recursos não autorizados
- 🚨 Mudanças em dados sensíveis
- 🚨 Erros de validação frequentes

---

## 🛠️ Melhorias Implementadas

### Autenticação
- ✅ Senha mínima de 8 caracteres
- ✅ Bloqueio após 5 tentativas falhas
- ✅ Token de sessão expira em 24h
- ✅ Refresh token automático

### Autorização
- ✅ Roles: admin, professional, patient
- ✅ Permissões granulares por recurso
- ✅ Verificação de role em cada request

### Dados Sensíveis
- ✅ Senhas hasheadas (bcrypt)
- ✅ Tokens JWT assinados
- ✅ Dados de pagamento não armazenados
- ✅ PII (Personally Identifiable Information) protegido

---

## 📋 Compliance

### LGPD (Lei Geral de Proteção de Dados)
- ✅ Consentimento explícito para coleta de dados
- ✅ Direito ao esquecimento implementado
- ✅ Portabilidade de dados
- ✅ Política de privacidade clara

### PCI DSS (Payment Card Industry)
- ✅ Não armazenamos dados de cartão
- ✅ Tokenização via Mercado Pago
- ✅ Comunicação HTTPS obrigatória

---

## 🚀 Próximos Passos

### Melhorias Planejadas
- [ ] Autenticação de dois fatores (2FA)
- [ ] Biometria para mobile
- [ ] Auditoria de segurança externa
- [ ] Penetration testing
- [ ] WAF (Web Application Firewall)

---

**Última atualização**: 30 de Dezembro de 2025
