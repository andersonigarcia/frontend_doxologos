# Contextualização Completa do Projeto - Frontend Doxologos

## Visão Geral do Projeto

**Nome:** Doxologos Clinic Frontend  
**Versão:** 0.0.0  
**Tipo:** Sistema de agendamento médico/clínico  
**Branch Atual:** `feature/corrigir-falhas-iniciais`  
**Data de Atualização:** 26 de Outubro de 2025  

## Propósito e Objetivos

O projeto é um sistema completo de gestão de clínica médica/psicológica que permite:

- **Pacientes**: Agendar consultas, visualizar histórico, reagendar consultas, avaliar profissionais
- **Profissionais**: Gerenciar agenda, visualizar pacientes, controlar disponibilidade
- **Administradores**: Gestão completa do sistema, usuários e configurações
- **Integração de pagamentos** via Mercado Pago
- **Sistema de avaliações** e feedback
- **Notificações** por email e WhatsApp

## Stack Tecnológica

### Frontend
- **React 18.2.0** - Framework principal
- **Vite** - Build tool e bundler
- **TypeScript/JSX** - Linguagem de desenvolvimento
- **Tailwind CSS** - Framework de estilização
- **Framer Motion 10.16.4** - Animações
- **React Router DOM 6.16.0** - Roteamento
- **React Helmet Async 2.0.5** - Gerenciamento de head/SEO
- **Lucide React 0.285.0** - Ícones

### Backend e Dados
- **Supabase 2.30.0** - Backend as a Service
  - Autenticação
  - Banco de dados PostgreSQL
  - Storage
  - Edge Functions
- **Supabase Functions** - Serverless functions para Mercado Pago

### UI Components
- **Radix UI** - Componentes acessíveis base:
  - Dialog, Dropdown Menu, Tabs, Toast, Avatar, Checkbox, Label, Slider
- **Class Variance Authority 0.7.0** - Variantes de componentes
- **Tailwind Merge 1.14.0** - Merge de classes CSS

### Integração e Monitoramento
- **Google Analytics 4** - Análise de usuário
- **Web Vitals** - Monitoramento de performance
- **Error Tracking** - Sistema customizado de rastreamento de erros

## Estrutura do Projeto

```
frontend_doxologos/
├── src/
│   ├── pages/
│   │   ├── PacientePage.jsx          # Área do paciente (CRÍTICO)
│   │   ├── HomePage.jsx              # Página inicial
│   │   ├── AgendamentoPage.jsx       # Sistema de agendamento
│   │   ├── AdminPage.jsx             # Painel administrativo
│   │   └── [outras páginas...]
│   ├── contexts/
│   │   └── SupabaseAuthContext.jsx   # Contexto de autenticação (CRÍTICO)
│   ├── components/
│   │   ├── ui/                       # Componentes base do sistema
│   │   └── [componentes específicos...]
│   ├── lib/
│   │   ├── customSupabaseClient.js   # Cliente Supabase customizado
│   │   ├── analytics.js              # Google Analytics
│   │   └── utils.js                  # Utilitários
│   └── hooks/
│       ├── useAnalytics.js
│       └── useErrorTracking.js
├── docs/                             # Documentação completa
├── database/                         # Scripts e migrações SQL
├── functions/                        # Netlify/Vercel functions
├── supabase/functions/               # Supabase Edge Functions
└── tools/                           # Scripts de build e deploy
```

## Estado Atual de Desenvolvimento

### Funcionalidades Implementadas ✅

#### Área do Paciente (PacientePage.jsx)
- **Autenticação completa** - Login/logout funcional
- **Visualização de agendamentos** - Lista completa com status
- **Sistema de reagendamento avançado**:
  - Seleção de profissional alternativo
  - Carregamento dinâmico de disponibilidade por profissional
  - Validação de datas e horários
  - Atualização em tempo real da agenda
