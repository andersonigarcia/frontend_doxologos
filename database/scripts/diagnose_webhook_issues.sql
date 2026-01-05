-- ================================================
-- DIAGNÓSTICO SIMPLIFICADO: Webhook de Pagamentos
-- ================================================
-- Queries corrigidas para estrutura real da tabela
-- Execute no Supabase Dashboard → SQL Editor

-- ================================================
-- 1. VERIFICAR AGENDAMENTOS PROBLEMÁTICOS
-- ================================================
SELECT 
  b.id as booking_id,
  b.patient_name,
  b.patient_email,
  b.booking_date,
  b.booking_time,
  b.status as booking_status,
  b.valor_consulta,
  b.created_at,
  b.updated_at
FROM bookings b
WHERE b.status = 'pending'
  AND (
    b.patient_name ILIKE '%MARIA PAULA%' 
    OR b.patient_name ILIKE '%FABRICIO%'
  )
ORDER BY b.created_at DESC;

-- ================================================
-- 2. VERIFICAR PAGAMENTOS ASSOCIADOS
-- ================================================
SELECT 
  p.id as payment_id,
  p.booking_id,
  p.mp_payment_id,
  p.amount,
  p.status as payment_status,
  p.payment_method,
  p.external_reference,
  p.created_at,
  p.updated_at,
  b.patient_name,
  b.status as booking_status
FROM payments p
LEFT JOIN bookings b ON b.id = p.booking_id
WHERE b.patient_name ILIKE '%MARIA PAULA%' 
   OR b.patient_name ILIKE '%FABRICIO%'
ORDER BY p.created_at DESC;

-- ================================================
-- 3. VERIFICAR LOGS DE WEBHOOK (Últimos 50)
-- ================================================
SELECT 
  wl.id as log_id,
  wl.status as webhook_status,
  wl.error_message,
  wl.payload->>'type' as event_type,
  wl.payload->'data'->>'id' as mp_payment_id,
  wl.created_at
FROM webhook_logs wl
WHERE wl.provider = 'mercadopago'
  AND wl.created_at >= NOW() - INTERVAL '7 days'
ORDER BY wl.created_at DESC
LIMIT 50;

-- ================================================
-- 4. BUSCAR WEBHOOKS FALHADOS
-- ================================================
SELECT 
  wl.id,
  wl.status,
  wl.error_message,
  wl.payload->'data'->>'id' as mp_payment_id,
  wl.created_at
FROM webhook_logs wl
WHERE wl.provider = 'mercadopago'
  AND wl.status IN ('error', 'pending')
  AND wl.created_at >= NOW() - INTERVAL '7 days'
ORDER BY wl.created_at DESC;

-- ================================================
-- 5. VERIFICAR BOOKINGS PENDENTES (> 1 hora)
-- ================================================
SELECT 
  b.id,
  b.patient_name,
  b.patient_email,
  b.status,
  b.valor_consulta,
  b.created_at,
  EXTRACT(EPOCH FROM (NOW() - b.created_at))/3600 as hours_pending,
  p.mp_payment_id,
  p.status as payment_status
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
WHERE b.status = 'pending'
  AND b.created_at < NOW() - INTERVAL '1 hour'
ORDER BY b.created_at DESC;

-- ================================================
-- 6. INCONSISTÊNCIAS: Pagamentos aprovados mas bookings pendentes
-- ================================================
SELECT 
  b.id as booking_id,
  b.patient_name,
  b.status as booking_status,
  p.id as payment_id,
  p.mp_payment_id,
  p.status as payment_status,
  p.amount,
  p.created_at as payment_created_at
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized')
  AND b.status = 'pending'
ORDER BY p.created_at DESC;

-- ================================================
-- 7. ESTATÍSTICAS DE WEBHOOK (Últimos 7 dias)
-- ================================================
SELECT 
  status,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM webhook_logs
WHERE provider = 'mercadopago'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY status
ORDER BY total DESC;

-- ================================================
-- 8. ÚLTIMOS 20 WEBHOOKS
-- ================================================
SELECT 
  id,
  status,
  error_message,
  payload->>'type' as type,
  payload->'data'->>'id' as payment_id,
  created_at
FROM webhook_logs
WHERE provider = 'mercadopago'
ORDER BY created_at DESC
LIMIT 20;

-- ================================================
-- 9. VERIFICAR AGENDAMENTOS ESPECÍFICOS
-- ================================================
SELECT 
  b.id,
  b.patient_name,
  b.booking_date,
  b.booking_time,
  b.status,
  b.created_at,
  p.mp_payment_id,
  p.status as payment_status,
  p.amount
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
WHERE b.patient_name IN ('MARIA PAULA PRANDT GODOI', 'FABRICIO TALARICO')
ORDER BY b.created_at DESC;
