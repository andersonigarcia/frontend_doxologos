-- ================================================
-- CORREÇÃO MANUAL: Agendamentos com Pagamento Aprovado
-- ================================================
-- Use este script APENAS se confirmar que:
-- 1. O pagamento foi aprovado no Mercado Pago
-- 2. O webhook não atualizou o booking
-- 3. Você verificou o payment_id no MP

-- ================================================
-- PASSO 1: IDENTIFICAR OS BOOKINGS PROBLEMÁTICOS
-- ================================================
-- Execute primeiro para ver os bookings que precisam correção

SELECT 
  b.id as booking_id,
  b.patient_name,
  b.status as booking_status,
  p.mp_payment_id,
  p.status as payment_status,
  p.amount
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized')
  AND b.status = 'pending'
ORDER BY p.created_at DESC;

-- ================================================
-- PASSO 2: ATUALIZAR BOOKINGS ESPECÍFICOS
-- ================================================
-- Substitua os IDs pelos bookings identificados acima

-- Exemplo para MARIA PAULA PRANDT GODOI
UPDATE bookings
SET 
  status = 'confirmed',
  updated_at = NOW()
WHERE patient_name = 'MARIA PAULA PRANDT GODOI'
  AND status = 'pending'
  AND id IN (
    SELECT booking_id 
    FROM payments 
    WHERE status IN ('approved', 'authorized')
  );

-- Exemplo para FABRICIO TALARICO
UPDATE bookings
SET 
  status = 'confirmed',
  updated_at = NOW()
WHERE patient_name = 'FABRICIO TALARICO'
  AND status = 'pending'
  AND id IN (
    SELECT booking_id 
    FROM payments 
    WHERE status IN ('approved', 'authorized')
  );

-- ================================================
-- PASSO 3: VERIFICAR CORREÇÃO
-- ================================================
-- Execute para confirmar que os bookings foram atualizados

SELECT 
  b.id,
  b.patient_name,
  b.status,
  b.payment_status,
  b.updated_at
FROM bookings b
WHERE b.patient_name IN ('MARIA PAULA PRANDT GODOI', 'FABRICIO TALARICO')
ORDER BY b.created_at DESC;

-- ================================================
-- CORREÇÃO EM MASSA (USE COM CUIDADO!)
-- ================================================
-- Atualiza TODOS os bookings com pagamento aprovado mas status pending
-- DESCOMENTE APENAS SE TIVER CERTEZA

/*
UPDATE bookings b
SET 
  status = 'confirmed',
  payment_status = p.status,
  updated_at = NOW()
FROM payments p
WHERE p.booking_id = b.id
  AND p.status IN ('approved', 'authorized')
  AND b.status = 'pending';
*/

-- ================================================
-- VERIFICAÇÃO FINAL
-- ================================================
-- Ver quantos bookings foram corrigidos

SELECT 
  COUNT(*) as total_corrigidos
FROM bookings b
INNER JOIN payments p ON p.booking_id = b.id
WHERE p.status IN ('approved', 'authorized')
  AND b.status = 'confirmed'
  AND b.updated_at >= NOW() - INTERVAL '5 minutes';
