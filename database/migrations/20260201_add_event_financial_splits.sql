-- Migration: Add Financial Split Support for Events
-- Description: Adds fields to eventos table and creates event_financial_splits table
-- Author: System
-- Date: 2026-02-01

-- =====================================================
-- PART 1: Add Split Configuration Fields to eventos
-- =====================================================

ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS professional_id UUID REFERENCES professionals(id),
ADD COLUMN IF NOT EXISTS split_type VARCHAR(20) DEFAULT 'percentage' CHECK (split_type IN ('fixed', 'percentage')),
ADD COLUMN IF NOT EXISTS split_value DECIMAL(10,2) DEFAULT 30.00,
ADD COLUMN IF NOT EXISTS platform_fee_type VARCHAR(20) DEFAULT 'percentage' CHECK (platform_fee_type IN ('fixed', 'percentage')),
ADD COLUMN IF NOT EXISTS platform_fee_value DECIMAL(10,2) DEFAULT 20.00;

-- Add comments for documentation
COMMENT ON COLUMN eventos.professional_id IS 'Profissional responsável pelo evento (recebe o split)';
COMMENT ON COLUMN eventos.split_type IS 'DEPRECATED: Use platform_fee_type instead';
COMMENT ON COLUMN eventos.split_value IS 'DEPRECATED: Use platform_fee_value instead';
COMMENT ON COLUMN eventos.platform_fee_type IS 'Tipo de taxa da plataforma: fixed (valor fixo em R$) ou percentage (percentual)';
COMMENT ON COLUMN eventos.platform_fee_value IS 'Valor da taxa da plataforma (R$ se fixed, % se percentage)';

-- =====================================================
-- PART 2: Create event_financial_splits Table
-- =====================================================

CREATE TABLE IF NOT EXISTS event_financial_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    inscricao_id UUID NOT NULL REFERENCES inscricoes_eventos(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id),
    
    -- Valores calculados
    total_amount DECIMAL(10,2) NOT NULL,
    platform_amount DECIMAL(10,2) NOT NULL,
    professional_amount DECIMAL(10,2) NOT NULL,
    
    -- Metadados do cálculo
    split_calculation JSONB NOT NULL,
    professional_id UUID REFERENCES professionals(id),
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: soma deve bater
    CONSTRAINT valid_split_sum CHECK (
        ABS((platform_amount + professional_amount) - total_amount) < 0.01
    )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_event_splits_evento ON event_financial_splits(evento_id);
