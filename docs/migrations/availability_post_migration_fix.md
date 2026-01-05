# Correção Pós-Migration - Disponibilidade Não Aparecendo

## Problema Identificado

Após executar a migration, todos os profissionais apareciam sem horários disponíveis.

## Causa Raiz

A `fetchAvailabilityMap` estava filtrando **apenas** pelo mês atual (`includeNextMonths: 0`), mas os calendários de agendamento precisam mostrar disponibilidade para os próximos meses também.

## Solução Aplicada

### 1. Ajuste no Padrão de `fetchAvailabilityMap`

**Arquivo**: `src/lib/api/supabaseFetchers.js`

```diff
- const includeNextMonths = options.includeNextMonths || 0;
+ // Default to 2 additional months (current + 2 = 3 months total) for booking calendars
+ const includeNextMonths = options.includeNextMonths !== undefined ? options.includeNextMonths : 2;
```

**Mudança**: Agora inclui **3 meses** por padrão (mês atual + 2 próximos meses).

### 2. Correção de Lógica Duplicada

**Arquivo**: `src/pages/AgendamentoPage.jsx`

Removida verificação duplicada de `Array.isArray(dayAvailability)` que impedia o fallback para estrutura antiga funcionar corretamente.

```diff
  else if (Array.isArray(dayAvailability)) {
+   // Check if it's an array of objects with month/year (new multi-month structure)
+   if (dayAvailability.length > 0 && dayAvailability[0].month !== undefined) {
      const matchingEntry = dayAvailability.find(...)
      ...
+   } else {
+     // Fallback for old structure (direct array of times)
+     times = dayAvailability;
+   }
  }
- // This else if was unreachable due to duplicate condition
- else if (Array.isArray(dayAvailability)) {
-   times = dayAvailability;
- }
```

## Resultado

✅ Disponibilidade agora aparece corretamente no agendamento
✅ Suporta agendamentos para os próximos 3 meses
✅ Mantém compatibilidade com estrutura antiga

## Teste Rápido

1. Recarregue a página de agendamento
2. Selecione um profissional
3. Verifique que os horários aparecem no calendário
4. Teste navegação entre meses (Janeiro, Fevereiro, Março)

## Observação

Se ainda não aparecerem horários, verifique:
1. Se a migration foi executada corretamente
2. Se há registros na tabela `availability` com `month` e `year` preenchidos
3. Se os registros estão dentro do range de 3 meses (Janeiro-Março 2026)
