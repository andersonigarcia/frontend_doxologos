# ✅ Google Analytics 4 - Checklist Final de Produção

**Data:** 28/10/2025  
**Measurement ID:** `G-FSXFYQVCEC`

---

## 📋 PRÉ-DEPLOY

### **Configuração Base**
- [x] Measurement ID configurado (`G-FSXFYQVCEC`)
- [x] Script GA4 no `index.html` atualizado
- [x] `.env.production` com variáveis corretas
- [x] Privacy compliance (LGPD) configurado
- [x] Cookie flags seguros (`SameSite=None;Secure`)

### **Tracking de Eventos**
- [x] Page views automáticos
- [x] Booking flow completo
- [x] CheckoutSuccessPage tracking
- [x] CheckoutFailurePage tracking
- [x] CheckoutPendingPage tracking
- [x] Web Vitals monitoring
- [x] Error tracking

### **Performance**
- [x] Async loading do script GA4
- [x] Preconnect para `googletagmanager.com`
- [x] DNS prefetch para `google-analytics.com`
- [x] Resource monitoring (recursos >1s)

---

## 🚀 DEPLOY

### **Build & Deploy**
- [ ] Executar `npm run build`
- [ ] Verificar sem erros no build
- [ ] Executar `npm run preview` (testar localmente)
- [ ] Verificar console sem erros de GA4
- [ ] Deploy para produção
- [ ] Aguardar propagação (2-5 min)

---

## 🔍 PÓS-DEPLOY

