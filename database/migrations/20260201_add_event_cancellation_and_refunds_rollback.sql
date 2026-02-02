-- Rollback: Remove Cancellation and Refund System
-- Description: Drops event_refunds table and removes cancellation fields from inscricoes_eventos
-- Author: System
-- Date: 2026-02-01

-- =====================================================
-- PART 1: Remove event_refunds Table
-- =====================================================

DROP TABLE IF EXISTS event_refunds CASCADE;

-- =====================================================
-- PART 2: Remove Fields from inscricoes_eventos
-- =====================================================

ALTER TABLE inscricoes_eventos
DROP COLUMN IF EXISTS cancellation_reason CASCADE,
DROP COLUMN IF EXISTS cancelled_at CASCADE,
DROP COLUMN IF EXISTS refund_status CASCADE,
DROP COLUMN IF EXISTS refund_amount CASCADE;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Rollback completed successfully!';
    RAISE NOTICE '   - Dropped event_refunds table';
    RAISE NOTICE '   - Removed cancellation fields from inscricoes_eventos';
END $$;
