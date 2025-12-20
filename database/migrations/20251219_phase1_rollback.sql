-- =====================================================
-- ROLLBACK SCRIPT - FASE 1
-- Use apenas se precisar reverter a migração
-- =====================================================

-- ATENÇÃO: Este script remove as alterações da Fase 1
-- Execute apenas se houver problemas críticos

-- =====================================================
-- 1. Remover tabela payment_attempts
-- =====================================================

DROP TABLE IF EXISTS payment_attempts CASCADE;

-- =====================================================
-- 2. Remover índices da tabela payments
-- =====================================================

DROP INDEX IF EXISTS idx_payments_idempotency;
DROP INDEX IF EXISTS idx_payments_expires;
DROP INDEX IF EXISTS idx_payments_booking_status;

-- =====================================================
-- 3. Remover colunas da tabela payments
-- =====================================================

ALTER TABLE payments 
DROP COLUMN IF EXISTS idempotency_key,
DROP COLUMN IF EXISTS expires_at,
DROP COLUMN IF EXISTS payment_attempt_count,
DROP COLUMN IF EXISTS metadata;

-- =====================================================
-- 4. Verificação
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Rollback da Fase 1 concluído';
  RAISE NOTICE 'ℹ️ Todas as alterações foram revertidas';
  RAISE NOTICE 'ℹ️ Sistema voltou ao estado anterior';
END $$;
