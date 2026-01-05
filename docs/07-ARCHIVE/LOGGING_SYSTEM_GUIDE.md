# Sistema de Logs Configurável - Doxologos

## 📊 Visão Geral

Sistema de logs com níveis configuráveis para controlar a quantidade de informações exibidas em produção, permitindo debug rápido sem redeploy.

---

## 🎯 Níveis de Log

| Nível | Valor | Descrição | Uso |
|-------|-------|-----------|-----|
| **SILENT** | 0 | Sem logs (exceto erros críticos) | Produção padrão |
| **ERROR** | 1 | Apenas erros críticos | Produção com problemas |
| **WARN** | 2 | Erros + Avisos | Investigação de warnings |
| **INFO** | 3 | Erros + Avisos + Informações | Monitoramento ativo |
| **DEBUG** | 4 | Todos os logs detalhados | Debug completo |

---

## 🔧 Configuração

### 1. Via Variável de Ambiente (Build Time)

Adicione no arquivo `.env`:

```bash
# .env
VITE_LOG_LEVEL=SILENT  # Produção
VITE_LOG_LEVEL=INFO    # Staging
VITE_LOG_LEVEL=DEBUG   # Desenvolvimento
```

**Builds recomendados**:
```bash
# Produção
VITE_LOG_LEVEL=SILENT npm run build

# Staging
VITE_LOG_LEVEL=INFO npm run build

# Desenvolvimento
npm run dev  # DEBUG por padrão
```

---

### 2. Via localStorage (Runtime - Mais Flexível!)

Permite ativar/desativar logs **em produção** sem redeploy:

```javascript
// No console do navegador (F12)
localStorage.setItem('doxologos_log_level', 'DEBUG');
location.reload();  // Recarregar página
```

**Níveis válidos**: `'SILENT'`, `'ERROR'`, `'WARN'`, `'INFO'`, `'DEBUG'`

---

### 3. Via Comandos Globais (Mais Rápido!)

Comandos disponíveis no console do navegador:

```javascript
// Ativar debug completo
window.enableDebugLogs();

// Ativar logs informativos
window.enableInfoLogs();

// Desativar logs (SILENT)
window.disableLogs();

// Mudar nível manualmente
window.setLogLevel('INFO');

// Ver nível atual
window.getLogLevel();  // Retorna: "DEBUG", "INFO", etc.

// Ver logs capturados
window.viewLogs();  // Exibe em tabela

// Baixar logs para análise
window.downloadLogs();  // Baixa JSON
```

---

## 📝 Uso no Código

### Importar Logger

```javascript
import { logger } from '@/lib/logger';
```

### Métodos Disponíveis

#### 1. Logs Básicos

```javascript
// ERROR (nível 1) - Sempre capturado no buffer
logger.error('Erro ao processar pagamento', error, { 
  orderId: '123',
  userId: 'user456' 
});

// WARN (nível 2)
logger.warn('Token expirando em breve', { 
  expiresIn: '5min' 
});

// INFO (nível 3)
logger.info('Usuário logado com sucesso', { 
  userId: 'user123' 
});

// DEBUG (nível 4)
logger.debug('State atualizado', { 
  newState: {...} 
});

// SUCCESS (INFO level)
logger.success('Agendamento criado', { 
  bookingId: '789' 
});
```

#### 2. Logs Especializados

```javascript
// API calls
logger.api('POST', '/api/bookings', 200, { 
  bookingId: '123' 
});

// Autenticação
logger.auth('Login successful', 'user123');

// Pagamento
logger.payment('Payment confirmed', 'order456', 150.00);

// Navegação
logger.navigation('/home', '/agendamento');

// Performance
logger.performance('API call duration', 234, 'ms');

// API Error
logger.apiError('fetch_bookings', error, { 
  filters: {...} 
});
```

#### 3. Timer de Performance

```javascript
const timer = logger.startTimer('Fetch bookings');

// ... operação assíncrona
await fetchBookings();

const duration = timer.end();  // Loga automaticamente
console.log(`Took ${duration}ms`);
```

#### 4. Batch Logging (reduz spam)

```javascript
logger.batch('User Session', {
  userId: 'user123',
  sessionDuration: '15min',
  pagesVisited: 5,
  lastAction: 'checkout'
});
```

