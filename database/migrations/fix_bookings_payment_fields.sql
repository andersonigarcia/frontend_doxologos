-- ================================================
-- Migration: Adicionar campos de pagamento em bookings
-- Data: 2026-01-08
-- Objetivo: Corrigir problema de confirmação automática de pagamentos
-- ================================================

-- 1. Adicionar campo payment_status
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20);

-- 2. Adicionar campo marketplace_payment_id
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS marketplace_payment_id TEXT;

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status 
ON bookings(payment_status);

CREATE INDEX IF NOT EXISTS idx_bookings_marketplace_payment_id 
ON bookings(marketplace_payment_id);

-- 4. Adicionar constraint para validar payment_status
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

ALTER TABLE bookings
ADD CONSTRAINT bookings_payment_status_check
CHECK (payment_status IS NULL OR payment_status IN (
  'pending', 'approved', 'authorized', 'in_process', 
  'rejected', 'cancelled', 'refunded', 'charged_back'
));

-- 5. Comentários para documentação
COMMENT ON COLUMN bookings.payment_status IS 
  'Status do pagamento no Mercado Pago (sincronizado com tabela payments)';
COMMENT ON COLUMN bookings.marketplace_payment_id IS 
  'ID do pagamento no Mercado Pago para rastreamento';

-- 6. Backfill: Sincronizar dados existentes da tabela payments
UPDATE bookings b
SET 
  payment_status = p.status,
  marketplace_payment_id = p.mp_payment_id,
  updated_at = NOW()
FROM payments p
WHERE p.booking_id = b.id
  AND b.payment_status IS NULL;

-- 7. Verificar migration
SELECT 
  'Migration Completa' as status,
  COUNT(*) as total_bookings,
  COUNT(payment_status) as with_payment_status,
  COUNT(marketplace_payment_id) as with_mp_id,
  ROUND(COUNT(payment_status) * 100.0 / NULLIF(COUNT(*), 0), 2) as percentage_synced
FROM bookings;

-- 8. Verificar bookings que precisam de atenção
SELECT 
  'Bookings sem payment_status' as alerta,
  COUNT(*) as total
FROM bookings
WHERE payment_status IS NULL
  AND created_at > NOW() - INTERVAL '30 days';
