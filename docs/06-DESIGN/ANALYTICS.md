# 📊 Google Analytics 4 - Configuração e Monitoramento

Este documento consolida todas as informações sobre Google Analytics 4 (GA4) no sistema Doxologos.

---

## 🎯 Visão Geral

O GA4 está configurado para rastrear:
- ✅ Pageviews
- ✅ Eventos de agendamento
- ✅ Conversões de pagamento
- ✅ Interações de usuário
- ✅ Funil de conversão

---

## 🚀 Setup Inicial

### 1. Criar Propriedade GA4

1. Acesse [Google Analytics](https://analytics.google.com)
2. Crie uma nova propriedade
3. Selecione "Web" como plataforma
4. Obtenha o **Measurement ID** (formato: G-XXXXXXXXXX)

### 2. Instalar no Projeto

#### Opção A: Google Tag Manager (Recomendado)
```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXX');</script>
```

#### Opção B: gtag.js Direto
```html
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 📊 Eventos Customizados

### Eventos de Agendamento
```javascript
// Início do agendamento
gtag('event', 'begin_booking', {
  'event_category': 'booking',
  'event_label': 'start',
  'service_type': 'consulta'
});

// Seleção de profissional
gtag('event', 'select_professional', {
  'event_category': 'booking',
  'professional_id': professionalId,
  'professional_name': professionalName
});

// Agendamento concluído
gtag('event', 'booking_complete', {
  'event_category': 'booking',
  'booking_id': bookingId,
  'value': bookingValue,
  'currency': 'BRL'
});
```

### Eventos de Pagamento
```javascript
// Início do checkout
gtag('event', 'begin_checkout', {
  'event_category': 'ecommerce',
  'value': amount,
  'currency': 'BRL',
  'items': [{
    'item_id': bookingId,
    'item_name': serviceName,
    'price': amount
  }]
});

// Pagamento concluído
gtag('event', 'purchase', {
  'event_category': 'ecommerce',
  'transaction_id': paymentId,
  'value': amount,
  'currency': 'BRL',
  'payment_method': 'pix' // ou 'credit_card'
});
```

### Eventos de Navegação
```javascript
// Visualização de página
gtag('event', 'page_view', {
  'page_title': document.title,
  'page_location': window.location.href,
  'page_path': window.location.pathname
});

// Clique em CTA
gtag('event', 'cta_click', {
  'event_category': 'engagement',
  'event_label': buttonText,
  'button_location': 'hero'
});
```

---

## 🎯 Conversões

### Configurar Conversões no GA4

1. Acesse **Admin** → **Events**
2. Marque eventos como conversões:
   - ✅ `booking_complete`
   - ✅ `purchase`
   - ✅ `sign_up`

### Funil de Conversão
```
Visita Homepage
    ↓
Clica "Agendar"
    ↓
Seleciona Serviço
    ↓
Seleciona Profissional
    ↓
Escolhe Horário
    ↓
Preenche Dados
    ↓
Vai para Checkout
    ↓
Completa Pagamento ✅
```

---

## 📈 Relatórios Customizados

### Relatório de Agendamentos
- **Métrica**: Total de agendamentos
- **Dimensão**: Serviço, Profissional, Data
- **Filtro**: `booking_complete` event

### Relatório de Receita
- **Métrica**: Valor total (purchase)
- **Dimensão**: Método de pagamento, Data
- **Segmento**: Usuários que converteram

### Relatório de Funil
- **Etapas**:
  1. Visualizações de página `/agendar`
  2. Evento `select_professional`
  3. Evento `begin_checkout`
  4. Evento `purchase`

---

## 🔍 Debugging e Validação

### Google Tag Assistant
1. Instale a extensão [Tag Assistant](https://tagassistant.google.com/)
2. Navegue pelo site
3. Verifique se eventos estão sendo disparados

### GA4 DebugView
1. Acesse **Admin** → **DebugView**
2. Ative modo debug:
```javascript
gtag('config', 'G-XXXXXXXXXX', {
  'debug_mode': true
});
```
3. Veja eventos em tempo real

### Console do Navegador
```javascript
// Ver dataLayer
console.log(window.dataLayer);

// Disparar evento de teste
gtag('event', 'test_event', {
  'test_parameter': 'test_value'
});
```

---

## 📊 Auditoria de Produção

### Checklist de Validação
- [ ] Measurement ID correto
- [ ] Eventos sendo disparados
- [ ] Conversões configuradas
- [ ] Funil funcionando
- [ ] Dados aparecendo no GA4 (24-48h)
- [ ] Filtros de IP interno aplicados
- [ ] GDPR/LGPD compliance

### Métricas Esperadas
- **Pageviews**: > 1000/mês
- **Sessões**: > 500/mês
- **Taxa de Conversão**: > 3%
- **Tempo Médio**: > 2 minutos

---

## 🔐 Privacidade e LGPD

### Configurações de Privacidade
```javascript
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied'
});

// Após consentimento do usuário
gtag('consent', 'update', {
  'analytics_storage': 'granted'
});
```

### Anonimização de IP
```javascript
gtag('config', 'G-XXXXXXXXXX', {
  'anonymize_ip': true
});
```

---

## 🚀 Deploy Checklist

### Desenvolvimento
- [ ] GA4 configurado com Measurement ID de DEV
- [ ] Debug mode ativo
- [ ] Eventos testados

### Staging
- [ ] GA4 configurado com Measurement ID de STAGING
- [ ] Todos os eventos validados
- [ ] Funil testado end-to-end

### Produção
- [ ] GA4 configurado com Measurement ID de PROD
- [ ] Debug mode desativado
- [ ] Filtro de IP interno configurado
- [ ] Conversões ativas
- [ ] Relatórios customizados criados

---

## 📚 Recursos Adicionais

- [Documentação GA4](https://developers.google.com/analytics/devguides/collection/ga4)
- [Guia de Eventos](https://support.google.com/analytics/answer/9267735)
- [Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)

---

**Última atualização**: 30 de Dezembro de 2025
