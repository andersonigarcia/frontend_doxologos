-- ================================================
-- AUDITORIA: Pagamentos aos Profissionais
-- Data: 2026-01-08
-- ================================================
-- 
-- OBJETIVO: Validar consistência dos pagamentos aos profissionais
-- Verificar cálculos, duplicações e status
-- ================================================
-- ================================================
-- 1. ESTATÍSTICAS GERAIS
-- ================================================
SELECT 
  'Total de Pagamentos' as metrica,
  COUNT(*) as valor
FROM professional_payments
UNION ALL
SELECT 
  'Pagamentos Pendentes',
  COUNT(*)
FROM professional_payments
WHERE status = 'pending'
UNION ALL
SELECT 
  'Pagamentos Pagos',
  COUNT(*)
FROM professional_payments
WHERE status = 'paid'
UNION ALL
SELECT 
  'Pagamentos Cancelados',
  COUNT(*)
FROM professional_payments
WHERE status = 'cancelled'
UNION ALL
SELECT 
  'Total de Bookings Incluídos',
  COUNT(*)
FROM payment_bookings;
-- ================================================
-- 2. VALIDAÇÃO DE CÁLCULOS
-- ================================================
WITH payment_sums AS (
  SELECT 
    pp.id,
    pp.total_amount as declarado,
    COALESCE(SUM(pb.amount), 0) as calculado,
    pp.total_bookings as bookings_declarados,
    COUNT(pb.id) as bookings_reais
  FROM professional_payments pp
  LEFT JOIN payment_bookings pb ON pp.id = pb.payment_id
  GROUP BY pp.id, pp.total_amount, pp.total_bookings
)
SELECT 
  '❌ Pagamentos com valor incorreto' as status,
  COUNT(*) as quantidade,
  SUM(ABS(declarado - calculado)) as diferenca_total
FROM payment_sums
WHERE ABS(declarado - calculado) > 0.01
UNION ALL
SELECT 
  '✅ Pagamentos com valor correto',
  COUNT(*),
  0
FROM payment_sums
WHERE ABS(declarado - calculado) <= 0.01;
-- Detalhe dos pagamentos com valor incorreto
WITH payment_sums AS (
  SELECT 
    pp.id,
    pp.professional_id,
    p.name as professional_name,
    pp.period_start,
    pp.period_end,
    pp.total_amount as declarado,
    COALESCE(SUM(pb.amount), 0) as calculado,
    pp.total_bookings as bookings_declarados,
    COUNT(pb.id) as bookings_reais,
    pp.status
  FROM professional_payments pp
  LEFT JOIN professionals p ON pp.professional_id = p.id
  LEFT JOIN payment_bookings pb ON pp.id = pb.payment_id
  GROUP BY pp.id, pp.professional_id, p.name, pp.period_start, pp.period_end, pp.total_amount, pp.total_bookings, pp.status
)
SELECT 
  id,
  professional_name,
  period_start,
  period_end,
  declarado,
  calculado,
  (declarado - calculado) as diferenca,
  bookings_declarados,
  bookings_reais,
  status
FROM payment_sums
WHERE ABS(declarado - calculado) > 0.01
ORDER BY ABS(declarado - calculado) DESC
LIMIT 20;
-- ================================================
-- 3. BOOKINGS DUPLICADOS
-- ================================================
SELECT 
  '❌ Bookings em múltiplos pagamentos' as status,
  COUNT(DISTINCT booking_id) as quantidade
FROM (
  SELECT booking_id, COUNT(*) as count
  FROM payment_bookings
  GROUP BY booking_id
  HAVING COUNT(*) > 1
) duplicates;
-- Detalhe dos bookings duplicados
SELECT 
  pb.booking_id,
  b.patient_name,
  b.booking_date,
  b.valor_repasse_profissional,
  COUNT(pb.payment_id) as num_pagamentos,
  STRING_AGG(pp.id::TEXT, ', ') as payment_ids,
  STRING_AGG(pp.status, ', ') as payment_statuses
