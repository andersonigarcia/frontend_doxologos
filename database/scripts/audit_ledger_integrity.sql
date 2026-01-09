-- ================================================
-- AUDITORIA: Integridade do Ledger (Livro Razão)
-- Data: 2026-01-08
-- ================================================
-- 
-- OBJETIVO: Validar integridade contábil do sistema de ledger
-- Verificar partidas dobradas, saldos e consistência
-- ================================================

-- =========================================
-- AUDITORIA: INTEGRIDADE DO LEDGER
-- =========================================

-- ================================================
-- 1. ESTATÍSTICAS GERAIS
-- ================================================

SELECT 'ESTATÍSTICAS GERAIS' as secao, '' as info;

SELECT 
  'Total de Entradas' as metrica,
  COUNT(*) as valor
FROM payment_ledger_entries

UNION ALL

SELECT 
  'Entradas DEBIT',
  COUNT(*)
FROM payment_ledger_entries
WHERE entry_type = 'DEBIT'

UNION ALL

SELECT 
  'Entradas CREDIT',
  COUNT(*)
FROM payment_ledger_entries
WHERE entry_type = 'CREDIT'

UNION ALL

SELECT 
  'Transações Únicas',
  COUNT(DISTINCT transaction_id)
FROM payment_ledger_entries

UNION ALL

SELECT 
  'Contas Únicas',
  COUNT(DISTINCT account_code)
FROM payment_ledger_entries;

-- ================================================
-- 2. VALIDAÇÃO DE PARTIDAS DOBRADAS
-- ================================================

SELECT 'VALIDAÇÃO DE PARTIDAS DOBRADAS' as secao, 'Verificando se DEBIT = CREDIT por transação...' as info;

-- Transações desbalanceadas
WITH transaction_balance AS (
  SELECT 
    transaction_id,
    SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_debit,
    SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as total_credit,
    SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE -amount END) as balance
  FROM payment_ledger_entries
  GROUP BY transaction_id
)
SELECT 
  '❌ CRÍTICO: Transações Desbalanceadas' as status,
  COUNT(*) as quantidade,
  SUM(ABS(balance)) as diferenca_total
FROM transaction_balance
WHERE ABS(balance) > 0.01 -- Tolerância de 1 centavo para arredondamento

UNION ALL

SELECT 
  '✅ Transações Balanceadas',
  COUNT(*),
  0
FROM transaction_balance
WHERE ABS(balance) <= 0.01;

-- Detalhe das transações desbalanceadas
SELECT 'Detalhes de Transações Desbalanceadas' as secao, '' as info;

WITH transaction_balance AS (
  SELECT 
    transaction_id,
    SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_debit,
    SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as total_credit,
    SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE -amount END) as balance,
    MIN(created_at) as data,
    STRING_AGG(DISTINCT account_code, ', ') as contas
  FROM payment_ledger_entries
  GROUP BY transaction_id
)
SELECT 
  transaction_id,
  data::DATE as data,
  total_debit,
  total_credit,
  balance as diferenca,
  contas
FROM transaction_balance
WHERE ABS(balance) > 0.01
ORDER BY ABS(balance) DESC
LIMIT 20;

-- ================================================
-- 3. SALDOS POR CONTA
-- ================================================

SELECT 'SALDOS POR CONTA' as secao, '' as info;

SELECT 
  account_code as conta,
  SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_debito,
  SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as total_credito,
  SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE -amount END) as saldo
FROM payment_ledger_entries
GROUP BY account_code
ORDER BY account_code;

-- ================================================
-- 4. TRANSAÇÕES ÓRFÃS
-- ================================================

SELECT 'TRANSAÇÕES ÓRFÃS' as secao, 'Verificando entradas sem transação válida...' as info;

-- Entradas que referenciam bookings inexistentes
SELECT 
  '❌ Entradas referenciando bookings inexistentes' as status,
  COUNT(*) as quantidade
