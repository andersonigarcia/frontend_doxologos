-- ================================================
-- Backfill: Preencher bookings com dados do Ledger
-- Data: 2026-01-08
-- ================================================
-- 
-- OBJETIVO: Preencher campos valor_consulta e valor_repasse_profissional
-- em bookings usando dados do payment_ledger_entries
--
-- IMPORTANTE: Execute este script APENAS se precisar de dados históricos
-- em bookings. O dashboard já funciona sem isso.
-- ================================================

BEGIN;

-- ================================================
-- 1. VERIFICAR ESTADO ATUAL
-- ================================================
SELECT 
  '=== ESTADO ANTES DO BACKFILL ===' as info;

SELECT 
  COUNT(*) as total_bookings,
  COUNT(valor_consulta) as with_valor_consulta,
  COUNT(valor_repasse_profissional) as with_repasse,
  COUNT(*) - COUNT(valor_consulta) as missing_valor,
  COUNT(*) - COUNT(valor_repasse_profissional) as missing_repasse
FROM bookings
WHERE status IN ('confirmed', 'paid', 'completed');

-- ================================================
-- 2. PREVIEW: Ver quais bookings serão atualizados
-- ================================================
SELECT 
  '=== PREVIEW: BOOKINGS QUE SERÃO ATUALIZADOS ===' as info;

SELECT 
  b.id,
  b.patient_name,
  b.status,
  b.booking_date,
  b.valor_consulta as valor_atual,
  l_revenue.amount as novo_valor_consulta,
  b.valor_repasse_profissional as repasse_atual,
  l_payout.amount as novo_valor_repasse
FROM bookings b
LEFT JOIN payment_ledger_entries l_revenue ON (
  l_revenue.transaction_id = b.id
  AND l_revenue.entry_type = 'CREDIT'
  AND l_revenue.account_code = 'REVENUE_SERVICE'
)
LEFT JOIN payment_ledger_entries l_payout ON (
  l_payout.transaction_id = b.id
  AND l_payout.entry_type = 'CREDIT'
  AND l_payout.account_code = 'LIABILITY_PROFESSIONAL'
)
WHERE b.status IN ('confirmed', 'paid', 'completed')
  AND (b.valor_consulta IS NULL OR b.valor_repasse_profissional IS NULL)
ORDER BY b.created_at DESC
LIMIT 10;

-- ================================================
-- 3. BACKFILL: valor_consulta
-- ================================================
SELECT 
  '=== ATUALIZANDO valor_consulta ===' as info;

UPDATE bookings b
SET 
  valor_consulta = l.amount,
  updated_at = NOW()
FROM payment_ledger_entries l
WHERE l.transaction_id = b.id
  AND l.entry_type = 'CREDIT'
  AND l.account_code = 'REVENUE_SERVICE'
  AND b.valor_consulta IS NULL
  AND b.status IN ('confirmed', 'paid', 'completed');

-- Mostrar quantos foram atualizados
SELECT 
  '✅ Bookings atualizados (valor_consulta): ' || COUNT(*) as resultado
FROM bookings
WHERE valor_consulta IS NOT NULL
  AND updated_at > NOW() - INTERVAL '1 minute';

-- ================================================
-- 4. BACKFILL: valor_repasse_profissional
-- ================================================
SELECT 
  '=== ATUALIZANDO valor_repasse_profissional ===' as info;

UPDATE bookings b
SET 
  valor_repasse_profissional = l.amount,
  updated_at = NOW()
FROM payment_ledger_entries l
WHERE l.transaction_id = b.id
  AND l.entry_type = 'CREDIT'
  AND l.account_code = 'LIABILITY_PROFESSIONAL'
  AND b.valor_repasse_profissional IS NULL
  AND b.status IN ('confirmed', 'paid', 'completed');

-- Mostrar quantos foram atualizados
SELECT 
  '✅ Bookings atualizados (valor_repasse): ' || COUNT(*) as resultado
FROM bookings
WHERE valor_repasse_profissional IS NOT NULL
  AND updated_at > NOW() - INTERVAL '1 minute';

-- ================================================
-- 5. VERIFICAR RESULTADO FINAL
-- ================================================
SELECT 
  '=== ESTADO APÓS BACKFILL ===' as info;

SELECT 
  COUNT(*) as total_bookings,
  COUNT(valor_consulta) as with_valor_consulta,
  COUNT(valor_repasse_profissional) as with_repasse,
  COUNT(*) - COUNT(valor_consulta) as missing_valor,
  COUNT(*) - COUNT(valor_repasse_profissional) as missing_repasse
FROM bookings
WHERE status IN ('confirmed', 'paid', 'completed');

-- ================================================
-- 6. VERIFICAR INCONSISTÊNCIAS
-- ================================================
SELECT 
  '=== VERIFICAR INCONSISTÊNCIAS ===' as info;

-- Bookings confirmados sem valores (ainda)
SELECT 
  'Bookings confirmados sem valores: ' || COUNT(*) as alerta
FROM bookings
WHERE status IN ('confirmed', 'paid', 'completed')
  AND (valor_consulta IS NULL OR valor_repasse_profissional IS NULL);

-- Bookings com valores mas sem ledger correspondente
SELECT 
  'Bookings com valores mas sem ledger: ' || COUNT(*) as alerta
FROM bookings b
WHERE b.status IN ('confirmed', 'paid', 'completed')
  AND b.valor_consulta IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM payment_ledger_entries l
    WHERE l.transaction_id = b.id
      AND l.account_code = 'REVENUE_SERVICE'
  );

-- ================================================
-- 7. SAMPLE DE DADOS ATUALIZADOS
-- ================================================
SELECT 
  '=== SAMPLE: BOOKINGS ATUALIZADOS ===' as info;

SELECT 
  id,
  patient_name,
  status,
  booking_date,
  valor_consulta,
  valor_repasse_profissional,
  updated_at
FROM bookings
WHERE status IN ('confirmed', 'paid', 'completed')
  AND valor_consulta IS NOT NULL
  AND valor_repasse_profissional IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;

-- ================================================
-- COMMIT ou ROLLBACK
-- ================================================
-- Se tudo estiver OK, execute: COMMIT;
-- Se houver problemas, execute: ROLLBACK;

-- Por segurança, deixando como ROLLBACK por padrão
-- Remova o comentário abaixo para confirmar as mudanças:
-- COMMIT;

ROLLBACK; -- ⚠️ REMOVA ESTA LINHA E DESCOMENTE COMMIT ACIMA PARA APLICAR

SELECT 
  '⚠️ TRANSAÇÃO REVERTIDA (ROLLBACK)' as aviso,
  'Remova o ROLLBACK e descomente COMMIT para aplicar as mudanças' as instrucao;
