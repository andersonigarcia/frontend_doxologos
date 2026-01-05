# Guia de Migração - Sistema de Disponibilidade

## Resumo das Alterações

Foi corrigido um problema crítico onde a disponibilidade cadastrada não refletia corretamente os horários durante o agendamento. A causa raiz era que `fetchAvailabilityMap` não filtrava por mês/ano, causando conflitos entre disponibilidades de períodos diferentes.

## Arquivos Modificados

### 1. `src/lib/api/supabaseFetchers.js`
- **Alteração**: Função `fetchAvailabilityMap` agora filtra por mês/ano
- **Novo comportamento**: 
  - Por padrão, retorna apenas disponibilidade do mês/ano atual
  - Aceita parâmetros opcionais: `{month, year, includeNextMonths}`
  - Retorna estrutura: `{professional_id: {day_of_week: {times: [], month, year}}}`

### 2. `src/pages/AgendamentoPage.jsx`
- **Alteração**: Função `getAvailableTimesForDate` atualizada
- **Novo comportamento**: Extrai horários da nova estrutura e filtra por mês/ano da data selecionada
- **Compatibilidade**: Mantém suporte para estrutura antiga durante migração

### 3. `database/migrations/fix_availability_month_year_backfill.sql`
- **Novo arquivo**: Script de migração para preservar dados existentes
- **Ação**: Define mês/ano atual para registros sem essas informações

### 4. `src/lib/api/__tests__/supabaseFetchers.test.js`
- **Novo arquivo**: Testes automatizados para `fetchAvailabilityMap`
- **Cobertura**: Filtragem por mês/ano, múltiplos meses, casos extremos

## Passos para Aplicar a Migração

### 1. Executar Migration SQL (OBRIGATÓRIO)

Execute o script de migração no Supabase SQL Editor:

\`\`\`bash
# Arquivo: database/migrations/fix_availability_month_year_backfill.sql
\`\`\`

Este script:
- Define mês/ano para registros existentes (usa mês/ano atual)
- Garante que a constraint `availability_professional_id_day_month_year_key` está ativa
- Valida que todos os registros têm mês/ano

### 2. Verificar Dados Migrados

Após executar a migração, verifique:

\`\`\`sql
SELECT 
    professional_id,
    day_of_week,
    month,
    year,
    array_length(available_times, 1) as num_slots
FROM availability
ORDER BY professional_id, year, month, day_of_week;
\`\`\`

**Esperado**: Todos os registros devem ter `month` e `year` preenchidos.

### 3. Testar Localmente

\`\`\`bash
# Executar testes automatizados
npm test -- src/lib/api/__tests__/supabaseFetchers.test.js

# Iniciar aplicação
npm run dev
\`\`\`

### 4. Teste Manual

1. **Cadastrar Disponibilidade**:
   - Acesse área administrativa
   - Selecione profissional
   - Configure horários para Janeiro/2026
   - Salve

2. **Verificar Agendamento**:
   - Acesse página de agendamento
   - Selecione o mesmo profissional
   - Escolha data em Janeiro/2026
   - **VERIFICAR**: Horários exibidos devem corresponder aos cadastrados

3. **Testar Múltiplos Meses**:
   - Cadastre disponibilidade diferente para Fevereiro/2026
   - Verifique que Janeiro mostra horários de Janeiro
   - Verifique que Fevereiro mostra horários de Fevereiro

## Comportamento Esperado

### Antes da Correção ❌
- Horários de meses diferentes se sobrescreviam
- Agendamento mostrava horários incorretos
- Impossível ter disponibilidades diferentes por mês

### Depois da Correção ✅
- Cada mês tem sua própria disponibilidade
- Agendamento mostra apenas horários do mês selecionado
- Profissionais podem ter horários diferentes em meses diferentes

## Compatibilidade com Versões Anteriores

O código mantém compatibilidade durante a transição:

- **Nova estrutura**: `{times: [...], month: X, year: Y}`
- **Estrutura antiga**: `[...]` (array direto)
- `AgendamentoPage.jsx` detecta e suporta ambas

## Rollback (Se Necessário)

Se precisar reverter:

1. Restaurar `src/lib/api/supabaseFetchers.js`:
\`\`\`javascript
export async function fetchAvailabilityMap() {
  const { data, error } = await supabase.from('availability').select('*');
  if (error) throw error;
  const availabilityMap = {};
  ensureData(data).forEach((slot) => {
    if (!availabilityMap[slot.professional_id]) {
      availabilityMap[slot.professional_id] = {};
    }
    availabilityMap[slot.professional_id][slot.day_of_week] = slot.available_times;
  });
  return availabilityMap;
}
\`\`\`

2. Restaurar `AgendamentoPage.jsx` linha 618:
\`\`\`javascript
let times = availability[selectedProfessional]?.[dayKey] || [];
\`\`\`

**NOTA**: Rollback não é recomendado, pois o problema original voltará.

## Suporte

Se encontrar problemas:
1. Verifique que a migração SQL foi executada
2. Confirme que todos os registros têm `month` e `year`
3. Verifique logs do console para erros
4. Execute testes automatizados

## Próximos Passos Recomendados

1. Monitorar logs de erro após deploy
2. Adicionar testes E2E para fluxo completo de agendamento
3. Considerar adicionar UI para gerenciar disponibilidade de múltiplos meses simultaneamente
