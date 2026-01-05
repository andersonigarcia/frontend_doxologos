# 📊 Sistema de Logs e Monitoramento

> **Status**: ✅ Implementado  
> **Library**: Custom logging service

---

## 📋 Funcionalidades

- ✅ Logs estruturados (JSON)
- ✅ Níveis: DEBUG, INFO, WARN, ERROR
- ✅ Context automático (user, page, timestamp)
- ✅ Integração com Supabase
- ✅ Filtragem por nível/categoria

---

## 💻 Como Usar

### Importar Logger

```javascript
import logger from '@/lib/logger';

// Log simples
logger.info('Usuário fez login');

// Log com dados
logger.info('Pagamento processado', {
  payment_id: '123',
  amount: 150.00,
  method: 'pix'
});

// Log de erro
logger.error('Erro ao processar pagamento', {
  error: err.message,
  stack: err.stack,
  payment_id: '123'
});

// Log de debug (só em dev)
logger.debug('Variável X:', { x: value });

// Log de warning
logger.warn('Tentativa de acesso não autorizado', {
  user_id: userId,
  resource: '/admin'
});
```

### Categorias

```javascript
// Categoria específica
logger.payment.info('PIX gerado', { qr_code: '...' });
logger.auth.warn('Login falhou', { email });
logger.booking.error('Erro ao criar agendamento', { error });

// Categorias disponíveis:
// - logger.payment
// - logger.auth
// - logger.booking
// - logger.email
// - logger.zoom
```

---

## 🗄️ Estrutura no Banco

### Tabela: `logs`

```sql
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level TEXT NOT NULL, -- DEBUG, INFO, WARN, ERROR
  category TEXT, -- payment, auth, booking, etc
  message TEXT NOT NULL,
  data JSONB,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  page_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_category ON logs(category);
CREATE INDEX idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX idx_logs_user_id ON logs(user_id);
```

---

## 📊 Consultas Úteis

### Erros das últimas 24h

```sql
SELECT 
  category,
  message,
  data,
  created_at
FROM logs
WHERE level = 'ERROR'
  AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Logs de um usuário

```sql
SELECT 
  level,
  category,
  message,
  data,
  created_at
FROM logs
WHERE user_id = 'USER_ID_AQUI'
ORDER BY created_at DESC
LIMIT 100;
```

### Estatísticas por nível

```sql
SELECT 
  level,
  COUNT(*) as total
FROM logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY level
ORDER BY total DESC;
```

### Logs de pagamentos com erro

```sql
SELECT 
  message,
  data->>'payment_id' as payment_id,
  data->>'error' as error,
  created_at
FROM logs
WHERE category = 'payment'
  AND level = 'ERROR'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## 🔧 Configuração

### Environment Variables

```bash
# Habilitar logs detalhados (dev)
VITE_LOG_LEVEL=DEBUG

# Produção (apenas INFO, WARN, ERROR)
VITE_LOG_LEVEL=INFO
```

### logger.js (Configuração)

```javascript
class Logger {
  constructor() {
    this.level = import.meta.env.VITE_LOG_LEVEL || 'INFO';
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }

  async log(level, category, message, data = {}) {
    if (!this.shouldLog(level)) return;

    const logEntry = {
      level,
      category,
      message,
      data,
      user_id: this.getUserId(),
      user_email: this.getUserEmail(),
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Console (dev)
    if (import.meta.env.DEV) {
      const color = {
        DEBUG: 'color: gray',
        INFO: 'color: blue',
        WARN: 'color: orange',
        ERROR: 'color: red'
      }[level];

      console.log(`%c[${level}] ${category}: ${message}`, color, data);
    }

    // Enviar para Supabase (prod)
    if (import.meta.env.PROD && level !== 'DEBUG') {
      await this.sendToSupabase(logEntry);
    }
  }

  async sendToSupabase(logEntry) {
    try {
      await supabase.from('logs').insert(logEntry);
    } catch (err) {
      console.error('Erro ao salvar log:', err);
    }
  }

  // Métodos públicos
  debug(message, data) { this.log('DEBUG', null, message, data); }
  info(message, data) { this.log('INFO', null, message, data); }
  warn(message, data) { this.log('WARN', null, message, data); }
  error(message, data) { this.log('ERROR', null, message, data); }

  // Categorias
  payment = {
    info: (msg, data) => this.log('INFO', 'payment', msg, data),
    error: (msg, data) => this.log('ERROR', 'payment', msg, data)
  };

  auth = {
    info: (msg, data) => this.log('INFO', 'auth', msg, data),
    warn: (msg, data) => this.log('WARN', 'auth', msg, data)
  };

  // ... outras categorias
}

export default new Logger();
```

---

## 🚨 Alertas Automáticos

### Edge Function: check-errors

```typescript
// Executar a cada hora via cron
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Buscar erros da última hora
  const { data: errors } = await supabase
    .from('logs')
    .select('*')
    .eq('level', 'ERROR')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());

  // Se houver muitos erros, enviar alerta
  if (errors && errors.length > 10) {
    await sendEmailAlert({
      subject: `⚠️ ${errors.length} erros detectados`,
      body: `Verifique os logs: ${errors.map(e => e.message).join(', ')}`
    });
  }

  return new Response('OK', { status: 200 });
});
```

---

**Última atualização**: 28/01/2025 | [Voltar ao Índice](../README.md)
