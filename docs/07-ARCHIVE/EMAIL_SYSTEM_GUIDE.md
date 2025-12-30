# 📧 Sistema de E-mails - Doxologos

## Visão Geral

Sistema completo de envio de e-mails utilizando SMTP da Hostinger, implementado de forma modular, testável e seguindo as melhores práticas.

---

## ✅ Etapa 1: Configuração - CONCLUÍDA

### Arquivos Criados

1. **`src/lib/emailService.js`**
   - Serviço principal de envio de e-mails
   - Gerencia conexão SMTP
   - Validação de configurações
   - Logs e tratamento de erros

2. **`functions/send-email/index.js`**
   - Função serverless para backend
   - Compatível com Netlify/Vercel
   - Integração com nodemailer

3. **`src/lib/emailTemplates.js`**
   - 6 templates responsivos e acessíveis
   - Design consistente e profissional
   - Otimizado para diversos clientes de e-mail

4. **`src/lib/bookingEmailManager.js`**
   - Helper para facilitar envio de e-mails
   - Métodos específicos para cada tipo de e-mail
   - Formatação automática de datas

---

## 🔧 Configuração

### 1. Variáveis de Ambiente

**IMPORTANTE**: O sistema utiliza `VITE_SUPABASE_SERVICE_ROLE_KEY` para autenticação nas Edge Functions.
A `VITE_SUPABASE_ANON_KEY` não possui as permissões necessárias e gera erro `"missing sub claim"`.

Adicione em `config/local.env`:

```bash
# Supabase - SERVICE_ROLE_KEY obrigatória para envio de e-mails
VITE_SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# SMTP Hostinger
VITE_SMTP_HOST=smtp.hostinger.com
VITE_SMTP_PORT=587
VITE_SMTP_SECURE=false
VITE_SMTP_USER=doxologos@doxologos.com.br
VITE_SMTP_PASSWORD=sua_senha_smtp_aqui
VITE_FROM_EMAIL=doxologos@doxologos.com.br
VITE_FROM_NAME=Doxologos Psicologia
VITE_REPLY_TO_EMAIL=doxologos@doxologos.com.br
VITE_ENABLE_EMAIL_NOTIFICATIONS=true

# Frontend (para validação)
VITE_SMTP_FROM_NAME=Doxologos
VITE_SMTP_FROM_EMAIL=noreply@seudominio.com
```

### 2. Instalação de Dependências

```bash
npm install nodemailer
```

### 3. Como Obter Credenciais SMTP da Hostinger

1. Acesse o painel da Hostinger
2. Vá em **E-mail** → **Gerenciar**
3. Selecione sua conta de e-mail
4. Anote as credenciais SMTP:
   - **Servidor:** smtp.hostinger.com
   - **Porta:** 465 (SSL) ou 587 (TLS)
   - **Usuário:** seu-email@dominio.com
   - **Senha:** sua senha de e-mail

---

## 📋 Templates Disponíveis

### 1. **Confirmação de Agendamento**
- Enviado imediatamente após criar agendamento
- Contém detalhes completos do agendamento
- Link para área do paciente

### 2. **Pagamento Aprovado**
- Enviado após confirmação de pagamento
- Inclui link da reunião (se disponível)
- Checklist de preparação

### 3. **Agendamento Reagendado**
- Mostra data antiga (riscada) e nova data
- Motivo do reagendamento (se fornecido)
- Link para visualizar agendamento

### 4. **Agendamento Cancelado**
- Informações do agendamento cancelado
- Motivo do cancelamento (se fornecido)
- Link para novo agendamento

### 5. **Lembrete (24h antes)**
- Enviado automaticamente 24h antes
- Link da reunião
- Checklist de preparação

### 6. **Agradecimento**
- Enviado após conclusão do atendimento
- Link para deixar avaliação
- Incentivo para novo agendamento

---

## 💻 Como Usar

### Uso Básico

```javascript
import { bookingEmailManager } from '@/lib/bookingEmailManager';

// Exemplo de agendamento
const booking = {
  patient_email: 'paciente@email.com',
  patient_name: 'João Silva',
  service: { name: 'Consulta Psicológica' },
  professional: { name: 'Dra. Maria Santos' },
  booking_date: '2025-10-27',
  booking_time: '14:00',
  id: 'abc123'
};

// Enviar confirmação
await bookingEmailManager.sendConfirmation(booking);

// Enviar aprovação (com link da reunião)
await bookingEmailManager.sendApproval(booking, 'https://zoom.us/j/123456');

// Enviar reagendamento
const oldBooking = { booking_date: '2025-10-25', booking_time: '14:00' };
await bookingEmailManager.sendReschedule(booking, oldBooking, 'Solicitação do paciente');

// Enviar cancelamento
await bookingEmailManager.sendCancellation(booking, 'Conflito de agenda', 'Paciente');

// Enviar lembrete
await bookingEmailManager.sendReminder(booking, 'https://zoom.us/j/123456');

// Enviar agradecimento
await bookingEmailManager.sendThankYou(booking);
```

### Uso Direto do Serviço