FROM payment_bookings pb
JOIN bookings b ON pb.booking_id = b.id
JOIN professional_payments pp ON pb.payment_id = pp.id
GROUP BY pb.booking_id, b.patient_name, b.booking_date, b.valor_repasse_profissional
HAVING COUNT(pb.payment_id) > 1
ORDER BY COUNT(pb.payment_id) DESC
LIMIT 20;
-- ================================================
-- 4. STATUS VS DATAS
-- ================================================
-- Pagamentos "paid" sem payment_date
SELECT 
  '❌ Pagamentos "paid" sem data' as status,
  COUNT(*) as quantidade
FROM professional_payments
WHERE status = 'paid' AND payment_date IS NULL
UNION ALL
-- Pagamentos "pending" com payment_date
SELECT 
  '⚠️ Pagamentos "pending" com data',
  COUNT(*)
FROM professional_payments
WHERE status = 'pending' AND payment_date IS NOT NULL
UNION ALL
-- Pagamentos com data futura
SELECT 
  '⚠️ Pagamentos com data futura',
  COUNT(*)
FROM professional_payments
WHERE payment_date > CURRENT_DATE;
-- Detalhe das inconsistências
SELECT 
  pp.id,
  p.name as professional_name,
  pp.period_start,
  pp.period_end,
  pp.total_amount,
  pp.status,
  pp.payment_date,
  CASE 
    WHEN pp.status = 'paid' AND pp.payment_date IS NULL THEN 'Paid sem data'
    WHEN pp.status = 'pending' AND pp.payment_date IS NOT NULL THEN 'Pending com data'
    WHEN pp.payment_date > CURRENT_DATE THEN 'Data futura'
  END as problema
FROM professional_payments pp
JOIN professionals p ON pp.professional_id = p.id
WHERE 
  (pp.status = 'paid' AND pp.payment_date IS NULL)
  OR (pp.status = 'pending' AND pp.payment_date IS NOT NULL)
  OR (pp.payment_date > CURRENT_DATE)
ORDER BY pp.created_at DESC
LIMIT 20;
-- ================================================
-- 5. PERÍODOS SOBREPOSTOS
-- ================================================
WITH period_overlaps AS (
  SELECT 
    pp1.id as payment1_id,
    pp2.id as payment2_id,
    pp1.professional_id,
    pp1.period_start as start1,
    pp1.period_end as end1,
    pp2.period_start as start2,
    pp2.period_end as end2
  FROM professional_payments pp1
  JOIN professional_payments pp2 ON 
    pp1.professional_id = pp2.professional_id
    AND pp1.id < pp2.id
    AND pp1.period_start <= pp2.period_end
    AND pp1.period_end >= pp2.period_start
  WHERE pp1.status != 'cancelled' AND pp2.status != 'cancelled'
)
SELECT 
  '❌ Períodos sobrepostos encontrados' as status,
  COUNT(*) as quantidade
FROM period_overlaps;
-- Detalhe dos períodos sobrepostos
WITH period_overlaps AS (
  SELECT 
    pp1.id as payment1_id,
    pp2.id as payment2_id,
    pp1.professional_id,
    p.name as professional_name,
    pp1.period_start as start1,
    pp1.period_end as end1,
    pp1.total_amount as amount1,
    pp1.status as status1,
    pp2.period_start as start2,
    pp2.period_end as end2,
    pp2.total_amount as amount2,
    pp2.status as status2
  FROM professional_payments pp1
  JOIN professional_payments pp2 ON 
    pp1.professional_id = pp2.professional_id
    AND pp1.id < pp2.id
    AND pp1.period_start <= pp2.period_end
    AND pp1.period_end >= pp2.period_start
  JOIN professionals p ON pp1.professional_id = p.id
  WHERE pp1.status != 'cancelled' AND pp2.status != 'cancelled'
)
SELECT 
  professional_name,
  payment1_id,
  start1,
  end1,
  amount1,
  status1,
  payment2_id,
  start2,
  end2,
  amount2,
  status2
FROM period_overlaps
ORDER BY professional_name, start1
LIMIT 20;
-- ================================================
-- 6. BOOKINGS FORA DO PERÍODO
-- ================================================
SELECT 
  '❌ Bookings fora do período' as status,
  COUNT(*) as quantidade
