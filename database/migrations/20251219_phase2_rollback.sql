-- =====================================================
-- ROLLBACK SCRIPT - FASE 2
-- Use apenas se precisar reverter a migração de dados
-- =====================================================

-- ATENÇÃO: Este script limpa os dados migrados na Fase 2
-- Execute apenas se houver problemas críticos

-- =====================================================
-- 1. Limpar idempotency_key migrados
-- =====================================================

-- Remover apenas os valores 'legacy_' (dados migrados)
-- Preservar valores criados por novos pagamentos
UPDATE payments
SET idempotency_key = NULL
WHERE idempotency_key LIKE 'legacy_%';

-- =====================================================
-- 2. Limpar expires_at
-- =====================================================

-- Remover todas as datas de expiração
UPDATE payments
SET expires_at = NULL;

-- =====================================================
-- 3. Resetar payment_attempt_count
-- =====================================================

-- Voltar para NULL (ou manter 1 se preferir)
UPDATE payments
SET payment_attempt_count = NULL;

-- =====================================================
-- 4. Verificação
-- =====================================================

DO $$
DECLARE
  with_legacy_key INTEGER;
  with_expiration INTEGER;
BEGIN
  SELECT COUNT(*) INTO with_legacy_key
  FROM payments WHERE idempotency_key LIKE 'legacy_%';
  
  SELECT COUNT(*) INTO with_expiration
  FROM payments WHERE expires_at IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ROLLBACK DA FASE 2 CONCLUÍDO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Idempotency keys legacy restantes: %', with_legacy_key;
  RAISE NOTICE 'Expires_at restantes: %', with_expiration;
  
  IF with_legacy_key = 0 AND with_expiration = 0 THEN
    RAISE NOTICE '✅ Rollback completo - Dados limpos';
  ELSE
    RAISE WARNING '⚠️ Alguns dados ainda presentes';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
