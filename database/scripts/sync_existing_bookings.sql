-- ================================================
-- Script: Sincronizar bookings pendentes com pagamentos aprovados
-- Data: 2026-01-08
-- Execute APÓS as migrations fix_bookings_payment_fields.sql
-- ================================================

-- ================================================
-- PASSO 1: DIAGNÓSTICO
-- ================================================

-- 1.1 Identificar bookings problemáticos
SELECT 
  '=== BOOKINGS COM PAGAMENTO APROVADO MAS STATUS PENDING ===' as diagnostico;

SELECT 
  b.id,
  b.patient_name,
  b.patient_email,
  b.booking_date,
  b.booking_time,
  b.status as booking_status,
  b.payment_status,
  p.status as payment_status_real,
  p.mp_payment_id,
  p.amount,
  p.created_at as payment_created_at,
  EXTRACT(EPOCH FROM (NOW() - p.created_at))/3600 as hours_waiting
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized')
  AND b.status = 'pending'
ORDER BY p.created_at DESC;

-- 1.2 Contar total de bookings a corrigir
SELECT 
  'Total de bookings a corrigir' as metrica,
  COUNT(*) as total
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized')
  AND b.status = 'pending';

-- ================================================
-- PASSO 2: CORREÇÃO
-- ================================================

-- 2.1 Atualizar bookings com pagamento aprovado
UPDATE bookings b
SET 
  status = 'confirmed',
  payment_status = p.status,
  marketplace_payment_id = p.mp_payment_id,
  updated_at = NOW()
FROM payments p
WHERE p.booking_id = b.id
  AND p.status IN ('approved', 'authorized')
  AND b.status = 'pending';

-- ================================================
-- PASSO 3: VERIFICAÇÃO
-- ================================================

-- 3.1 Verificar bookings corrigidos recentemente
SELECT 
  '=== BOOKINGS CORRIGIDOS (últimos 5 minutos) ===' as resultado;

SELECT 
  b.id,
  b.patient_name,
  b.status,
  b.payment_status,
  b.marketplace_payment_id,
  b.updated_at
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized')
  AND b.status = 'confirmed'
  AND b.updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY b.updated_at DESC;

-- 3.2 Contar total corrigido
SELECT 
  'Bookings corrigidos' as resultado,
  COUNT(*) as total
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized')
  AND b.status = 'confirmed'
  AND b.updated_at > NOW() - INTERVAL '5 minutes';

-- 3.3 Verificar se ainda há inconsistências
SELECT 
  '=== VERIFICAÇÃO FINAL ===' as verificacao;

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Nenhuma inconsistência encontrada'
    ELSE '❌ Ainda há ' || COUNT(*) || ' bookings pendentes com pagamento aprovado'
  END as status
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized')
  AND b.status = 'pending';

-- 3.4 Listar inconsistências restantes (se houver)
SELECT 
  b.id,
  b.patient_name,
  b.status,
  p.status as payment_status,
  p.mp_payment_id
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized')
  AND b.status = 'pending'
ORDER BY p.created_at DESC;
