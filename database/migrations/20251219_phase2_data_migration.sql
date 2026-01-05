-- =====================================================
-- FASE 2: Migração de Dados Existentes
-- IMPACTO: BAIXO - Apenas preenche colunas vazias
-- DATA: 2025-12-19
-- =====================================================

-- Descrição:
-- Esta migração preenche as novas colunas criadas na Fase 1
-- para todos os pagamentos existentes no banco de dados.
-- Não afeta o funcionamento do sistema.

-- =====================================================
-- 1. Gerar idempotency_key para pagamentos existentes
-- =====================================================

-- Para pagamentos que ainda não têm idempotency_key
-- Usar prefixo 'legacy_' para identificar dados migrados
UPDATE payments
SET idempotency_key = CONCAT('legacy_', id::text)
WHERE idempotency_key IS NULL;

-- Verificar resultado
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM payments
  WHERE idempotency_key LIKE 'legacy_%';
  
  RAISE NOTICE '✅ % pagamentos receberam idempotency_key', updated_count;
END $$;

-- =====================================================
-- 2. Definir expires_at para pagamentos pendentes
-- =====================================================

-- Pagamentos pendentes: dar 7 dias de prazo (não expirar imediatamente)
-- Isso evita expirar pagamentos que ainda podem ser confirmados
UPDATE payments
SET expires_at = created_at + INTERVAL '7 days'
WHERE status IN ('pending', 'in_process')
  AND expires_at IS NULL;

-- Verificar resultado
DO $$
DECLARE
  pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM payments
  WHERE status IN ('pending', 'in_process')
    AND expires_at IS NOT NULL;
  
  RAISE NOTICE '✅ % pagamentos pendentes têm data de expiração', pending_count;
END $$;

-- =====================================================
-- 3. Marcar pagamentos aprovados como nunca expirando
-- =====================================================

-- Pagamentos aprovados: definir data muito distante (100 anos)
-- Isso garante que nunca serão marcados como expirados
UPDATE payments
SET expires_at = created_at + INTERVAL '100 years'
WHERE status = 'approved'
  AND expires_at IS NULL;

-- Verificar resultado
DO $$
DECLARE
  approved_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO approved_count
  FROM payments
  WHERE status = 'approved'
    AND expires_at IS NOT NULL;
  
  RAISE NOTICE '✅ % pagamentos aprovados marcados como permanentes', approved_count;
END $$;

-- =====================================================
-- 4. Definir expires_at para pagamentos rejeitados/cancelados
-- =====================================================

-- Pagamentos rejeitados/cancelados: já expiraram no momento da rejeição
UPDATE payments
SET expires_at = created_at
WHERE status IN ('rejected', 'cancelled', 'refunded', 'charged_back')
  AND expires_at IS NULL;

-- Verificar resultado
DO $$
DECLARE
  failed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO failed_count
  FROM payments
  WHERE status IN ('rejected', 'cancelled', 'refunded', 'charged_back')
    AND expires_at IS NOT NULL;
  
  RAISE NOTICE '✅ % pagamentos falhos marcados como expirados', failed_count;
END $$;

-- =====================================================
-- 5. Inicializar payment_attempt_count
-- =====================================================

-- Todos os pagamentos existentes são considerados primeira tentativa
-- (já tem DEFAULT 1, mas garantir para dados antigos)
UPDATE payments
SET payment_attempt_count = 1
WHERE payment_attempt_count IS NULL;

-- =====================================================
-- 6. Verificação de integridade pós-migração
-- =====================================================

-- Verificar que TODOS os pagamentos têm idempotency_key
DO $$
DECLARE
  total_payments INTEGER;
  with_idempotency INTEGER;
  with_expiration INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_payments FROM payments;
  
  SELECT COUNT(*) INTO with_idempotency 
  FROM payments WHERE idempotency_key IS NOT NULL;
  
  SELECT COUNT(*) INTO with_expiration 
  FROM payments WHERE expires_at IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO PÓS-MIGRAÇÃO - FASE 2';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de pagamentos: %', total_payments;
  RAISE NOTICE 'Com idempotency_key: %', with_idempotency;
  RAISE NOTICE 'Com expires_at: %', with_expiration;
  
  IF with_idempotency = total_payments AND with_expiration = total_payments THEN
    RAISE NOTICE '✅ MIGRAÇÃO COMPLETA - Todos os dados migrados';
  ELSE
    RAISE WARNING '⚠️ ATENÇÃO - Alguns registros não foram migrados';
    RAISE WARNING 'Faltam % idempotency_key', (total_payments - with_idempotency);
    RAISE WARNING 'Faltam % expires_at', (total_payments - with_expiration);
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 7. Validar agendamentos confirmados (CRÍTICO)
-- =====================================================

-- Verificar que agendamentos confirmados não foram afetados
SELECT 
  'Agendamentos Confirmados' as verificacao,
  COUNT(*) as total,
  COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as com_pagamento_aprovado
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
WHERE b.status = 'confirmed'
  AND b.created_at > NOW() - INTERVAL '30 days';

-- =====================================================
-- 8. Estatísticas da migração
-- =====================================================

SELECT 
  status,
  COUNT(*) as quantidade,
  COUNT(CASE WHEN idempotency_key LIKE 'legacy_%' THEN 1 END) as migrados,
  MIN(expires_at) as primeira_expiracao,
  MAX(expires_at) as ultima_expiracao
FROM payments
GROUP BY status
ORDER BY quantidade DESC;

-- =====================================================
-- FIM DA MIGRAÇÃO - FASE 2
-- =====================================================

-- PRÓXIMOS PASSOS:
-- 1. Validar que todos os pagamentos têm idempotency_key
-- 2. Confirmar que agendamentos confirmados estão intactos
-- 3. Aguardar 24-48h monitorando
-- 4. Prosseguir para Fase 3: Deploy do código com feature flags
