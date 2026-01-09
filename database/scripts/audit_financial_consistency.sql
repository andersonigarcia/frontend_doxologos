-- ================================================
-- AUDITORIA: Consistência Financeira Geral
-- Data: 2026-01-08
-- ================================================
-- 
-- OBJETIVO: Validar consistência entre todos os sistemas financeiros
-- Verificar Bookings vs Ledger, Receita vs Repasses, Lucro/Prejuízo
-- ================================================
-- ================================================
-- 1. BOOKINGS VS LEDGER
-- ================================================
-- Bookings confirmados sem ledger
SELECT 
  '❌ Bookings confirmados sem ledger' as status,
  COUNT(*) as quantidade,
  SUM(valor_consulta) as receita_nao_contabilizada
FROM bookings b
WHERE b.status IN ('confirmed', 'paid', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM payment_ledger_entries l
    WHERE l.transaction_id = b.id
      AND l.account_code = 'REVENUE_SERVICE'
  );
-- Detalhe dos bookings sem ledger
SELECT 
  b.id,
  b.patient_name,
  b.booking_date,
  b.status,
  b.valor_consulta,
  b.valor_repasse_profissional,
  b.created_at::DATE as criado_em
FROM bookings b
WHERE b.status IN ('confirmed', 'paid', 'completed')
  AND NOT EXISTS (
    SELECT 1 FROM payment_ledger_entries l
    WHERE l.transaction_id = b.id
      AND l.account_code = 'REVENUE_SERVICE'
  )
ORDER BY b.booking_date DESC
LIMIT 20;
-- ================================================
-- 2. RECEITA: BOOKINGS VS LEDGER
-- ================================================
WITH bookings_revenue AS (
  SELECT 
    SUM(valor_consulta) as total
  FROM bookings
  WHERE status IN ('confirmed', 'paid', 'completed')
),
ledger_revenue AS (
  SELECT 
    SUM(amount) as total
  FROM payment_ledger_entries
  WHERE entry_type = 'CREDIT'
    AND account_code = 'REVENUE_SERVICE'
)
SELECT 
  'Receita em Bookings' as fonte,
  'R$ ' || ROUND(COALESCE(br.total, 0), 2) as valor
FROM bookings_revenue br
UNION ALL
SELECT 
  'Receita no Ledger',
  'R$ ' || ROUND(COALESCE(lr.total, 0), 2)
FROM ledger_revenue lr
UNION ALL
SELECT 
  'Diferença',
  'R$ ' || ROUND(COALESCE(br.total, 0) - COALESCE(lr.total, 0), 2)
FROM bookings_revenue br, ledger_revenue lr;
-- ================================================
-- 3. REPASSES: BOOKINGS VS LEDGER
-- ================================================
WITH bookings_payouts AS (
  SELECT 
    SUM(valor_repasse_profissional) as total
  FROM bookings
  WHERE status IN ('confirmed', 'paid', 'completed')
),
ledger_payouts AS (
  SELECT 
    SUM(amount) as total
  FROM payment_ledger_entries
  WHERE entry_type = 'CREDIT'
    AND account_code = 'LIABILITY_PROFESSIONAL'
)
SELECT 
  'Repasses em Bookings' as fonte,
  'R$ ' || ROUND(COALESCE(bp.total, 0), 2) as valor
FROM bookings_payouts bp
UNION ALL
SELECT 
  'Repasses no Ledger',
  'R$ ' || ROUND(COALESCE(lp.total, 0), 2)
FROM ledger_payouts lp
UNION ALL
SELECT 
  'Diferença',
  'R$ ' || ROUND(COALESCE(bp.total, 0) - COALESCE(lp.total, 0), 2)
FROM bookings_payouts bp, ledger_payouts lp;
-- ================================================
-- 4. MARGEM DA PLATAFORMA
-- ================================================
WITH ledger_data AS (
  SELECT 
    SUM(CASE WHEN account_code = 'REVENUE_SERVICE' THEN amount ELSE 0 END) as revenue,
    SUM(CASE WHEN account_code = 'LIABILITY_PROFESSIONAL' THEN amount ELSE 0 END) as payouts
  FROM payment_ledger_entries
  WHERE entry_type = 'CREDIT'
)
SELECT 
  'Receita Total' as metrica,
  'R$ ' || ROUND(revenue, 2) as valor
FROM ledger_data
UNION ALL
SELECT 
  'Repasses Totais',
  'R$ ' || ROUND(payouts, 2)
FROM ledger_data
UNION ALL
SELECT 
  'Margem da Plataforma',
  'R$ ' || ROUND(revenue - payouts, 2)
FROM ledger_data
UNION ALL
SELECT 
  'Margem %',
  ROUND((revenue - payouts) / NULLIF(revenue, 0) * 100, 2)::TEXT || '%'
FROM ledger_data;
-- ================================================
-- 5. CUSTOS OPERACIONAIS
-- ================================================
SELECT 
  category as categoria,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM platform_costs
WHERE cost_date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY category
ORDER BY total DESC;
-- Total de custos
SELECT 
  'Total de Custos' as metrica,
  'R$ ' || ROUND(SUM(amount), 2) as valor
FROM platform_costs
WHERE cost_date >= DATE_TRUNC('year', CURRENT_DATE);
-- ================================================
-- 6. LUCRO/PREJUÍZO
-- ================================================
WITH financials AS (
  SELECT 
    SUM(CASE WHEN account_code = 'REVENUE_SERVICE' THEN amount ELSE 0 END) as revenue,
    SUM(CASE WHEN account_code = 'LIABILITY_PROFESSIONAL' THEN amount ELSE 0 END) as payouts
  FROM payment_ledger_entries
  WHERE entry_type = 'CREDIT'
),
costs AS (
  SELECT SUM(amount) as total
  FROM platform_costs
  WHERE cost_date >= DATE_TRUNC('year', CURRENT_DATE)
)
SELECT 
  'Receita Total' as metrica,
  'R$ ' || ROUND(f.revenue, 2) as valor
