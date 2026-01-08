-- ================================================
-- Health Check: Monitoramento de Webhooks e Pagamentos
-- Data: 2026-01-08
-- Execute periodicamente para monitorar saúde do sistema
-- ================================================

-- ================================================
-- 1. TAXA DE SUCESSO DE WEBHOOKS (Últimas 24h)
-- ================================================
SELECT 
  '=== WEBHOOKS - ÚLTIMAS 24 HORAS ===' as metrica;

SELECT 
  status,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM webhook_logs
WHERE provider = 'mercadopago'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY total DESC;

-- ================================================
-- 2. INCONSISTÊNCIAS ATIVAS (CRÍTICO)
-- ================================================
SELECT 
  '=== ⚠️ INCONSISTÊNCIAS ATIVAS ===' as alerta;

SELECT 
  b.id,
  b.patient_name,
  b.patient_email,
  b.booking_date,
  b.booking_time,
  b.status as booking_status,
  b.payment_status as booking_payment_status,
  p.status as payment_status_real,
  p.mp_payment_id,
  ROUND(EXTRACT(EPOCH FROM (NOW() - p.created_at))/3600, 2) as hours_waiting
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized')
  AND b.status != 'confirmed'
ORDER BY p.created_at DESC;

-- Contar inconsistências
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Nenhuma inconsistência ativa'
    ELSE '❌ ' || COUNT(*) || ' bookings precisam de atenção'
  END as status_inconsistencias
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized')
  AND b.status != 'confirmed';

-- ================================================
-- 3. WEBHOOKS FALHADOS RECENTES (Última Hora)
-- ================================================
SELECT 
  '=== WEBHOOKS FALHADOS - ÚLTIMA HORA ===' as metrica;

SELECT 
  id,
  status,
  error_message,
  payload->'data'->>'id' as mp_payment_id,
  payload->>'type' as event_type,
  created_at
FROM webhook_logs
WHERE provider = 'mercadopago'
  AND status = 'error'
  AND created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- ================================================
-- 4. RESUMO GERAL DO SISTEMA
-- ================================================
SELECT 
  '=== RESUMO GERAL ===' as metrica;

SELECT 
  'Bookings Pendentes' as categoria,
  COUNT(*) as total
FROM bookings 
WHERE status = 'pending'
UNION ALL
SELECT 
  'Bookings Confirmados' as categoria,
  COUNT(*) as total
FROM bookings 
WHERE status = 'confirmed'
UNION ALL
SELECT 
  'Pagamentos Aprovados' as categoria,
  COUNT(*) as total
FROM payments 
WHERE status = 'approved'
UNION ALL
SELECT 
  'Pagamentos Pendentes' as categoria,
  COUNT(*) as total
FROM payments 
WHERE status = 'pending'
UNION ALL
SELECT 
  'Webhooks Sucesso (24h)' as categoria,
  COUNT(*) as total
FROM webhook_logs
WHERE provider = 'mercadopago'
  AND status = 'success'
  AND created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'Webhooks Erro (24h)' as categoria,
  COUNT(*) as total
FROM webhook_logs
WHERE provider = 'mercadopago'
  AND status = 'error'
  AND created_at >= NOW() - INTERVAL '24 hours';

-- ================================================
-- 5. BOOKINGS RECENTES (Últimas 24h)
-- ================================================
SELECT 
  '=== BOOKINGS RECENTES (24h) ===' as metrica;

SELECT 
  b.id,
  b.patient_name,
  b.status,
  b.payment_status,
  p.status as payment_status_real,
  p.mp_payment_id,
  b.created_at
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
WHERE b.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY b.created_at DESC
LIMIT 20;

-- ================================================
-- 6. ALERTAS E RECOMENDAÇÕES
-- ================================================
SELECT 
  '=== ALERTAS E RECOMENDAÇÕES ===' as secao;

-- 6.1 Verificar taxa de sucesso de webhooks
WITH webhook_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE status = 'success') as success_count,
    COUNT(*) as total_count
  FROM webhook_logs
  WHERE provider = 'mercadopago'
    AND created_at >= NOW() - INTERVAL '24 hours'
)
SELECT 
  CASE 
    WHEN total_count = 0 THEN '⚠️ Nenhum webhook recebido nas últimas 24h'
    WHEN success_count * 100.0 / total_count >= 95 THEN '✅ Taxa de sucesso de webhooks saudável (' || ROUND(success_count * 100.0 / total_count, 2) || '%)'
    ELSE '❌ Taxa de sucesso de webhooks abaixo do esperado (' || ROUND(success_count * 100.0 / total_count, 2) || '%) - Investigar erros'
  END as alerta_webhooks
FROM webhook_stats;

-- 6.2 Verificar bookings antigos pendentes
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Nenhum booking antigo pendente'
    ELSE '⚠️ ' || COUNT(*) || ' bookings pendentes há mais de 24h - Verificar manualmente'
  END as alerta_bookings_antigos
FROM bookings
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours';
