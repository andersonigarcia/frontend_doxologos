-- Migration: Add Cancellation and Refund System
-- Description: Adds fields for cancellation to inscricoes_eventos and creates event_refunds table
-- Author: System
-- Date: 2026-02-01

-- =====================================================
-- PART 1: Add Cancellation Fields to inscricoes_eventos
-- =====================================================

ALTER TABLE inscricoes_eventos
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_status VARCHAR(20) DEFAULT 'none' CHECK (refund_status IN ('none', 'requested', 'approved', 'rejected', 'refunded', 'failed')),
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0.00;

COMMENT ON COLUMN inscricoes_eventos.refund_status IS 'Status do reembolso: none, requested, approved, rejected, refunded, failed';

-- =====================================================
-- PART 2: Create event_refunds Table
-- =====================================================

CREATE TABLE IF NOT EXISTS event_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES eventos(id),
    inscricao_id UUID NOT NULL REFERENCES inscricoes_eventos(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id),
    
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed', 'failed')),
    reason TEXT,
    
    -- Metadados de auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id) -- ID do admin que processou
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_event_refunds_evento ON event_refunds(evento_id);
CREATE INDEX IF NOT EXISTS idx_event_refunds_inscricao ON event_refunds(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_event_refunds_status ON event_refunds(status);

-- Comentários
COMMENT ON TABLE event_refunds IS 'Registro de solicitações e processamento de reembolsos de eventos';

-- =====================================================
-- PART 3: RLS Policies for event_refunds
-- =====================================================

ALTER TABLE event_refunds ENABLE ROW LEVEL SECURITY;

-- 3.1 Admins podem ver todos os reembolsos
CREATE POLICY "Admins can view all refunds"
ON event_refunds FOR SELECT
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
);

-- 3.2 Usuários podem ver seus próprios reembolsos (via inscricao)
CREATE POLICY "Users can view own refunds"
ON event_refunds FOR SELECT
TO authenticated
USING (
    inscricao_id IN (
        SELECT id FROM inscricoes_eventos
        WHERE user_id = auth.uid()
    )
);

-- 3.3 Apenas Admins podem inserir/atualizar reembolsos
CREATE POLICY "Admins can insert refunds"
ON event_refunds FOR INSERT
TO authenticated
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
);

CREATE POLICY "Admins can update refunds"
ON event_refunds FOR UPDATE
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
);

-- =====================================================
-- PART 4: Trigger for updated_at
-- =====================================================

CREATE TRIGGER trigger_update_event_refunds_timestamp
BEFORE UPDATE ON event_refunds
FOR EACH ROW
EXECUTE FUNCTION update_event_splits_updated_at(); -- Reutilizando função existente

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '   - Added cancellation fields to inscricoes_eventos';
    RAISE NOTICE '   - Created event_refunds table';
    RAISE NOTICE '   - Configured RLS policies';
END $$;