FROM financials f
UNION ALL
SELECT 
  'Repasses Totais',
  'R$ ' || ROUND(f.payouts, 2)
FROM financials f
UNION ALL
SELECT 
  'Margem da Plataforma',
  'R$ ' || ROUND(f.revenue - f.payouts, 2)
FROM financials f
UNION ALL
SELECT 
  'Custos Operacionais',
  'R$ ' || ROUND(c.total, 2)
FROM costs c
UNION ALL
SELECT 
  'Lucro/Prejuízo',
  'R$ ' || ROUND((f.revenue - f.payouts) - c.total, 2)
FROM financials f, costs c
UNION ALL
SELECT 
  'Margem de Lucro %',
  ROUND(((f.revenue - f.payouts) - c.total) / NULLIF(f.revenue, 0) * 100, 2)::TEXT || '%'
FROM financials f, costs c;
-- ================================================
-- 7. ANÁLISE POR PERÍODO (Últimos 6 Meses)
-- ================================================
WITH monthly_data AS (
  SELECT 
    TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as mes,
    SUM(CASE WHEN account_code = 'REVENUE_SERVICE' THEN amount ELSE 0 END) as receita,
    SUM(CASE WHEN account_code = 'LIABILITY_PROFESSIONAL' THEN amount ELSE 0 END) as repasses
  FROM payment_ledger_entries
  WHERE entry_type = 'CREDIT'
    AND created_at >= NOW() - INTERVAL '6 months'
  GROUP BY DATE_TRUNC('month', created_at)
),
monthly_costs AS (
  SELECT 
    TO_CHAR(DATE_TRUNC('month', cost_date), 'YYYY-MM') as mes,
    SUM(amount) as custos
  FROM platform_costs
  WHERE cost_date >= NOW() - INTERVAL '6 months'
  GROUP BY DATE_TRUNC('month', cost_date)
)
SELECT 
  md.mes,
  ROUND(md.receita, 2) as receita,
  ROUND(md.repasses, 2) as repasses,
  ROUND(md.receita - md.repasses, 2) as margem,
  ROUND(COALESCE(mc.custos, 0), 2) as custos,
  ROUND((md.receita - md.repasses) - COALESCE(mc.custos, 0), 2) as lucro
FROM monthly_data md
LEFT JOIN monthly_costs mc ON md.mes = mc.mes
ORDER BY md.mes DESC;
-- ================================================
-- 8. PAGAMENTOS PROFISSIONAIS VS LEDGER
-- ================================================
WITH professional_payments_total AS (
  SELECT 
    SUM(total_amount) as total
  FROM professional_payments
  WHERE status = 'paid'
),
ledger_payouts AS (
  SELECT 
    SUM(amount) as total
  FROM payment_ledger_entries
  WHERE entry_type = 'CREDIT'
    AND account_code = 'LIABILITY_PROFESSIONAL'
)
SELECT 
  'Pagamentos Profissionais (Pagos)' as fonte,
  'R$ ' || ROUND(COALESCE(pp.total, 0), 2) as valor
FROM professional_payments_total pp
UNION ALL
SELECT 
  'Repasses no Ledger',
  'R$ ' || ROUND(COALESCE(lp.total, 0), 2)
FROM ledger_payouts lp
UNION ALL
SELECT 
  'Diferença',
  'R$ ' || ROUND(COALESCE(pp.total, 0) - COALESCE(lp.total, 0), 2)
FROM professional_payments_total pp, ledger_payouts lp;
-- ================================================
-- 9. RESUMO EXECUTIVO
-- ================================================
WITH summary AS (
  SELECT 
    (SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed', 'paid', 'completed')) as total_bookings,
    (SELECT SUM(amount) FROM payment_ledger_entries WHERE entry_type = 'CREDIT' AND account_code = 'REVENUE_SERVICE') as ledger_revenue,
    (SELECT SUM(amount) FROM payment_ledger_entries WHERE entry_type = 'CREDIT' AND account_code = 'LIABILITY_PROFESSIONAL') as ledger_payouts,
    (SELECT SUM(amount) FROM platform_costs WHERE cost_date >= DATE_TRUNC('year', CURRENT_DATE)) as total_costs,
    (SELECT COUNT(*) FROM bookings WHERE status IN ('confirmed', 'paid', 'completed') AND NOT EXISTS (
      SELECT 1 FROM payment_ledger_entries WHERE transaction_id = bookings.id AND account_code = 'REVENUE_SERVICE'
    )) as bookings_without_ledger
)
SELECT 
  'Total de Bookings' as metrica,
  total_bookings::TEXT as valor
FROM summary
UNION ALL SELECT 'Receita Total (Ledger)', 'R$ ' || ROUND(ledger_revenue, 2)::TEXT FROM summary
UNION ALL SELECT 'Repasses Totais (Ledger)', 'R$ ' || ROUND(ledger_payouts, 2)::TEXT FROM summary
UNION ALL SELECT 'Margem da Plataforma', 'R$ ' || ROUND(ledger_revenue - ledger_payouts, 2)::TEXT FROM summary
UNION ALL SELECT 'Custos Operacionais', 'R$ ' || ROUND(total_costs, 2)::TEXT FROM summary
UNION ALL SELECT 'Lucro/Prejuízo', 'R$ ' || ROUND((ledger_revenue - ledger_payouts) - total_costs, 2)::TEXT FROM summary
UNION ALL SELECT '❌ Bookings sem Ledger', bookings_without_ledger::TEXT FROM summary;