---

## 🚀 Cenários de Uso

### Cenário 1: Produção Normal (SILENT)

```javascript
// Em produção, nível SILENT por padrão
logger.info('User clicked button');  // ❌ Não loga
logger.debug('State updated');       // ❌ Não loga
logger.error('Payment failed', err); // ✅ Loga (sempre)
```

**Buffer captura**: Apenas erros críticos (últimos 100)

---

### Cenário 2: Investigando Bug em Produção (INFO)

Cliente reporta problema. No console:

```javascript
window.enableInfoLogs();  // Ativa INFO
// Ou
window.setLogLevel('INFO');
```

Agora você vê:
```javascript
logger.info('User clicked button');  // ✅ Loga
logger.debug('State updated');       // ❌ Não loga (ainda DEBUG)
logger.error('Payment failed', err); // ✅ Loga
```

**Buffer captura**: Erros + Avisos + Infos (últimos 100)

---

### Cenário 3: Debug Completo em Produção (DEBUG)

Problema complexo. Precisa de tudo:

```javascript
window.enableDebugLogs();
```

Agora você vê **TUDO**:
```javascript
logger.info('User clicked button');  // ✅ Loga
logger.debug('State updated');       // ✅ Loga
logger.error('Payment failed', err); // ✅ Loga
```

**Buffer captura**: Tudo (últimos 100 logs)

---

### Cenário 4: Analisar Logs Capturados

```javascript
// Ver no console
window.viewLogs();  // Exibe tabela interativa

// Baixar para análise
window.downloadLogs();  // Baixa doxologos-logs-2025-10-28.json
```

---

## 📦 Exemplo Completo

### Componente com Logs

```javascript
import { logger } from '@/lib/logger';

const CheckoutPage = () => {
  const handlePayment = async (paymentData) => {
    const timer = logger.startTimer('Payment processing');
    
    try {
      logger.info('Payment initiated', { 
        amount: paymentData.amount,
        method: paymentData.method 
      });
      
      logger.debug('Payment data', paymentData);  // Só DEBUG
      
      const response = await processPayment(paymentData);
      
      logger.api('POST', '/api/payments', response.status, {
        orderId: response.orderId
      });
      
      logger.payment('Payment successful', response.orderId, paymentData.amount);
      logger.success('Payment completed');
      
      timer.end();  // Loga duração
      
      return response;
      
    } catch (error) {
      logger.error('Payment failed', error, {
        amount: paymentData.amount,
        method: paymentData.method,
        step: 'processing'
      });
      
      throw error;
    }
  };
  
  return (
    <button onClick={() => handlePayment(data)}>
      Pagar
    </button>
  );
};
```

### Output no Console (DEBUG level)

```
ℹ️ [INFO] Payment initiated {amount: 150, method: 'pix'}
🐛 [DEBUG] Payment data {amount: 150, method: 'pix', ...}
ℹ️ [INFO] API POST /api/payments - Status: 200 {orderId: '123'}
ℹ️ [INFO] Payment: Payment successful {orderId: '123', amount: 150}
✅ [SUCCESS] Payment completed
🐛 [DEBUG] Performance: Payment processing = 234.56ms
```

---

## 🔒 Segurança

### Sanitização Automática

Dados sensíveis são **sempre redactados**:

```javascript
logger.info('User data', {
  name: 'João',
  password: '123456',      // ❌ [REDACTED]
  token: 'abc123',         // ❌ [REDACTED]
  api_key: 'xyz789',       // ❌ [REDACTED]
  authorization: 'Bearer', // ❌ [REDACTED]
  email: 'joao@email.com'  // ✅ Visível
});
```

**Palavras-chave bloqueadas**: `password`, `token`, `key`, `secret`, `authorization`, `api_key`

---

## 📊 Monitoramento

### Ver Estado do Logger

```javascript
const info = logger.getInfo();
console.log(info);
```

**Output**:
```javascript
{
  currentLevel: "INFO",
  currentLevelValue: 3,
  environment: "production",
  bufferSize: 42,
  maxBufferSize: 100,
  availableLevels: ["SILENT", "ERROR", "WARN", "INFO", "DEBUG"],
  commands: [
    "window.setLogLevel('DEBUG')",
    "window.enableDebugLogs()",
    ...
  ]
}
```