FROM payment_bookings pb
JOIN professional_payments pp ON pb.payment_id = pp.id
JOIN bookings b ON pb.booking_id = b.id
WHERE b.booking_date < pp.period_start
   OR b.booking_date > pp.period_end;
-- Detalhe dos bookings fora do período
SELECT 
  pp.id as payment_id,
  p.name as professional_name,
  pp.period_start,
  pp.period_end,
  b.id as booking_id,
  b.booking_date,
  b.patient_name,
  pb.amount,
  CASE 
    WHEN b.booking_date < pp.period_start THEN 'Antes do período'
    WHEN b.booking_date > pp.period_end THEN 'Depois do período'
  END as problema
FROM payment_bookings pb
JOIN professional_payments pp ON pb.payment_id = pp.id
JOIN professionals p ON pp.professional_id = p.id
JOIN bookings b ON pb.booking_id = b.id
WHERE b.booking_date < pp.period_start
   OR b.booking_date > pp.period_end
ORDER BY pp.period_start, b.booking_date
LIMIT 20;
-- ================================================
-- 7. RESUMO POR PROFISSIONAL
-- ================================================
SELECT 
  p.name as profissional,
  COUNT(pp.id) as total_pagamentos,
  SUM(CASE WHEN pp.status = 'pending' THEN 1 ELSE 0 END) as pendentes,
  SUM(CASE WHEN pp.status = 'paid' THEN 1 ELSE 0 END) as pagos,
  SUM(CASE WHEN pp.status = 'cancelled' THEN 1 ELSE 0 END) as cancelados,
  SUM(pp.total_amount) as valor_total,
  SUM(CASE WHEN pp.status = 'pending' THEN pp.total_amount ELSE 0 END) as valor_pendente,
  SUM(CASE WHEN pp.status = 'paid' THEN pp.total_amount ELSE 0 END) as valor_pago
FROM professionals p
LEFT JOIN professional_payments pp ON p.id = pp.professional_id
GROUP BY p.id, p.name
HAVING COUNT(pp.id) > 0
ORDER BY valor_total DESC;
-- ================================================
-- 8. RESUMO EXECUTIVO
-- ================================================
WITH stats AS (
  SELECT 
    COUNT(*) as total_payments,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
    SUM(total_amount) as total_amount,
    SUM(CASE WHEN status = 'pending' THEN total_amount ELSE 0 END) as pending_amount,
    SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_amount
  FROM professional_payments
),
issues AS (
  SELECT 
    (SELECT COUNT(*) FROM (
      SELECT pp.id
      FROM professional_payments pp
      LEFT JOIN payment_bookings pb ON pp.id = pb.payment_id
      GROUP BY pp.id, pp.total_amount
      HAVING ABS(pp.total_amount - COALESCE(SUM(pb.amount), 0)) > 0.01
    ) t) as wrong_amounts,
    (SELECT COUNT(DISTINCT booking_id) FROM (
      SELECT booking_id
      FROM payment_bookings
      GROUP BY booking_id
      HAVING COUNT(*) > 1
    ) t) as duplicate_bookings,
    (SELECT COUNT(*) FROM professional_payments WHERE status = 'paid' AND payment_date IS NULL) as paid_no_date
)
SELECT 
  'Total de Pagamentos' as metrica,
  total_payments::TEXT as valor
FROM stats
UNION ALL SELECT 'Pagamentos Pendentes', pending_count::TEXT FROM stats
UNION ALL SELECT 'Pagamentos Pagos', paid_count::TEXT FROM stats
UNION ALL SELECT 'Valor Total', 'R$ ' || ROUND(total_amount, 2)::TEXT FROM stats
UNION ALL SELECT 'Valor Pendente', 'R$ ' || ROUND(pending_amount, 2)::TEXT FROM stats
UNION ALL SELECT 'Valor Pago', 'R$ ' || ROUND(paid_amount, 2)::TEXT FROM stats
UNION ALL SELECT '❌ Valores Incorretos', wrong_amounts::TEXT FROM issues
UNION ALL SELECT '❌ Bookings Duplicados', duplicate_bookings::TEXT FROM issues
UNION ALL SELECT '❌ Pagos sem Data', paid_no_date::TEXT FROM issues;
