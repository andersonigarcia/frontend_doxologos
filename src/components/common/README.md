# Componentes Compartilhados - Documentação

Esta pasta contém componentes reutilizáveis projetados para uso em toda a aplicação Doxologos.

## Componentes Disponíveis

### 1. DashboardCard

Card versátil para exibição de métricas e informações no dashboard.

**Props:**
- `title` (string): Título do card
- `value` (string|number): Valor principal a ser exibido
- `subtitle` (string): Texto adicional abaixo do valor
- `icon` (LucideIcon): Ícone a ser exibido
- `variant` ('default'|'success'|'warning'|'info'|'danger'): Estilo visual
- `trend` (object): Informações de tendência `{ value: number, isPositive: boolean, label?: string }`
- `loading` (boolean): Estado de carregamento
- `onClick` (function): Callback ao clicar no card
- `footer` (ReactNode): Conteúdo do rodapé
- `children` (ReactNode): Conteúdo customizado

**Exemplo:**
```jsx
import { DashboardCard } from '@/components/common';
import { Calendar } from 'lucide-react';

<DashboardCard
  title="Total de Consultas"
  value="24"
  icon={Calendar}
  variant="success"
  trend={{ value: 12, isPositive: true }}
  subtitle="Este mês"
/>
```

---

### 2. StatCard

Card especializado para estatísticas com suporte a tendências e sparklines.

**Props:**
- `label` (string): Rótulo da estatística
- `value` (number): Valor numérico
- `format` ('number'|'currency'|'percentage'): Formato de exibição
- `currency` (string): Código da moeda (default: 'BRL')
- `trend` (object): `{ value: number, direction: 'up'|'down'|'neutral' }`
- `comparison` (string): Texto de comparação
- `sparkline` (number[]): Array de valores para gráfico
- `loading` (boolean): Estado de carregamento
- `invertTrendColors` (boolean): Inverter cores de tendência (útil para métricas onde diminuição é positiva)

**Exemplo:**
```jsx
import { StatCard } from '@/components/common';

<StatCard
  label="Receita Mensal"
  value={15420.50}
  format="currency"
  trend={{ value: 12.5, direction: 'up' }}
  comparison="vs. mês anterior"
  sparkline={[10000, 12000, 11500, 13000, 15420]}
/>
```

---

### 3. QuickActions

Componente para exibir ações rápidas em grid ou lista.

**Props:**
- `title` (string): Título da seção
- `actions` (array): Array de objetos de ação
- `layout` ('grid'|'list'): Layout de exibição
- `columns` (number): Número de colunas no grid (default: 2)
- `showTitle` (boolean): Mostrar título

**Estrutura de Action:**
```typescript
{
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default'|'outline'|'ghost';
  disabled?: boolean;
  badge?: string|number;
  className?: string;
}
```

**Exemplo:**
```jsx
import { QuickActions } from '@/components/common';
import { Plus, CalendarX } from 'lucide-react';

<QuickActions
  title="Ações Rápidas"
  actions={[
    {
      id: 'new',
      label: 'Nova Consulta',
      icon: Plus,
      onClick: () => navigate('/agendamento'),
      variant: 'default'
    },
    {
      id: 'block',
      label: 'Bloquear Data',
      icon: CalendarX,
      onClick: handleBlockDate,
      badge: 3
    }
  ]}
  layout="grid"
  columns={2}
/>
```

---

### 4. TimelineView

Visualização de timeline para agendamentos e eventos.

**Props:**
- `items` (array): Array de itens da timeline
- `groupBy` ('date'|'none'): Agrupar por data
- `onItemClick` (function): Callback ao clicar em item
- `emptyMessage` (string): Mensagem quando vazio

**Estrutura de Item:**
```typescript
{
  id: string;
  date: string; // ISO date
  time: string; // HH:mm
  title: string;
  description?: string;
  status: 'confirmed'|'pending'|'cancelled'|'completed';
  actions?: Array<{
    label: string;
    onClick: (item) => void;
    variant?: 'primary'|'secondary';
  }>;
  content?: ReactNode;
}
```

**Exemplo:**
```jsx
import { TimelineView } from '@/components/common';

<TimelineView
  items={[
    {
      id: '1',
      date: '2024-01-15',
      time: '14:00',
      title: 'Consulta com Dr. Silva',
      status: 'confirmed',
      description: 'Terapia individual',
      actions: [
        { label: 'Ver detalhes', onClick: () => {} },
        { label: 'Reagendar', onClick: () => {}, variant: 'primary' }
      ]
    }
  ]}
  groupBy="date"
/>
```

---

### 5. NotificationBadge

Badge de notificações com contador.

**Props:**
- `count` (number): Número de notificações
- `max` (number): Valor máximo antes de mostrar "+"
- `variant` ('count'|'dot'): Estilo do badge
- `size` ('sm'|'md'|'lg'): Tamanho
- `onClick` (function): Callback ao clicar
- `showZero` (boolean): Mostrar badge quando count = 0

**Exemplo:**
```jsx
import { NotificationBadge } from '@/components/common';

<NotificationBadge
  count={5}
  max={99}
  variant="count"
  size="md"
  onClick={handleOpenNotifications}
/>
```

---

### 6. EmptyState

Componente para estados vazios com ilustrações e ações.

**Props:**
- `icon` (LucideIcon): Ícone a ser exibido
- `title` (string): Título
- `description` (string): Descrição
- `action` (object): Ação primária `{ label, onClick, icon?, variant? }`
- `secondaryAction` (object): Ação secundária
- `illustration` (ReactNode): Ilustração customizada
- `compact` (boolean): Versão compacta

**Exemplo:**
```jsx
import { EmptyState } from '@/components/common';
import { Calendar } from 'lucide-react';

<EmptyState
  icon={Calendar}
  title="Nenhum agendamento"
  description="Você ainda não tem consultas agendadas"
  action={{
    label: 'Agendar consulta',
    onClick: () => navigate('/agendamento')
  }}
  secondaryAction={{
    label: 'Ver histórico',
    onClick: () => navigate('/historico'),
    variant: 'outline'
  }}
/>
```

---

## Uso Geral

### Importação

```jsx
// Importar componentes individuais
import { DashboardCard, StatCard } from '@/components/common';

// Ou importar todos
import * as CommonComponents from '@/components/common';
```

### Estilização

Todos os componentes aceitam a prop `className` para customização adicional via Tailwind CSS:

```jsx
<DashboardCard
  className="col-span-2 md:col-span-1"
  // ... outras props
/>
```

### Responsividade

Todos os componentes são responsivos por padrão e se adaptam a diferentes tamanhos de tela.

### Acessibilidade

- Todos os componentes incluem labels ARIA apropriados
- Suporte a navegação por teclado
- Contraste de cores adequado (WCAG AA)

---

## Boas Práticas

1. **Consistência**: Use os mesmos componentes em toda a aplicação para manter consistência visual
2. **Performance**: Use a prop `loading` para feedback durante carregamento de dados
3. **Acessibilidade**: Sempre forneça labels descritivos e textos alternativos
4. **Responsividade**: Teste em diferentes tamanhos de tela
5. **Reutilização**: Prefira compor componentes existentes em vez de criar novos

---

## Contribuindo

Ao adicionar novos componentes compartilhados:

1. Siga o padrão de nomenclatura existente
2. Documente todas as props com JSDoc
3. Inclua exemplos de uso
4. Adicione testes unitários
5. Atualize este README
6. Exporte o componente em `index.js`