CREATE INDEX IF NOT EXISTS idx_event_splits_inscricao ON event_financial_splits(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_event_splits_professional ON event_financial_splits(professional_id);
CREATE INDEX IF NOT EXISTS idx_event_splits_payment ON event_financial_splits(payment_id);
CREATE INDEX IF NOT EXISTS idx_event_splits_created_at ON event_financial_splits(created_at DESC);

-- Comentários
COMMENT ON TABLE event_financial_splits IS 'Registro de distribuição financeira de pagamentos de eventos entre plataforma e profissionais';
COMMENT ON COLUMN event_financial_splits.split_calculation IS 'Detalhes do cálculo do split em formato JSON';

-- =====================================================
-- PART 3: Create Split Calculation Function
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_event_split(
    p_evento_id UUID,
    p_total_amount DECIMAL
)
RETURNS TABLE (
    platform_amount DECIMAL,
    professional_amount DECIMAL,
    calculation_details JSONB
) AS $$
DECLARE
    v_evento RECORD;
    v_platform_fee DECIMAL;
    v_professional_fee DECIMAL;
BEGIN
    -- Buscar configuração do evento
    SELECT * INTO v_evento
    FROM eventos
    WHERE id = p_evento_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Evento não encontrado: %', p_evento_id;
    END IF;
    
    -- Calcular taxa da plataforma
    IF v_evento.platform_fee_type = 'fixed' THEN
        v_platform_fee := v_evento.platform_fee_value;
    ELSE -- percentage
        v_platform_fee := ROUND((p_total_amount * v_evento.platform_fee_value / 100)::numeric, 2);
    END IF;
    
    -- Calcular valor do profissional (resto)
    v_professional_fee := p_total_amount - v_platform_fee;
    
    -- Garantir que não há valores negativos
    IF v_professional_fee < 0 THEN
        RAISE EXCEPTION 'Split inválido: profissional ficaria com valor negativo (total: %, platform: %)', 
            p_total_amount, v_platform_fee;
    END IF;
    
    -- Retornar resultado
    RETURN QUERY SELECT
        v_platform_fee,
        v_professional_fee,
        jsonb_build_object(
            'total', p_total_amount,
            'platform_fee_type', v_evento.platform_fee_type,
            'platform_fee_value', v_evento.platform_fee_value,
            'platform_amount', v_platform_fee,
            'professional_amount', v_professional_fee,
            'calculated_at', NOW()
        );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_event_split IS 'Calcula a distribuição financeira de um pagamento de evento';

-- =====================================================
-- PART 4: Create Financial Report View
-- =====================================================

CREATE OR REPLACE VIEW event_financial_report AS
SELECT
    e.id AS evento_id,
    e.titulo AS evento_titulo,
    e.data_inicio,
    e.data_fim,
    e.valor AS valor_evento,
    p.name AS professional_name,
    e.platform_fee_type,
    e.platform_fee_value,
    
    -- Estatísticas de inscrições
    COUNT(DISTINCT ie.id) AS total_inscricoes,
    COUNT(DISTINCT CASE WHEN ie.status = 'confirmed' THEN ie.id END) AS inscricoes_confirmadas,
    
    -- Estatísticas financeiras
    COUNT(DISTINCT efs.id) AS total_pagamentos,
    COALESCE(SUM(efs.total_amount), 0) AS receita_total,
    COALESCE(SUM(efs.platform_amount), 0) AS receita_plataforma,
    COALESCE(SUM(efs.professional_amount), 0) AS receita_profissional,
    
    -- Metadados
    e.created_at AS evento_criado_em,
    MAX(efs.created_at) AS ultimo_pagamento_em
    
FROM eventos e
LEFT JOIN inscricoes_eventos ie ON ie.evento_id = e.id
LEFT JOIN event_financial_splits efs ON efs.evento_id = e.id
LEFT JOIN professionals p ON p.id = e.professional_id
GROUP BY 
    e.id, e.titulo, e.data_inicio, e.data_fim, e.valor,
    p.name, e.platform_fee_type, e.platform_fee_value, e.created_at
ORDER BY e.data_inicio DESC;

COMMENT ON VIEW event_financial_report IS 'Relatório consolidado de performance financeira dos eventos';

-- =====================================================
-- PART 5: RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE event_financial_splits ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem ver tudo
CREATE POLICY "Admins can view all splits"
ON event_financial_splits FOR SELECT
TO authenticated
USING (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
);

-- Policy: Profissionais podem ver apenas seus próprios splits
CREATE POLICY "Professionals can view their own splits"
ON event_financial_splits FOR SELECT
TO authenticated
USING (
    professional_id IN (
        SELECT id FROM professionals
        WHERE user_id = auth.uid()
    )
);

-- Policy: Apenas sistema pode inserir (via webhook)
CREATE POLICY "Only system can insert splits"
ON event_financial_splits FOR INSERT
TO authenticated
WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
);

-- =====================================================
-- PART 6: Trigger for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_event_splits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_splits_timestamp
BEFORE UPDATE ON event_financial_splits
FOR EACH ROW
EXECUTE FUNCTION update_event_splits_updated_at();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '   - Added split fields to eventos table';
    RAISE NOTICE '   - Created event_financial_splits table';
    RAISE NOTICE '   - Created calculate_event_split function';
    RAISE NOTICE '   - Created event_financial_report view';
    RAISE NOTICE '   - Configured RLS policies';
END $$;
