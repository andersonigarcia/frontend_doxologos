# Guia de Configuração Google Analytics 4 - Doxologos

## 🎯 Passo 1: Configurar GA4 - Adicionar GA_MEASUREMENT_ID Real

### 1.1 Criar Conta Google Analytics
1. Acesse [Google Analytics](https://analytics.google.com/)
2. Clique em "Começar" ou faça login com sua conta Google
3. Crie uma nova propriedade:
   - **Nome da conta**: Doxologos Psicologia
   - **Nome da propriedade**: Doxologos Website
   - **Fuso horário**: (UTC-03:00) Brasília
   - **Moeda**: Real brasileiro (R$)

### 1.2 Configurar Propriedade GA4
```
Configurações recomendadas:
✅ Setor: Saúde e medicina
✅ Tamanho da empresa: Pequena empresa
✅ Objetivos: Gerar leads, Vender online
✅ Coleta de dados aprimorada: Ativada
```

### 1.3 Obter Measurement ID
Após criar a propriedade, você receberá um **Measurement ID** no formato:
```
G-XXXXXXXXXX
```

### 1.4 Configurar Variáveis de Ambiente

**Para Desenvolvimento:**
Crie o arquivo `config/local.env`:
```env
# Google Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=true
VITE_ENVIRONMENT=development

# Performance Monitoring  
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ERROR_TRACKING_ENABLED=true
```

**Para Produção:**
Configure no seu provedor de hosting (Vercel, Netlify, etc.):
```env
# Produção
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ENABLE_ANALYTICS=true
VITE_ENVIRONMENT=production
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ERROR_TRACKING_ENABLED=true
```

### 1.5 Verificar Integração
Após configurar, execute:
```bash
npm run dev
```

Verifique no console do navegador:
- ✅ Script GA4 carregado
- ✅ Eventos sendo enviados
- ✅ Web Vitals reportados

## 🚀 Passo 2: Deploy - Testar em Produção

### 2.1 Build de Produção
```bash
# Gerar build otimizado
npm run build

# Visualizar build localmente
npm run preview
```

### 2.2 Deploy Automatizado

**Opção A: Vercel (Recomendado)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Configurar variáveis de ambiente
vercel env add VITE_GA_MEASUREMENT_ID
vercel env add VITE_ENABLE_ANALYTICS
```

**Opção B: Netlify**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Configurar env vars no painel admin
```

### 2.3 Validação Pós-Deploy
Após o deploy, verificar:
- ✅ GA4 Real-Time mostra usuários
- ✅ Eventos customizados aparecendo
- ✅ Web Vitals sendo reportados
- ✅ Error tracking funcionando

### 2.4 Teste de Produção
Execute estes testes no site em produção:
```javascript
// 1. Teste de Page View
// Navegue entre páginas e verifique no GA4 Real-Time

// 2. Teste de Formulário
// Preencha o formulário de contato

// 3. Teste de Agendamento
// Inicie o processo de agendamento

// 4. Teste de Vídeo
// Reproduza vídeos na homepage

// 5. Teste de Erro
// Force um erro 404 navegando para página inexistente
```

## 📊 Passo 3: Dashboard - Configurar Painéis no Google Analytics

### 3.1 Conversões Essenciais
Configure estas conversões no GA4:

**Agendamento Completo**
```
Nome: booking_complete
Descrição: Usuário finalizou agendamento
Categoria: purchase
```

**Formulário de Contato**
```
Nome: contact_form_submit
Descrição: Usuário enviou formulário de contato
Categoria: generate_lead
```

**Depoimento Enviado**
```
Nome: testimonial_submit
Descrição: Usuário enviou depoimento
Categoria: engage
```

**Doação Realizada**
```
Nome: donation_complete
Descrição: Usuário fez doação
Categoria: purchase
```

### 3.2 Relatórios Customizados

**Relatório 1: Funil de Agendamento**
```
Dimensões:
- Página / tela
- Evento
- Parâmetro personalizado

Métricas:
- Usuários
- Sessões
- Conversões
- Taxa de conversão
```

**Relatório 2: Performance de Conteúdo**
```
Dimensões:
- Título da página
- Caminho da página
- Fonte/mídia

Métricas:
- Visualizações de página
- Duração média da sessão
- Taxa de rejeição
- Conversões por página
```

**Relatório 3: Web Vitals**
```
Dimensões:
- Página
- Dispositivo
- Conexão

Métricas customizadas:
- LCP médio
- FID médio  
- CLS médio
- Taxa de páginas com boa performance
```

### 3.3 Públicos-Alvo
Crie estes públicos para remarketing:

**Usuários Engajados**
```
Condição: 
- Duração da sessão > 2 minutos
- OU Visualizou > 2 páginas
- OU Assistiu vídeo > 50%
```

**Abandonaram Agendamento**
```
Condição:
- Iniciou processo (booking_start)
- MAS NÃO converteu (booking_complete)
- Últimos 30 dias
```

**Interessados em Serviços**
```
Condição:
- Visitou página de agendamento
- OU Visualizou profissionais
- OU Assistiu vídeos
```

## 🚨 Passo 4: Alertas - Configurar Alertas para Métricas Críticas

### 4.1 Alertas de Performance

**Alerta 1: Degradação Web Vitals**
```yaml
Nome: "Web Vitals Degradados"
Condição: 
  - LCP > 4 segundos (para > 25% das pageviews)
  - OU FID > 300ms (para > 25% das pageviews)
  - OU CLS > 0.25 (para > 25% das pageviews)
Frequência: Diária
Ação: Email + Slack
```

**Alerta 2: Alto Número de Erros**
```yaml
Nome: "Muitos Erros JavaScript"
Condição:
  - Eventos 'javascript_error' > 50/dia
  - OU Eventos 'network_error' > 100/dia
Frequência: Em tempo real
Ação: Email imediato
```

### 4.2 Alertas de Negócio

**Alerta 3: Queda em Conversões**
```yaml
Nome: "Queda em Agendamentos"
Condição:
  - Taxa de conversão 'booking_complete' < 2%
  - Comparado com período anterior
Frequência: Diária
Ação: Email + Dashboard
```

**Alerta 4: Tráfego Anômalo**
```yaml
Nome: "Tráfego Suspeito"
Condição:
  - Taxa de rejeição > 90%
  - OU Duração média sessão < 10 segundos
  - Para > 100 usuários/dia
Frequência: Diária
Ação: Email para admin
```

### 4.3 Configuração Técnica de Alertas

**Google Analytics Intelligence:**
1. Acesse Insights > Intelligence
2. Configure alertas personalizados
3. Integre com Google Cloud Monitoring se necessário

**Alertas via API (Opcional):**
```javascript
// Implementar webhook para alertas críticos
export const setupCriticalAlerts = () => {
  // Monitor performance em tempo real
  webVitalsMonitor.onCriticalIssue((metric, value) => {
    if (value > CRITICAL_THRESHOLDS[metric]) {
      sendSlackAlert(`🚨 Critical ${metric}: ${value}`);
    }
  });
};
```

## 📈 Passo 5: Otimização - Usar Dados para Melhorar Conversões

### 5.1 Análise de Funil de Conversão

**Funil de Agendamento:**
```
Análise semanal:
1. Homepage visits → 100%
2. Agendamento page → ?%
3. Professional selection → ?%
4. Date/time selection → ?%
5. Payment → ?%
6. Confirmation → ?%
```

**Pontos de Otimização:**
- Onde há maior abandono?
- Qual etapa tem menor conversão?
- Dispositivos com pior performance?

### 5.2 Otimizações Baseadas em Dados

**Performance:**
```javascript
// A/B test diferentes estratégias de loading
if (LCP > 2.5) {
  // Implementar lazy loading mais agressivo
  // Otimizar imagens críticas
  // Reduzir JavaScript inicial
}

if (CLS > 0.1) {
  // Definir dimensões fixas para elementos
  // Otimizar carregamento de fontes
}
```

**UX/Conversão:**
```javascript
// Heatmap dos elementos mais clicados
// A/B test CTAs diferentes
// Otimizar formulários com mais abandono

// Exemplo: otimização de form
if (formAbandonmentRate > 30%) {
  // Reduzir número de campos
  // Implementar salvamento automático
  // Melhorar validation feedback
}
```

### 5.3 Testes A/B Recomendados

**Teste 1: CTAs da Homepage**
```
Versão A: "Encontre seu psicólogo"
Versão B: "Agende sua consulta grátis"
Versão C: "Comece sua jornada hoje"
Métrica: Click-through rate
```

**Teste 2: Processo de Agendamento**
```
Versão A: 5 etapas (atual)
Versão B: 3 etapas (condensado)
Métrica: Taxa de conclusão
```

**Teste 3: Posição de Depoimentos**
```
Versão A: Depoimentos na homepage
Versão B: Depoimentos na página de agendamento
Métrica: Conversão de agendamento
```

### 5.4 Dashboard de Otimização

**KPIs Principais:**
- Taxa de conversão geral
- Custo por aquisição
- Lifetime Value
- Net Promoter Score

**Métricas Semanais:**
- Novos agendamentos
- Taxa de abandono por etapa
- Performance por dispositivo
- Performance por canal de aquisição

### 5.5 Automação de Otimizações

**Smart Bidding (se usar Google Ads):**
- Configure conversões inteligentes
- Use dados GA4 para otimizar campanhas

**Personalização Dinâmica:**
```javascript
// Exemplo: personalizar CTAs baseado em comportamento
if (userEngagement.videoWatchTime > 60) {
  showCTA("Agende com nossos especialistas");
} else if (userEngagement.scrollDepth > 75) {
  showCTA("Saiba mais sobre nossos serviços");
}
```

## ✅ Checklist de Implementação

### Semana 1: Setup Inicial
- [ ] Criar conta GA4
- [ ] Configurar Measurement ID
- [ ] Deploy em produção
- [ ] Validar tracking básico

### Semana 2: Dashboards e Relatórios
- [ ] Configurar conversões
- [ ] Criar relatórios customizados
- [ ] Configurar públicos-alvo
- [ ] Implementar alertas básicos

### Semana 3: Otimização
- [ ] Analisar dados iniciais
- [ ] Identificar gargalos
- [ ] Configurar primeiro A/B test
- [ ] Implementar melhorias de performance

### Semana 4: Refinamento
- [ ] Ajustar alertas baseado em dados reais
- [ ] Expandir tracking para eventos específicos
- [ ] Criar dashboard executivo
- [ ] Documentar processos de otimização

## 🎯 Resultados Esperados

Após 30 dias de implementação completa:
- **Visibilidade**: 100% das interações trackadas
- **Performance**: Web Vitals > 75% "Good"
- **Conversões**: Baseline estabelecida para otimização
- **Alertas**: Sistema proativo de monitoramento
- **ROI**: Dados para investimento em marketing digital

---

**Próximo passo:** Executar Passo 1 - Configurar GA4 com Measurement ID real