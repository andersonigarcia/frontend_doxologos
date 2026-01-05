-- =====================================================
-- SCRIPT DE VALIDAÇÃO - FASE 2
-- Execute após a migração de dados para verificar
-- =====================================================

-- =====================================================
-- 1. Verificar cobertura completa
-- =====================================================

SELECT 
  'Cobertura de Migração' as verificacao,
  COUNT(*) as total_pagamentos,
  COUNT(idempotency_key) as com_idempotency,
  COUNT(expires_at) as com_expiracao,
  COUNT(payment_attempt_count) as com_attempt_count,
  ROUND(COUNT(idempotency_key)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as percentual_idempotency,
  ROUND(COUNT(expires_at)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as percentual_expiracao
FROM payments;

-- Resultado esperado: 100% de cobertura

-- =====================================================
-- 2. Verificar distribuição por status
-- =====================================================

SELECT 
  status,
  COUNT(*) as total,
  COUNT(idempotency_key) as com_idempotency,
  COUNT(expires_at) as com_expiracao,
  MIN(expires_at) as expira_em_min,
  MAX(expires_at) as expira_em_max
FROM payments
GROUP BY status
ORDER BY total DESC;

-- =====================================================
-- 3. Verificar pagamentos pendentes (CRÍTICO)
-- =====================================================

-- Pagamentos pendentes devem ter expires_at no futuro
SELECT 
  id,
  booking_id,
  status,
  created_at,
  expires_at,
  EXTRACT(DAY FROM (expires_at - NOW())) as dias_ate_expirar
FROM payments
WHERE status IN ('pending', 'in_process')
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY expires_at ASC
LIMIT 10;

-- Resultado esperado: dias_ate_expirar > 0

-- =====================================================
-- 4. Verificar pagamentos aprovados (CRÍTICO)
-- =====================================================

-- Pagamentos aprovados devem ter expires_at muito distante
SELECT 
  COUNT(*) as total_aprovados,
  MIN(expires_at) as expiracao_minima,
  MAX(expires_at) as expiracao_maxima,
  COUNT(CASE WHEN expires_at > NOW() + INTERVAL '50 years' THEN 1 END) as com_expiracao_distante
FROM payments
WHERE status = 'approved';

-- Resultado esperado: com_expiracao_distante = total_aprovados

-- =====================================================
-- 5. Verificar agendamentos confirmados (CRÍTICO)
-- =====================================================

-- CRÍTICO: Agendamentos confirmados não devem ser afetados
SELECT 
  b.id,
  b.status as booking_status,
  b.booking_date,
  b.patient_name,
  p.status as payment_status,
  p.idempotency_key,
  p.expires_at
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
WHERE b.status = 'confirmed'
  AND b.created_at > NOW() - INTERVAL '30 days'
ORDER BY b.created_at DESC
LIMIT 10;

-- Resultado esperado: Todos os bookings confirmados visíveis e intactos

-- =====================================================
-- 6. Verificar idempotency_key únicos
-- =====================================================

-- Verificar se há duplicatas (não deveria ter)
SELECT 
  idempotency_key,
  COUNT(*) as quantidade
FROM payments
WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key
HAVING COUNT(*) > 1;

-- Resultado esperado: 0 linhas (sem duplicatas)

-- =====================================================
-- 7. Verificar padrão de idempotency_key
-- =====================================================

SELECT 
  'Padrão de Idempotency Key' as verificacao,
  COUNT(CASE WHEN idempotency_key LIKE 'legacy_%' THEN 1 END) as legacy_keys,
  COUNT(CASE WHEN idempotency_key NOT LIKE 'legacy_%' THEN 1 END) as new_keys,
  COUNT(*) as total
FROM payments
WHERE idempotency_key IS NOT NULL;

-- =====================================================
-- 8. Verificar expires_at razoáveis
-- =====================================================

-- Verificar se não há datas absurdas
SELECT 
  'Datas de Expiração' as verificacao,
  COUNT(CASE WHEN expires_at < created_at THEN 1 END) as expira_antes_criacao,
  COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as ja_expirados,
  COUNT(CASE WHEN expires_at > NOW() + INTERVAL '1 year' THEN 1 END) as expira_apos_1_ano
FROM payments
WHERE expires_at IS NOT NULL;

-- =====================================================
-- 9. Resumo final
-- =====================================================

DO $$
DECLARE
  total_payments INTEGER;
  all_have_idempotency BOOLEAN;
  all_have_expiration BOOLEAN;
  bookings_ok BOOLEAN;
BEGIN
  -- Contar totais
  SELECT COUNT(*) INTO total_payments FROM payments;
  
  -- Verificar cobertura completa
  SELECT COUNT(*) = total_payments INTO all_have_idempotency
  FROM payments WHERE idempotency_key IS NOT NULL;
  
  SELECT COUNT(*) = total_payments INTO all_have_expiration
  FROM payments WHERE expires_at IS NOT NULL;
  
  -- Verificar bookings confirmados
  SELECT COUNT(*) > 0 INTO bookings_ok
  FROM bookings WHERE status = 'confirmed';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO DA VALIDAÇÃO - FASE 2';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de pagamentos: %', total_payments;
  RAISE NOTICE 'Todos têm idempotency_key: %', all_have_idempotency;
  RAISE NOTICE 'Todos têm expires_at: %', all_have_expiration;
  RAISE NOTICE 'Bookings confirmados OK: %', bookings_ok;
  
  IF all_have_idempotency AND all_have_expiration AND bookings_ok THEN
    RAISE NOTICE '✅ VALIDAÇÃO PASSOU - Migração bem-sucedida';
  ELSE
    RAISE WARNING '⚠️ VALIDAÇÃO FALHOU - Verificar manualmente';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;
