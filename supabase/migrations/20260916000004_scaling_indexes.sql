-- 20260916000004_scaling_indexes.sql
-- Escalonamento Fase 1: Índices Compostos para Performance

-- 1. Índices para a tabela bookings
-- Otimiza buscas de painéis financeiros e painel do profissional que filtram por prof e data
CREATE INDEX IF NOT EXISTS idx_bookings_professional_date 
ON public.bookings (professional_id, booking_date);

-- Otimiza buscas de admin e dashboards baseados em status e data
CREATE INDEX IF NOT EXISTS idx_bookings_status_date 
ON public.bookings (status, booking_date);

-- Otimiza consultas de agenda diária do paciente e profissional
CREATE INDEX IF NOT EXISTS idx_bookings_user_date 
ON public.bookings (user_id, booking_date);

-- 2. Índices para a tabela payments
-- Otimiza os webhooks e retentativas do mercado pago
CREATE INDEX IF NOT EXISTS idx_payments_booking_id 
ON public.payments (booking_id);

CREATE INDEX IF NOT EXISTS idx_payments_status_method 
ON public.payments (status, payment_method);

-- 3. Índices para a tabela patient_wallets
-- Acelera consultas de saldo que acontecem muito no checkout
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_patient 
ON public.wallet_transactions (patient_id, created_at DESC);
