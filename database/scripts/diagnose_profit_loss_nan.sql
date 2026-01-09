-- ================================================
-- Diagnóstico: Dashboard de Lucro/Prejuízo (NaN)
-- Usando payment_ledger_entries
-- Data: 2026-01-08
-- ================================================

-- ================================================
-- 1. VERIFICAR ESTRUTURA DE BOOKINGS
-- ================================================
SELECT 
  '=== CAMPOS FINANCEIROS EM BOOKINGS ===' as diagnostico;

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND (
    column_name IN ('valor_consulta', 'valor_repasse_profissional')
    OR column_name ILIKE '%price%'
    OR column_name ILIKE '%amount%'
    OR column_name ILIKE '%valor%'
  )
ORDER BY column_name;

-- ================================================
-- 2. VERIFICAR BOOKINGS COM VALORES NULL
-- ================================================
SELECT 
  '=== BOOKINGS CONFIRMADOS COM NULL ===' as diagnostico;

SELECT 
  COUNT(*) as total_bookings,
  COUNT(valor_consulta) as with_valor_consulta,
  COUNT(valor_repasse_profissional) as with_repasse,
  COUNT(*) - COUNT(valor_consulta) as missing_valor_consulta,
  COUNT(*) - COUNT(valor_repasse_profissional) as missing_repasse
FROM bookings
WHERE status IN ('confirmed', 'paid', 'completed');

-- ================================================
-- 3. SAMPLE DE BOOKINGS PROBLEMÁTICOS
-- ================================================
SELECT 
  '=== SAMPLE: BOOKINGS SEM VALORES ===' as diagnostico;

SELECT 
  id,
  patient_name,
  status,
  booking_date,
  valor_consulta,
  valor_repasse_profissional,
  created_at
FROM bookings
WHERE status IN ('confirmed', 'paid', 'completed')
  AND (valor_consulta IS NULL OR valor_repasse_profissional IS NULL)
ORDER BY created_at DESC
LIMIT 10;

-- ================================================
-- 4. VERIFICAR PAYMENT_LEDGER_ENTRIES
-- ================================================
SELECT 
  '=== ESTRUTURA DO LEDGER ===' as diagnostico;

SELECT 
  entry_type,
  account_code,
  COUNT(*) as total_entries,
  SUM(amount) as total_amount,
  MIN(created_at) as primeiro,
  MAX(created_at) as ultimo
FROM payment_ledger_entries
GROUP BY entry_type, account_code
ORDER BY entry_type, account_code;

-- ================================================
-- 5. COMPARAR LEDGER VS BOOKINGS (Este Mês)
-- ================================================
SELECT 
  '=== COMPARAÇÃO LEDGER VS BOOKINGS (Este Mês) ===' as diagnostico;

-- Receita do Ledger
WITH ledger_revenue AS (
  SELECT 
    SUM(amount) as total
  FROM payment_ledger_entries
  WHERE entry_type = 'CREDIT'
    AND account_code = 'REVENUE_SERVICE'
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
),
-- Repasse do Ledger
ledger_payout AS (
  SELECT 
    SUM(amount) as total
  FROM payment_ledger_entries
  WHERE entry_type = 'CREDIT'
    AND account_code = 'LIABILITY_PROFESSIONAL'
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
),
-- Receita de Bookings
bookings_revenue AS (
  SELECT 
    SUM(valor_consulta) as total
  FROM bookings
  WHERE status IN ('confirmed', 'paid', 'completed')
    AND booking_date >= DATE_TRUNC('month', CURRENT_DATE)
),
-- Repasse de Bookings
bookings_payout AS (
  SELECT 
    SUM(valor_repasse_profissional) as total
  FROM bookings
  WHERE status IN ('confirmed', 'paid', 'completed')
    AND booking_date >= DATE_TRUNC('month', CURRENT_DATE)
)
SELECT 
  'Ledger' as fonte,
  COALESCE(lr.total, 0) as receita_total,
  COALESCE(lp.total, 0) as repasse_total,
  COALESCE(lr.total, 0) - COALESCE(lp.total, 0) as margem_plataforma
FROM ledger_revenue lr, ledger_payout lp

UNION ALL

SELECT 
  'Bookings' as fonte,
  COALESCE(br.total, 0) as receita_total,
  COALESCE(bp.total, 0) as repasse_total,
  COALESCE(br.total, 0) - COALESCE(bp.total, 0) as margem_plataforma
FROM bookings_revenue br, bookings_payout bp;

-- ================================================
-- 6. VERIFICAR CUSTOS DA PLATAFORMA
-- ================================================
SELECT 
  '=== CUSTOS DA PLATAFORMA (Este Mês) ===' as diagnostico;

SELECT 
  category,
  COUNT(*) as total_registros,
  SUM(amount) as total_amount
FROM platform_costs
WHERE cost_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY category
ORDER BY total_amount DESC;

-- ================================================
-- 7. CALCULAR LUCRO/PREJUÍZO ESPERADO
-- ================================================
SELECT 
  '=== CÁLCULO ESPERADO DE LUCRO/PREJUÍZO ===' as diagnostico;

WITH ledger_margin AS (
  SELECT 
    COALESCE(SUM(CASE WHEN account_code = 'REVENUE_SERVICE' THEN amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN account_code = 'LIABILITY_PROFESSIONAL' THEN amount ELSE 0 END), 0) as margem
  FROM payment_ledger_entries
  WHERE entry_type = 'CREDIT'
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
),
platform_costs_total AS (
  SELECT 
    COALESCE(SUM(amount), 0) as total
  FROM platform_costs
  WHERE cost_date >= DATE_TRUNC('month', CURRENT_DATE)
)
SELECT 
  lm.margem as margem_plataforma,
  pct.total as custos_totais,
  lm.margem - pct.total as lucro_prejuizo,
  CASE 
    WHEN lm.margem > 0 THEN ROUND((lm.margem - pct.total) / lm.margem * 100, 2)
    ELSE 0
  END as margem_percentual
FROM ledger_margin lm, platform_costs_total pct;

-- ================================================
-- 8. VERIFICAR ACCOUNT_CODES DISPONÍVEIS
-- ================================================
SELECT 
  '=== ACCOUNT_CODES NO LEDGER ===' as diagnostico;

SELECT DISTINCT
  account_code,
  entry_type,
  COUNT(*) as total_entries,
  SUM(amount) as total_amount
FROM payment_ledger_entries
GROUP BY account_code, entry_type
ORDER BY account_code, entry_type;