```javascript
import { emailService } from '@/lib/emailService';

// Enviar e-mail personalizado
const result = await emailService.send({
  to: 'paciente@email.com',
  subject: 'Assunto do E-mail',
  html: '<h1>Conteúdo HTML</h1><p>Seu conteúdo aqui...</p>',
  text: 'Versão texto puro (fallback)'
});

if (result.success) {
  console.log('E-mail enviado!');
} else {
  console.error('Erro:', result.error);
}
```

---

## 🧪 Testes

### Teste de Configuração

```javascript
import { emailService } from '@/lib/emailService';

// Testar conexão e enviar e-mail de teste
await emailService.testConnection();
```

### Teste em Desenvolvimento

Em modo de desenvolvimento (`npm run dev`), os e-mails são apenas logados no console, não são enviados de verdade. Isso evita custos desnecessários e spam durante testes.

---

## 🎨 Personalização de Templates

### Modificar Template Existente

Edite `src/lib/emailTemplates.js`:

```javascript
export const bookingConfirmation = ({
  patientName,
  serviceName,
  // ... outros parâmetros
}) => {
  const content = `
    <h1>Seu título personalizado</h1>
    <p>Olá <strong>${patientName}</strong>,</p>
    <!-- Seu conteúdo HTML aqui -->
  `;
  
  return baseTemplate(content, 'Título do E-mail');
};
```

### Criar Novo Template

```javascript
export const meuNovoTemplate = (dados) => {
  const content = `
    <!-- Seu conteúdo aqui -->
  `;
  
  return baseTemplate(content, 'Título');
};
```

---

## 🔒 Segurança

### Boas Práticas Implementadas

✅ **Credenciais Seguras**
- Nunca comitar `.env` com credenciais reais
- Usar variáveis de ambiente
- Rotacionar senhas periodicamente

✅ **Validação de Entrada**
- Todos os campos são validados
- Sanitização de HTML
- Proteção contra XSS

✅ **Rate Limiting**
- Implementar no backend para evitar abuso
- Monitorar tentativas de envio

✅ **Logs**
- Registrar tentativas de envio
- Não logar conteúdo sensível
- Usar sistema de logging centralizado

---

## 🚀 Deploy

### Netlify

1. Configure as variáveis de ambiente no dashboard:
   - Settings → Environment Variables
   - Adicione todas as variáveis `SMTP_*`

2. A função em `functions/send-email/` será deployada automaticamente

### Vercel

1. Configure as variáveis:
   - Settings → Environment Variables
   - Adicione variáveis `SMTP_*`

2. Crie `api/send-email.js`:

```javascript
import { handler } from '../functions/send-email/index.js';

export default async function(req, res) {
  const event = {
    httpMethod: req.method,
    body: JSON.stringify(req.body)
  };
  
  const result = await handler(event, {});
  const response = JSON.parse(result.body);
  
  return res.status(result.statusCode).json(response);
}
```

### Hostinger

1. Configure variáveis no `.htaccess` ou painel
2. Use PHP ou Node.js backend
3. Certifique-se de que o SMTP está acessível

---

## 📊 Monitoramento

### Métricas Importantes

- Taxa de entrega (delivery rate)
- Taxa de abertura (open rate)
- Taxa de cliques (click-through rate)
- Bounces e rejeições

### Logs

Todos os e-mails são logados com:
- Timestamp
- Destinatário
- Assunto
- Status (sucesso/erro)
- ID da mensagem

---

## 🐛 Troubleshooting

### E-mail não enviado

1. ✅ Verificar credenciais SMTP
2. ✅ Testar conexão: `emailService.testConnection()`
3. ✅ Verificar logs no console
4. ✅ Verificar firewall/porta 465 ou 587

### E-mail vai para spam

1. ✅ Configurar SPF, DKIM, DMARC no domínio
2. ✅ Usar domínio verificado
3. ✅ Evitar palavras de spam no assunto
4. ✅ Incluir link de descadastro

### Templates não renderizam

1. ✅ Testar em diferentes clientes (Gmail, Outlook, etc)
2. ✅ Validar HTML em ferramenta online
3. ✅ Verificar inline CSS
4. ✅ Testar responsividade

---

## 📝 Checklist de Produção

Antes de colocar em produção:

- [ ] Credenciais SMTP configuradas
- [ ] Variáveis de ambiente no servidor
- [ ] `nodemailer` instalado
- [ ] Função backend deployada
- [ ] Teste de envio real executado
- [ ] SPF/DKIM configurados no domínio
- [ ] Monitoramento ativo
- [ ] Logs funcionando
- [ ] Rate limiting implementado
- [ ] Backup das configurações

---

## 🆘 Suporte

Para problemas ou dúvidas:

1. Verificar logs do sistema
2. Consultar documentação do Hostinger
3. Testar com `emailService.testConnection()`
4. Verificar configurações SMTP

---

## 📚 Próximos Passos

### Melhorias Futuras

1. **Agendamento de E-mails**
   - Lembretes automáticos 24h antes
   - Follow-ups após atendimento

2. **Templates Avançados**
   - Personalização por tipo de serviço
   - Templates para profissionais

3. **Analytics**
   - Tracking de aberturas
   - Tracking de cliques
   - Relatórios de performance

4. **Automação**
   - Webhooks do Supabase
   - Cron jobs para lembretes
   - Integração com calendário

---

**Status Atual:** ✅ Sistema Completo e Pronto para Uso  
**Última Atualização:** 26 de Outubro de 2025  
**Versão:** 1.0.0
