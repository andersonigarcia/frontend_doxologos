# Guia de Execução: Fases 3 e 4 do Plano Híbrido

## 📋 Visão Geral

**Status Atual**: Dashboard funcionando com ledger ✅

**Fases Restantes**:
- **Fase 3**: Backfill de bookings (OPCIONAL)
- **Fase 4**: Constraints de validação (RECOMENDADO)

---

## ⚠️ Importante: Quando Executar?

### Fase 3 (Backfill) - OPCIONAL

**Execute SE**:
- ✅ Precisa de dados históricos em `bookings`
- ✅ Outros sistemas dependem de `bookings.valor_consulta`
- ✅ Quer consistência total entre ledger e bookings

**NÃO Execute SE**:
- ❌ Dashboard já funciona (usa ledger)
- ❌ Não precisa de dados históricos em bookings
- ❌ Quer evitar duplicação de dados

### Fase 4 (Constraints) - RECOMENDADO

**Execute SEMPRE**:
- ✅ Previne problemas futuros
- ✅ Garante integridade de dados
- ✅ Sem impacto em dados existentes

---

## 📊 Ordem de Execução

### Opção 1: Apenas Constraints (Recomendado)
```
1. Verificar se há bookings confirmados com NULL
2. Se SIM: Executar Fase 3 (Backfill) primeiro
3. Se NÃO: Executar Fase 4 (Constraints) diretamente
```

### Opção 2: Backfill + Constraints (Completo)
```
1. Executar Fase 3 (Backfill)
2. Validar resultados
3. Executar Fase 4 (Constraints)
4. Validar constraints
```

---

## 🔧 Fase 3: Backfill de Bookings