- **Sistema de avaliações** - Rating e comentários pós-consulta
- **Tratamento robusto de erros** - Try/catch em todas operações
- **UI responsiva** - Design adaptativo para mobile/desktop
- **Estados de loading** - Feedbacks visuais apropriados

#### Contexto de Autenticação (SupabaseAuthContext.jsx)
- **Inicialização robusta** - Recuperação de sessão ao carregar
- **Gerenciamento de estado** - User, session, role
- **Listeners de mudança** - Reação automática a login/logout
- **Tratamento de erros** - Recovery de falhas de autenticação
- **Prevenção de render blocking** - Sempre renderiza children

### Problemas Resolvidos Recentemente 🔧

1. **Erros de sintaxe JavaScript** - Brackets não balanceados corrigidos
2. **Tela branca na área do paciente** - AuthProvider corrigido para não bloquear render
3. **Erros de fetch** - Tratamento abrangente de erros implementado
4. **UUID undefined** - Queries SQL corrigidas com IDs obrigatórios
5. **Coluna 'active' inexistente** - Removido filtro de tabela professionals
6. **Seleção dinâmica de profissionais** - Disponibilidade por profissional implementada

### Funcionalidades em Desenvolvimento 🚧

- **Melhorias de UX** no modal de reagendamento
- **Otimizações de performance** nas consultas
- **Expandir sistema de notificações**
- **Relatórios e analytics** avançados

## Arquitetura de Dados

### Tabelas Principais no Supabase

```sql
-- Usuários (via Supabase Auth + metadata)
users: id, email, user_metadata(role, full_name)

-- Profissionais
professionals: id, name, speciality, email, phone

-- Serviços
services: id, name, description, duration, price

-- Agendamentos (TABELA CRÍTICA)
bookings: 
  id, user_id, professional_id, service_id,
  booking_date, booking_time, status,
  created_at, updated_at

-- Avaliações
reviews:
  id, booking_id, patient_id, professional_id,
  rating, comment, created_at

-- Disponibilidade (se implementada)
professional_availability:
  id, professional_id, available_date,
  available_times[], is_available
```

### Fluxo de Dados Crítico

1. **Autenticação**: User login → Session creation → Role assignment
2. **Carregamento de dados**: User → Bookings com JOINs → Reviews
3. **Reagendamento**: 
   - Carregar profissionais disponíveis
   - Filtrar por professional_id → datas disponíveis
   - Filtrar por data → horários disponíveis
   - Validar e atualizar booking

## Configuração de Ambiente

### Variáveis de Ambiente Obrigatórias
```bash
# config/local.env
VITE_SUPABASE_URL=https://[seu-projeto].supabase.co
VITE_SUPABASE_ANON_KEY=[sua-chave-anonima]
VITE_SUPABASE_SERVICE_ROLE_KEY=[sua-chave-service-role]
VITE_GA4_MEASUREMENT_ID=[seu-ga4-id]
```

### Scripts Disponíveis
```bash
npm run dev          # Desenvolvimento (porta 3000)
npm run build        # Build de produção
npm run preview      # Preview da build
npm run ga4:setup    # Configurar Google Analytics
npm run deploy:auto  # Deploy automatizado
```

## Pontos Críticos de Atenção

### 1. Área do Paciente (PacientePage.jsx)
**Status**: Totalmente funcional após correções recentes
**Funcionalidades críticas**:
- Reagendamento com seleção de profissional
- Carregamento dinâmico de disponibilidade
- Tratamento robusto de erros
- Sistema de avaliações

**Código-chave**:
```jsx
// Buscar profissionais disponíveis
const fetchAvailableProfessionals = async (serviceId) => {
  const { data } = await supabase
    .from('professionals')
    .select('id, name');
  return data || [];
};

// Buscar datas por profissional
const fetchAvailableDates = async (professionalId, serviceId) => {
  // Gera próximos 30 dias úteis
  // Filtra por agendamentos existentes
  // Retorna apenas datas com horários disponíveis
};

// Reagendamento com novo profissional
const handleRescheduleSubmit = async () => {
  await supabase
    .from('bookings')
    .update({
      professional_id: selectedProfessional.id,
      booking_date: selectedNewDate,
      booking_time: selectedNewTime,
      status: 'confirmed'
    })
    .eq('id', reschedulingBooking.id);
};
```