### **Validação Imediata (10 min)**
- [ ] Acessar site em produção
- [ ] Abrir [GA4 Real-Time](https://analytics.google.com/)
- [ ] Verificar usuário ativo aparecendo
- [ ] Navegar entre páginas
- [ ] Verificar page views no Real-Time

### **Testes de Eventos (30 min)**

#### **1. Page Views**
- [ ] Navegar para `/`
- [ ] Navegar para `/agendamento`
- [ ] Navegar para `/quem-somos`
- [ ] Verificar eventos no Real-Time

#### **2. Booking Flow**
- [ ] Iniciar agendamento
- [ ] Selecionar profissional
- [ ] Escolher horário
- [ ] Preencher dados
- [ ] Verificar `booking_step` no Real-Time

#### **3. Checkout Success**
- [ ] Completar pagamento (PIX ou Cartão)
- [ ] Verificar redirecionamento para `/checkout/success`
- [ ] Verificar evento `booking_completed` no Real-Time
- [ ] Verificar evento `purchase` (enhanced ecommerce)

#### **4. Checkout Pending (PIX)**
- [ ] Iniciar pagamento com PIX
- [ ] Verificar redirecionamento para `/checkout/pending`
- [ ] Verificar evento `payment_pending` no Real-Time

#### **5. Checkout Failure**
- [ ] Testar pagamento com cartão inválido (número errado)
- [ ] Verificar redirecionamento para `/checkout/failure`
- [ ] Verificar evento `payment_failed` no Real-Time

#### **6. Web Vitals**
- [ ] Recarregar página
- [ ] Aguardar 5 segundos
- [ ] Verificar eventos `web_vitals` no Real-Time
- [ ] Conferir métricas: LCP, FID, CLS

#### **7. Error Tracking**
- [ ] Navegar para página inexistente (404)
- [ ] Verificar evento `javascript_error` (se aplicável)

---

## ⚙️ CONFIGURAÇÃO DO GA4

### **Conversões (10 min)**
Acesse: [GA4 Admin > Events > Mark as conversion](https://analytics.google.com/)

- [ ] Marcar `booking_completed` como conversão
- [ ] Marcar `purchase` como conversão
- [ ] Marcar `form_submit` como conversão
- [ ] Verificar conversões aparecendo em Real-Time

### **Custom Definitions (5 min)**
Criar dimensões customizadas:

- [ ] `clinic_page` (custom_parameter_1)
- [ ] `user_type` (custom_parameter_2)
- [ ] `booking_id`
- [ ] `professional_id`
- [ ] `service_id`

### **Data Streams (2 min)**
- [ ] Verificar stream da web ativo
- [ ] Confirmar enhanced measurement ligado
- [ ] Verificar data retention (14 meses)

---

## 📊 DASHBOARD (20 min)

### **Criar Exploração Personalizada**

#### **1. Funil de Conversão**
```
Etapa 1: page_view (/)
Etapa 2: page_view (/agendamento)
Etapa 3: booking_step
Etapa 4: page_view (/checkout)
Etapa 5: booking_completed
```

#### **2. Métricas de Checkout**
- Taxa de sucesso (%)
- Taxa de pendência PIX (%)
- Taxa de falha (%)
- Receita total (BRL)

#### **3. Web Vitals**
- LCP médio
- FID médio
- CLS médio
- Pages com LCP > 2.5s

---

## 🎯 ALERTAS

### **Configurar Alertas no GA4**

- [ ] **Queda de conversão**: > 50% queda vs semana anterior
- [ ] **Erro rate alto**: > 5% de `javascript_error`
- [ ] **LCP degradado**: > 50% páginas com LCP > 4s
- [ ] **Taxa de falha alta**: > 10% `payment_failed`

---

## 📈 MONITORAMENTO CONTÍNUO

### **Diário**
- [ ] Verificar Real-Time (usuários ativos)
- [ ] Conferir taxa de conversão
- [ ] Revisar erros no console

### **Semanal**
- [ ] Analisar funil de conversão
- [ ] Revisar Web Vitals
- [ ] Conferir taxa de abandono
- [ ] Comparar semana anterior

### **Mensal**
- [ ] Relatório de conversões
- [ ] Análise de performance
- [ ] Review de eventos customizados
- [ ] Otimizações baseadas em dados

---

## 🐛 TROUBLESHOOTING

### **GA4 não aparece no Real-Time**
1. Limpar cache do navegador
2. Verificar bloqueadores de anúncios (desativar)
3. Conferir console do navegador (erros)
4. Verificar `.env.production` (ID correto)
5. Aguardar 5-10 minutos após deploy

### **Eventos não sendo rastreados**
1. Abrir DevTools > Network
2. Filtrar por `google-analytics.com`
3. Verificar requests sendo enviadas
4. Conferir payload dos eventos
5. Verificar se `gtag()` está definido no console

### **Web Vitals não aparecem**
1. Recarregar página completamente
2. Aguardar 5 segundos após carregamento
3. Interagir com a página (clique)
4. Verificar após 10-15 minutos no GA4

---

## 📝 NOTAS IMPORTANTES

### **Tempo de Processamento**
- **Real-Time**: 1-2 minutos
- **Relatórios padrão**: 24-48 horas
- **Conversões**: 1-24 horas para aparecer em relatórios

### **Privacy & LGPD**
- ✅ IP anonimizado (`anonymize_ip: true`)
- ✅ Cookies seguros (`SameSite=None;Secure`)
- ✅ Dados sensíveis não rastreados
- ✅ Opt-out disponível via browser

### **Limits do GA4**
- **Eventos por usuário**: Ilimitado
- **Propriedades customizadas**: 50 por evento
- **Conversões**: 30 por propriedade
- **Data retention**: 14 meses (padrão)

---

## ✅ APROVAÇÃO FINAL

### **Antes de Marcar como COMPLETO**

- [ ] Todos os itens do PRÉ-DEPLOY completos
- [ ] Deploy realizado com sucesso
- [ ] Testes de validação passaram (100%)
- [ ] Conversões configuradas no GA4
- [ ] Dashboard criado
- [ ] Alertas configurados
- [ ] Documentação atualizada

---

## 🎉 CONCLUSÃO

Quando todos os checkboxes acima estiverem marcados:

**Status:** ✅ **GA4 100% OPERACIONAL EM PRODUÇÃO**

**Data de Conclusão:** _______________

**Responsável:** _______________

**Próxima Revisão:** _______________

---

**Documentação de Referência:**
- 📄 `docs/GA4_PRODUCTION_AUDIT.md`
- 📄 `docs/GA4_PRODUCTION_SUMMARY.md`
- 📄 `docs/GA4_SETUP_GUIDE.md`
- 📄 `analytics/ga4-setup-report.json`

**Última Atualização:** 28/10/2025 🚀
