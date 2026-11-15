-- ================================================
-- DIAGNÓSTICO: Webhooks de Pagamentos com Cartão
-- ================================================
-- Execute no Supabase Dashboard → SQL Editor
-- Este script ajuda a identificar problemas com confirmação
-- automática de pagamentos com cartão

-- ================================================
-- 1. VERIFICAR WEBHOOKS DE PAGAMENTOS COM CARTÃO
-- ================================================
SELECT 
  wl.id as webhook_log_id,
  wl.status as webhook_status,
  wl.error_message,
  wl.payload->>'type' as event_type,
  wl.payload->'data'->>'id' as mp_payment_id,
  p.id as payment_id,
  p.payment_method,
  p.status as payment_status,
  b.id as booking_id,
  b.status as booking_status,
  b.patient_name,
  wl.processed_at,
  wl.created_at
FROM webhook_logs wl
LEFT JOIN payments p ON p.mp_payment_id = wl.payload->'data'->>'id'
LEFT JOIN bookings b ON b.id = p.booking_id
WHERE wl.provider = 'mercadopago'
  AND (
    p.payment_method IN ('credit_card', 'debit_card', 'master', 'visa', 'elo', 'amex', 'hipercard')
    OR wl.payload->'data'->'payment_method_id' IS NOT NULL
  )
  AND wl.created_at >= NOW() - INTERVAL '7 days'
ORDER BY wl.created_at DESC
LIMIT 50;

-- ================================================
-- 2. INCONSISTÊNCIAS: Pagamentos com Cartão Aprovados mas Bookings Pendentes
-- ================================================
SELECT 
  b.id as booking_id,
  b.patient_name,
  b.patient_email,
  b.status as booking_status,
  b.payment_status as booking_payment_status,
  p.id as payment_id,
  p.mp_payment_id,
  p.status as payment_status,
  p.payment_method,
  p.amount,
  p.created_at as payment_created_at,
  b.created_at as booking_created_at,
  EXTRACT(EPOCH FROM (NOW() - p.created_at))/3600 as hours_since_payment
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized', 'paid')
  AND b.status = 'pending'
  AND p.payment_method IN ('credit_card', 'debit_card', 'master', 'visa', 'elo', 'amex', 'hipercard')
ORDER BY p.created_at DESC;

-- ================================================
-- 3. VERIFICAR SE WEBHOOKS FORAM RECEBIDOS PARA PAGAMENTOS COM CARTÃO
-- ================================================
SELECT 
  p.id as payment_id,
  p.mp_payment_id,
  p.payment_method,
  p.status as payment_status,
  p.created_at as payment_created,
  b.id as booking_id,
  b.status as booking_status,
  b.patient_name,
  COUNT(wl.id) as webhook_count,
  MAX(wl.created_at) as last_webhook_received,
  STRING_AGG(DISTINCT wl.status, ', ') as webhook_statuses
FROM payments p
LEFT JOIN bookings b ON b.id = p.booking_id
LEFT JOIN webhook_logs wl ON wl.payload->'data'->>'id' = p.mp_payment_id
WHERE p.payment_method IN ('credit_card', 'debit_card', 'master', 'visa', 'elo', 'amex', 'hipercard')
  AND p.created_at >= NOW() - INTERVAL '7 days'
GROUP BY p.id, p.mp_payment_id, p.payment_method, p.status, p.created_at, b.id, b.status, b.patient_name
ORDER BY p.created_at DESC;

-- ================================================
-- 4. ESTATÍSTICAS DE CONFIRMAÇÃO POR MÉTODO DE PAGAMENTO
-- ================================================
SELECT 
  p.payment_method,
  COUNT(*) as total_payments,
  COUNT(CASE WHEN p.status IN ('approved', 'authorized', 'paid') THEN 1 END) as approved_payments,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
  COUNT(CASE WHEN p.status IN ('approved', 'authorized', 'paid') AND b.status = 'pending' THEN 1 END) as inconsistencies,
  ROUND(
    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(CASE WHEN p.status IN ('approved', 'authorized', 'paid') THEN 1 END), 0),
    2
  ) as confirmation_rate_percent
FROM payments p
LEFT JOIN bookings b ON b.id = p.booking_id
WHERE p.created_at >= NOW() - INTERVAL '7 days'
  AND p.payment_method IS NOT NULL
GROUP BY p.payment_method
ORDER BY total_payments DESC;

-- ================================================
-- 5. ÚLTIMOS 20 PAGAMENTOS COM CARTÃO (DETALHADO)
-- ================================================
SELECT 
  p.id as payment_id,
  p.mp_payment_id,
  p.payment_method,
  p.status as payment_status,
  p.status_detail,
  p.amount,
  b.id as booking_id,
  b.status as booking_status,
  b.payment_status as booking_payment_status,
  b.patient_name,
  p.created_at as payment_created,
  b.updated_at as booking_updated,
  CASE 
    WHEN p.status IN ('approved', 'authorized', 'paid') AND b.status = 'confirmed' THEN '✅ OK'
    WHEN p.status IN ('approved', 'authorized', 'paid') AND b.status = 'pending' THEN '❌ INCONSISTENTE'
    ELSE 'ℹ️ PENDENTE'
  END as status_check
FROM payments p
LEFT JOIN bookings b ON b.id = p.booking_id
WHERE p.payment_method IN ('credit_card', 'debit_card', 'master', 'visa', 'elo', 'amex', 'hipercard')
ORDER BY p.created_at DESC
LIMIT 20;

-- ================================================
-- 6. VERIFICAR WEBHOOKS FALHADOS PARA CARTÃO
-- ================================================
SELECT 
  wl.id,
  wl.status as webhook_status,
  wl.error_message,
  wl.payload->'data'->>'id' as mp_payment_id,
  wl.payload->>'type' as event_type,
  wl.created_at,
  p.payment_method,
  p.status as payment_status
FROM webhook_logs wl
LEFT JOIN payments p ON p.mp_payment_id = wl.payload->'data'->>'id'
WHERE wl.provider = 'mercadopago'
  AND wl.status IN ('error', 'pending')
  AND p.payment_method IN ('credit_card', 'debit_card', 'master', 'visa', 'elo', 'amex', 'hipercard')
  AND wl.created_at >= NOW() - INTERVAL '7 days'
ORDER BY wl.created_at DESC;

-- ================================================
-- 7. COMPARAÇÃO PIX vs CARTÃO (Taxa de Confirmação)
-- ================================================
SELECT 
  CASE 
    WHEN p.payment_method = 'pix' THEN 'PIX'
    WHEN p.payment_method IN ('credit_card', 'debit_card', 'master', 'visa', 'elo', 'amex', 'hipercard') THEN 'CARTÃO'
    ELSE 'OUTRO'
  END as payment_type,
  COUNT(*) as total_payments,
  COUNT(CASE WHEN p.status IN ('approved', 'authorized', 'paid') THEN 1 END) as approved_count,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_count,
  ROUND(
    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(CASE WHEN p.status IN ('approved', 'authorized', 'paid') THEN 1 END), 0),
    2
  ) as confirmation_rate
FROM payments p
LEFT JOIN bookings b ON b.id = p.booking_id
WHERE p.created_at >= NOW() - INTERVAL '7 days'
GROUP BY payment_type
ORDER BY total_payments DESC;
