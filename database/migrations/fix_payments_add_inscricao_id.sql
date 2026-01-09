-- ================================================
-- Migration: Adicionar suporte a eventos na tabela payments
-- Data: 2026-01-08
-- Objetivo: Permitir pagamentos de eventos (inscricoes_eventos)
-- ================================================

-- 1. Adicionar coluna inscricao_id
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS inscricao_id UUID 
REFERENCES inscricoes_eventos(id) ON DELETE CASCADE;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_payments_inscricao_id 
ON payments(inscricao_id);

-- 3. Remover constraint NOT NULL de booking_id (se existir)
-- Isso permite que payments tenha OU booking_id OU inscricao_id
ALTER TABLE payments
ALTER COLUMN booking_id DROP NOT NULL;

-- 4. Adicionar constraint: ou booking_id ou inscricao_id deve existir
-- Mas não ambos ao mesmo tempo
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_reference_check;

ALTER TABLE payments
ADD CONSTRAINT payments_reference_check
CHECK (
  (booking_id IS NOT NULL AND inscricao_id IS NULL) OR
  (booking_id IS NULL AND inscricao_id IS NOT NULL)
);

-- 5. Comentário para documentação
COMMENT ON COLUMN payments.inscricao_id IS 
  'ID da inscrição de evento (mutuamente exclusivo com booking_id)';

-- 6. Verificar migration
SELECT 
  'Migration Completa' as status,
  COUNT(*) as total_payments,
  COUNT(booking_id) as for_bookings,
  COUNT(inscricao_id) as for_events,
  COUNT(CASE WHEN booking_id IS NULL AND inscricao_id IS NULL THEN 1 END) as orphaned
FROM payments;

-- 7. Alertar sobre pagamentos órfãos (se houver)
SELECT 
  'ALERTA: Pagamentos Órfãos' as alerta,
  id,
  mp_payment_id,
  amount,
  status,
  created_at
FROM payments
WHERE booking_id IS NULL 
  AND inscricao_id IS NULL
ORDER BY created_at DESC;