FROM payment_ledger_entries l
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b
  WHERE b.id = l.transaction_id
)
AND l.account_code IN ('REVENUE_SERVICE', 'LIABILITY_PROFESSIONAL');

-- Detalhe das órfãs
SELECT 'Detalhes de Entradas Órfãs' as secao, '' as info;

SELECT 
  l.id,
  l.transaction_id,
  l.entry_type,
  l.account_code,
  l.amount,
  l.created_at::DATE as data,
  l.description
FROM payment_ledger_entries l
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b
  WHERE b.id = l.transaction_id
)
AND l.account_code IN ('REVENUE_SERVICE', 'LIABILITY_PROFESSIONAL')
ORDER BY l.created_at DESC
LIMIT 20;

-- ================================================
-- 5. VALORES NEGATIVOS OU ZERO
-- ================================================

SELECT 'VALORES NEGATIVOS OU ZERO' as secao, '' as info;

SELECT 
  '❌ Entradas com valor negativo' as status,
  COUNT(*) as quantidade,
  MIN(amount) as menor_valor
FROM payment_ledger_entries
WHERE amount < 0

UNION ALL

SELECT 
  '⚠️ Entradas com valor zero',
  COUNT(*),
  0
FROM payment_ledger_entries
WHERE amount = 0;

-- ================================================
-- 6. INCONSISTÊNCIAS DE DATA
-- ================================================

SELECT 'INCONSISTÊNCIAS DE DATA' as secao, '' as info;

-- Entradas futuras
SELECT 
  '⚠️ Entradas com data futura' as status,
  COUNT(*) as quantidade
FROM payment_ledger_entries
WHERE created_at > NOW();

-- ================================================
-- 7. ANÁLISE POR PERÍODO
-- ================================================

SELECT 'ANÁLISE POR PERÍODO (Últimos 6 Meses)' as secao, '' as info;

SELECT 
  TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as mes,
  COUNT(*) as total_entradas,
  COUNT(DISTINCT transaction_id) as transacoes,
  SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_debito,
  SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as total_credito
FROM payment_ledger_entries
WHERE created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY mes DESC;

-- ================================================
-- 8. RESUMO EXECUTIVO
-- ================================================

SELECT 'RESUMO EXECUTIVO' as secao, '' as info;

WITH stats AS (
  SELECT 
    COUNT(*) as total_entries,
    COUNT(DISTINCT transaction_id) as total_transactions,
    SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_debit,
    SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as total_credit,
    COUNT(CASE WHEN amount < 0 THEN 1 END) as negative_values,
    COUNT(CASE WHEN amount = 0 THEN 1 END) as zero_values
  FROM payment_ledger_entries
),
unbalanced AS (
  SELECT COUNT(*) as count
  FROM (
    SELECT transaction_id
    FROM payment_ledger_entries
    GROUP BY transaction_id
    HAVING ABS(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE -amount END)) > 0.01
  ) t
)
SELECT 
  'Total de Entradas' as metrica,
  total_entries::TEXT as valor
FROM stats

UNION ALL SELECT 'Total de Transações', total_transactions::TEXT FROM stats
UNION ALL SELECT 'Total Débito', 'R$ ' || ROUND(total_debit, 2)::TEXT FROM stats
UNION ALL SELECT 'Total Crédito', 'R$ ' || ROUND(total_credit, 2)::TEXT FROM stats
UNION ALL SELECT 'Diferença (deve ser 0)', 'R$ ' || ROUND(total_debit - total_credit, 2)::TEXT FROM stats
UNION ALL SELECT '❌ Transações Desbalanceadas', count::TEXT FROM unbalanced
UNION ALL SELECT '❌ Valores Negativos', negative_values::TEXT FROM stats
UNION ALL SELECT '⚠️ Valores Zero', zero_values::TEXT FROM stats;

-- FIM DA AUDITORIA DO LEDGER