---

## 🎯 Boas Práticas

### ✅ Faça

```javascript
// Use níveis apropriados
logger.error('Critical error', error);     // Erros críticos
logger.warn('Deprecated function used');   // Avisos
logger.info('User logged in');             // Eventos importantes
logger.debug('Component rendered');        // Detalhes técnicos

// Adicione contexto
logger.error('Payment failed', error, {
  orderId: '123',
  userId: 'user456',
  amount: 150
});

// Use métodos especializados
logger.api('POST', '/api/bookings', 200);
logger.auth('Login', 'user123');
logger.payment('Confirmed', 'order456', 150);
```

### ❌ Evite

```javascript
// Não use console.log diretamente
console.log('User clicked');  // ❌ Use logger.info()

// Não logue dados sensíveis explicitamente
logger.info('Password:', password);  // ❌

// Não abuse de DEBUG logs
logger.debug('x:', x);  // ❌ Seja específico
logger.debug('x:', x, 'y:', y, 'z:', z);  // ❌ Use batch()
```

---

## 🚀 Deploy

### Recomendações por Ambiente

| Ambiente | Nível | Configuração |
|----------|-------|--------------|
| **Desenvolvimento** | DEBUG | Automático |
| **Staging** | INFO | `VITE_LOG_LEVEL=INFO` |
| **Produção** | SILENT | `VITE_LOG_LEVEL=SILENT` |

### Build de Produção

```bash
# .env.production
VITE_LOG_LEVEL=SILENT

# Build
npm run build
```

### Toggle em Produção (Emergência)

Se precisar debugar em produção SEM redeploy:

1. Abra console (F12)
2. Execute: `window.enableInfoLogs()` ou `window.enableDebugLogs()`
3. Recarregue a página
4. Reproduza o problema
5. Execute: `window.downloadLogs()`
6. Envie o arquivo JSON para a equipe

**Importante**: Sempre desative após o debug:
```javascript
window.disableLogs();  // Volta para SILENT
```

---

## 📈 Performance

### Impacto

- **SILENT**: Zero overhead (logs não executam)
- **ERROR**: <1ms overhead
- **WARN**: <2ms overhead
- **INFO**: <5ms overhead
- **DEBUG**: <10ms overhead

### Buffer

- **Tamanho**: 100 logs (últimos)
- **Memória**: ~50KB
- **Limpeza**: Automática (FIFO)

---

## 🧪 Testes

### Testar Níveis

```javascript
// No console
window.setLogLevel('SILENT');
logger.info('Test');  // ❌ Não aparece

window.setLogLevel('INFO');
logger.info('Test');  // ✅ Aparece

window.setLogLevel('DEBUG');
logger.debug('Test');  // ✅ Aparece
```

---

## 🔄 Migração

### Substituir console.log

**Antes**:
```javascript
console.log('User logged in');
console.error('Error:', error);
console.warn('Warning');
```

**Depois**:
```javascript
logger.info('User logged in');
logger.error('Error', error);
logger.warn('Warning');
```

---

## 📚 Referência Rápida

```javascript
// Comandos globais (console)
window.setLogLevel('DEBUG')     // Muda nível
window.getLogLevel()            // Ver nível
window.enableDebugLogs()        // Ativa DEBUG
window.enableInfoLogs()         // Ativa INFO
window.disableLogs()            // Ativa SILENT
window.viewLogs()               // Ver logs
window.downloadLogs()           // Baixar logs

// Métodos logger
logger.error(msg, error, ctx)   // ERROR level
logger.warn(msg, data)          // WARN level
logger.info(msg, data)          // INFO level
logger.debug(msg, data)         // DEBUG level
logger.success(msg, data)       // INFO level
logger.api(method, url, status) // INFO level
logger.auth(action, userId)     // INFO level
logger.payment(action, id, amt) // INFO level
logger.navigation(from, to)     // DEBUG level
logger.performance(metric, val) // DEBUG level
logger.startTimer(label)        // DEBUG level
logger.batch(category, metrics) // INFO level
logger.apiError(op, error, ctx) // ERROR level
```

---

**Última atualização**: 2025  
**Versão**: 2.0  
**Status**: ✅ Pronto para produção