### 2. Contexto de Autenticação (SupabaseAuthContext.jsx)
**Status**: Estável e funcional
**Responsabilidades**:
- Inicialização de sessão
- Gerenciamento de estado do usuário
- Listeners de mudança de auth
- Recovery de erros

**Padrão implementado**:
```jsx
// Sempre renderiza children, nunca bloqueia por loading
return (
  <AuthContext.Provider value={authValue}>
    {children}
  </AuthContext.Provider>
);
```

### 3. Queries Supabase Críticas
**Padrão implementado** para evitar erros:
```jsx
// Sempre incluir IDs relacionados
const { data, error } = await supabase
  .from('bookings')
  .select(`
    *, 
    professional:professionals(id, name), 
    service:services(id, name)
  `)
  .eq('user_id', user.id);

// Sempre verificar erros
if (error) {
  console.error('Fetch error description:', error);
  // Handler apropriado
}
```

## Fluxo de Desenvolvimento Recomendado

### Para Novos Recursos
1. **Verificar dependências** - Autenticação, dados necessários
2. **Implementar tratamento de erros** - Try/catch, validações
3. **Testar edge cases** - Dados vazios, conexão falha
4. **Validar responsividade** - Mobile/desktop
5. **Documentar mudanças** - Atualizar este arquivo

### Para Correções de Bug
1. **Reproduzir localmente** - `npm run dev`
2. **Verificar console** - Erros JavaScript/Network
3. **Validar queries** - Estrutura de dados Supabase
4. **Testar fluxo completo** - Do login até funcionalidade
5. **Commit com descrição clara**

## Comandos de Depuração

```bash
# Verificar erros de sintaxe
npx tsc --noEmit --jsx preserve src/pages/PacientePage.jsx

# Validar JavaScript
node -c "src/pages/PacientePage.jsx"

# Iniciar development server
npm run dev

# Verificar processos Node
Get-Process | Where-Object {$_.ProcessName -eq "node"}
```

## Próximos Passos Planejados

### Curto Prazo
- [ ] Melhorar mensagens de erro para usuário final
- [ ] Implementar cache para consultas frequentes
- [ ] Adicionar loading states mais granulares
- [ ] Otimizar re-renders desnecessários

### Médio Prazo
- [ ] Sistema de notificações por email
- [ ] Dashboard de analytics para admin
- [ ] Integração completa com Mercado Pago
- [ ] Sistema de lembretes automáticos

### Longo Prazo
- [ ] Aplicativo mobile (React Native)
- [ ] Integração com sistemas de terceiros
- [ ] IA para sugestão de horários
- [ ] Sistema de telemedicina

## Notas de Manutenção

**Última sessão de desenvolvimento:**
- Corrigido erros de coluna 'active' na tabela professionals
- Sistema de reagendamento com seleção de profissional totalmente funcional
- Disponibilidade dinâmica por profissional implementada
- Todos os fluxos críticos testados e validados

**Código estável em produção:**
- Autenticação: ✅ Funcional
- Área do paciente: ✅ Funcional  
- Reagendamento: ✅ Funcional
- Avaliações: ✅ Funcional
- Error handling: ✅ Implementado

---

**Para retomar desenvolvimento:** 
1. Execute `npm run dev`
2. Acesse http://localhost:3000/area-do-paciente
3. Teste login e funcionalidades principais
4. Verifique console para erros
5. Continue a partir do ponto documentado

**Última atualização:** 26/10/2025 - Sistema completamente funcional após correções de sintaxe, autenticação e disponibilidade dinâmica de profissionais.