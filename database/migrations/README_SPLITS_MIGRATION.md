# Guia de Execução: Migrations de Split Financeiro

## Arquivos Criados

1. **`20260201_add_event_financial_splits.sql`** - Migration principal
2. **`20260201_add_event_financial_splits_rollback.sql`** - Rollback
3. **`20260201_add_event_financial_splits_validation.sql`** - Validação

## Como Executar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo de `20260201_add_event_financial_splits.sql`
4. Clique em **Run**
5. Verifique se aparece a mensagem de sucesso

### Opção 2: Via CLI do Supabase

```bash
# Navegar para o diretório do projeto
cd c:\Users\ander\source\repos\frontend_doxologos

# Executar migration
supabase db push --db-url "sua-connection-string"

# OU se estiver usando migrations locais
psql -h seu-host -U seu-usuario -d seu-database -f database/migrations/20260201_add_event_financial_splits.sql
```

### Opção 3: Via psql direto

```bash
psql "postgresql://usuario:senha@host:porta/database" -f database/migrations/20260201_add_event_financial_splits.sql
```

## Validação

Após executar a migration, execute o script de validação:

```sql
-- Cole e execute o conteúdo de:
-- database/migrations/20260201_add_event_financial_splits_validation.sql
```

Você deve ver:

```
✅ ========================================
✅ ALL VALIDATION TESTS PASSED!
✅ Migration applied successfully
✅ ========================================
```

## Rollback (Se Necessário)

Se precisar reverter as mudanças:

```sql
-- Cole e execute o conteúdo de:
-- database/migrations/20260201_add_event_financial_splits_rollback.sql
```

## O Que Foi Criado

### Tabela `eventos` (campos adicionados):
- `professional_id` - UUID do profissional responsável
- `platform_fee_type` - Tipo de taxa ('fixed' ou 'percentage')
- `platform_fee_value` - Valor da taxa (R$ ou %)

### Tabela `event_financial_splits`:
- Registra cada split de pagamento
- Campos: total_amount, platform_amount, professional_amount
- Inclui metadados do cálculo em JSON

### Função `calculate_event_split`:
- Calcula automaticamente o split baseado nas configurações do evento
- Retorna: platform_amount, professional_amount, calculation_details

### View `event_financial_report`:
- Relatório consolidado por evento
- Mostra: receita total, receita plataforma, receita profissional
- Inclui estatísticas de inscrições

## Próximos Passos

Após executar a migration com sucesso:

1. ✅ Atualizar webhook `mp-webhook` para registrar splits
2. ✅ Adicionar UI no admin para configurar splits
3. ✅ Criar página de relatórios financeiros

## Troubleshooting

### Erro: "relation eventos does not exist"
- Verifique se está conectado ao banco correto
- Confirme que a tabela `eventos` existe

### Erro: "permission denied"
- Verifique se o usuário tem permissões de ALTER TABLE e CREATE TABLE
- Pode precisar executar como superuser

### Erro: "column already exists"
- A migration já foi executada
- Execute o rollback primeiro se quiser reaplicar