### Arquivo
[`backfill_bookings_from_ledger.sql`](file:///c:/Users/ander/source/repos/frontend_doxologos/database/scripts/backfill_bookings_from_ledger.sql)

### Pré-requisitos
- ✅ Acesso ao Supabase SQL Editor
- ✅ Permissões de admin
- ✅ Backup recente do banco (recomendado)

### Passo a Passo

#### 1. Abrir SQL Editor
```
Supabase Dashboard → SQL Editor → New Query
```

#### 2. Copiar Script
Copie o conteúdo de `backfill_bookings_from_ledger.sql`

#### 3. Executar Preview
O script mostra preview antes de aplicar:
```sql
=== PREVIEW: BOOKINGS QUE SERÃO ATUALIZADOS ===
```

**Verifique**:
- Quantos bookings serão atualizados
- Se os valores fazem sentido
- Se há inconsistências

#### 4. Aplicar Mudanças
Por padrão, o script faz **ROLLBACK** (não aplica).

**Para aplicar**:
1. Localize a linha final: `ROLLBACK;`
2. Comente: `-- ROLLBACK;`
3. Descomente: `COMMIT;`
4. Execute novamente

#### 5. Validar Resultado
```sql
SELECT 
  COUNT(*) as total,
  COUNT(valor_consulta) as with_valor,
  COUNT(valor_repasse_profissional) as with_repasse
FROM bookings
WHERE status IN ('confirmed', 'paid', 'completed');
```

**Resultado Esperado**:
- `total` = `with_valor` = `with_repasse`
- Sem NULLs em bookings confirmados

---

## 🛡️ Fase 4: Constraints de Validação

### Arquivo
[`add_booking_value_constraints.sql`](file:///c:/Users/ander/source/repos/frontend_doxologos/database/migrations/add_booking_value_constraints.sql)

### Pré-requisitos
- ✅ **CRÍTICO**: Nenhum booking confirmado com NULL
- ✅ Se houver, execute Fase 3 primeiro!

### Passo a Passo

#### 1. Verificar Pré-requisito
```sql
SELECT COUNT(*) 
FROM bookings
WHERE status IN ('confirmed', 'paid', 'completed')
  AND (valor_consulta IS NULL OR valor_repasse_profissional IS NULL);
```

**Se resultado > 0**: Execute Fase 3 primeiro!

#### 2. Executar Migration
```
Supabase Dashboard → SQL Editor → New Query
```

Copie e execute `add_booking_value_constraints.sql`

#### 3. Verificar Constraint
O script inclui testes automáticos:
```
✅ SUCESSO: Constraint funcionando!
```

#### 4. Validar Manualmente
Tente criar booking confirmado sem valores (deve FALHAR):
```sql
INSERT INTO bookings (
  patient_name,
  patient_email,
  status,
  booking_date
) VALUES (
  'Teste',
  'teste@test.com',
  'confirmed',
  CURRENT_DATE
);
-- Deve retornar erro: check constraint violation
```

---

## ✅ Checklist de Validação

### Após Fase 3 (Backfill)
- [ ] Todos bookings confirmados têm `valor_consulta`
- [ ] Todos bookings confirmados têm `valor_repasse_profissional`
- [ ] Valores batem com ledger
- [ ] Sem inconsistências reportadas

### Após Fase 4 (Constraints)
- [ ] Constraint `bookings_confirmed_must_have_values` existe
- [ ] Teste de inserção inválida FALHA (esperado)
- [ ] Teste de inserção válida PASSA
- [ ] Bookings pendentes ainda podem ser criados sem valores

---

## 🐛 Troubleshooting

### Erro: "Constraint violation" ao aplicar Fase 4

**Causa**: Há bookings confirmados com NULL

**Solução**:
```sql
-- Identificar bookings problemáticos
SELECT id, patient_name, status, valor_consulta, valor_repasse_profissional
FROM bookings
WHERE status IN ('confirmed', 'paid', 'completed')
  AND (valor_consulta IS NULL OR valor_repasse_profissional IS NULL);

-- Opção 1: Executar Fase 3 (Backfill)
-- Opção 2: Corrigir manualmente
-- Opção 3: Mudar status para 'pending' temporariamente
```

### Backfill não encontra dados no ledger

**Causa**: `transaction_id` no ledger não corresponde a `booking.id`

**Solução**:
```sql
-- Verificar relação
SELECT 
  b.id as booking_id,
  l.transaction_id,
  l.account_code,
  l.amount
FROM bookings b
LEFT JOIN payment_ledger_entries l ON l.transaction_id = b.id
WHERE b.status = 'confirmed'
LIMIT 5;

-- Se transaction_id estiver diferente, ajustar script de backfill
```

### Valores do backfill parecem incorretos

**Causa**: Múltiplas entradas no ledger para mesmo booking

**Solução**:
```sql
-- Verificar duplicatas
SELECT 
  transaction_id,
  account_code,
  COUNT(*) as count,
  SUM(amount) as total
FROM payment_ledger_entries
WHERE entry_type = 'CREDIT'
  AND account_code IN ('REVENUE_SERVICE', 'LIABILITY_PROFESSIONAL')
GROUP BY transaction_id, account_code
HAVING COUNT(*) > 1;

-- Se houver duplicatas, investigar e corrigir ledger primeiro
```

---

## 📊 Resultados Esperados

### Antes
```
Bookings confirmados: 21
Com valor_consulta: 21 (mas alguns NULL)
Com valor_repasse: 21 (mas alguns NULL)
Constraint: Não existe
```

### Depois (Fase 3 + 4)
```
Bookings confirmados: 21
Com valor_consulta: 21 (todos preenchidos)
Com valor_repasse: 21 (todos preenchidos)
Constraint: ✅ Ativa e funcionando
```

---

## 🎯 Próximos Passos

### Após Execução Bem-Sucedida

1. **Monitorar**: Verificar se novos bookings respeitam constraint
2. **Documentar**: Atualizar documentação do sistema
3. **Comunicar**: Informar equipe sobre mudanças

### Manutenção Contínua

```sql
-- Query mensal para verificar integridade
SELECT 
  status,
  COUNT(*) as total,
  COUNT(valor_consulta) as with_valor,
  COUNT(*) - COUNT(valor_consulta) as missing
FROM bookings
GROUP BY status;
```

---

## 📝 Notas Importantes

> [!IMPORTANT]
> **Fase 3 é OPCIONAL**
> 
> O dashboard já funciona sem backfill, usando ledger diretamente.
> Execute apenas se precisar de dados históricos em bookings.

> [!WARNING]
> **Fase 4 requer Fase 3 se houver NULLs**
> 
> Se existirem bookings confirmados com NULL, você DEVE executar
> o backfill primeiro, senão a constraint falhará.

> [!TIP]
> **Teste em Staging Primeiro**
> 
> Se possível, teste em ambiente de staging antes de produção.

---

## 🆘 Suporte

Se encontrar problemas:

1. **Verificar logs**: Console do Supabase
2. **Executar diagnóstico**: `diagnose_profit_loss_nan.sql`
3. **Revisar walkthrough**: Documentação completa
4. **Rollback**: Ambos scripts suportam ROLLBACK
