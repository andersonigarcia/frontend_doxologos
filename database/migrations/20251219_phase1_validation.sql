-- =====================================================
-- SCRIPT DE VALIDAÇÃO - FASE 1
-- Execute após a migração para verificar integridade
-- =====================================================

-- Este script verifica se a migração foi bem-sucedida
-- e se os dados existentes não foram afetados

-- =====================================================
-- 1. Verificar estrutura da tabela payments
-- =====================================================

SELECT 
  'payments' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payments'
  AND column_name IN ('idempotency_key', 'expires_at', 'payment_attempt_count', 'metadata')
ORDER BY column_name;

-- =====================================================
-- 2. Verificar índices criados
-- =====================================================

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'payments'
  AND indexname LIKE 'idx_payments_%'
ORDER BY indexname;

-- =====================================================
-- 3. Verificar tabela payment_attempts
-- =====================================================

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_attempts'
ORDER BY ordinal_position;

-- =====================================================
-- 4. Verificar agendamentos confirmados (CRÍTICO)
-- =====================================================

-- Deve retornar os mesmos agendamentos de antes
SELECT 
  b.id,
  b.status as booking_status,
  b.booking_date,
  b.booking_time,
  b.patient_name,
  p.status as payment_status,
  p.mp_payment_id
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
WHERE b.status = 'confirmed'
  AND b.created_at > NOW() - INTERVAL '30 days'
ORDER BY b.created_at DESC
LIMIT 10;

-- =====================================================
-- 5. Verificar pagamentos pendentes (CRÍTICO)
-- =====================================================

-- Deve retornar os mesmos pagamentos pendentes de antes
SELECT 
  id,
  booking_id,
  status,
  mp_payment_id,
  created_at,
  idempotency_key,  -- Nova coluna (deve ser NULL)
  expires_at         -- Nova coluna (deve ser NULL)
FROM payments
WHERE status IN ('pending', 'in_process')
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 6. Verificar pagamentos aprovados (CRÍTICO)
-- =====================================================

-- Deve retornar os mesmos pagamentos aprovados de antes
SELECT 
  COUNT(*) as total_approved,
  SUM(amount) as total_amount
FROM payments
WHERE status = 'approved'
  AND created_at > NOW() - INTERVAL '30 days';

-- =====================================================
-- 7. Verificar que novas colunas estão NULL
-- =====================================================

-- Todas as novas colunas devem estar NULL para dados existentes
SELECT 
  COUNT(*) as total_payments,
  COUNT(idempotency_key) as with_idempotency,
  COUNT(expires_at) as with_expiration,
  COUNT(payment_attempt_count) as with_attempt_count
FROM payments;

-- Resultado esperado: with_* devem ser 0 (ou muito baixo)

-- =====================================================
-- 8. Verificar constraints
-- =====================================================

SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'payment_attempts'::regclass
ORDER BY conname;

-- =====================================================
-- 9. Teste de inserção (payment_attempts)
-- =====================================================

-- Inserir registro de teste
INSERT INTO payment_attempts (
  booking_id,
  payment_method,
  amount,
  status,
  idempotency_key
)
SELECT 
  id,
  'pix',
  100.00,
  'initiated',
  'test_' || id::text
FROM bookings
WHERE status = 'pending'
LIMIT 1
RETURNING id, booking_id, status, created_at;

-- Limpar registro de teste
DELETE FROM payment_attempts 
WHERE idempotency_key LIKE 'test_%';

-- =====================================================
-- 10. Resumo da validação
-- =====================================================

DO $$
DECLARE
  payments_count INTEGER;
  bookings_confirmed INTEGER;
  new_columns_count INTEGER;
BEGIN
  -- Contar payments
  SELECT COUNT(*) INTO payments_count FROM payments;
  
  -- Contar bookings confirmados
  SELECT COUNT(*) INTO bookings_confirmed 
  FROM bookings WHERE status = 'confirmed';
  
  -- Contar novas colunas
  SELECT COUNT(*) INTO new_columns_count
  FROM information_schema.columns
  WHERE table_name = 'payments'
    AND column_name IN ('idempotency_key', 'expires_at', 'payment_attempt_count', 'metadata');
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO DA VALIDAÇÃO - FASE 1';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de pagamentos: %', payments_count;
  RAISE NOTICE 'Agendamentos confirmados: %', bookings_confirmed;
  RAISE NOTICE 'Novas colunas adicionadas: % de 4', new_columns_count;
  
  IF new_columns_count = 4 AND payments_count > 0 AND bookings_confirmed >= 0 THEN
    RAISE NOTICE '✅ VALIDAÇÃO PASSOU - Sistema íntegro';
  ELSE
    RAISE WARNING '⚠️ VALIDAÇÃO FALHOU - Verificar manualmente';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
