-- Sprint 9: Dashboard de Lucro/Prejuízo (P&L)
-- Migration: Create platform_costs table

-- =====================================================
-- 1. Create platform_costs table
-- =====================================================

CREATE TABLE IF NOT EXISTS platform_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informações do custo
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    
    -- Data e recorrência
    cost_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_period VARCHAR(20),
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_amount CHECK (amount >= 0),
    CONSTRAINT valid_category CHECK (category IN ('server', 'marketing', 'tools', 'salaries', 'other')),
    CONSTRAINT valid_recurrence CHECK (
        (is_recurring = FALSE AND recurrence_period IS NULL) OR
        (is_recurring = TRUE AND recurrence_period IN ('monthly', 'yearly', 'quarterly'))
    )
);

-- =====================================================
-- 2. Create Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_platform_costs_category 
    ON platform_costs(category);

CREATE INDEX IF NOT EXISTS idx_platform_costs_date 
    ON platform_costs(cost_date DESC);

CREATE INDEX IF NOT EXISTS idx_platform_costs_recurring 
    ON platform_costs(is_recurring);

CREATE INDEX IF NOT EXISTS idx_platform_costs_created_at 
    ON platform_costs(created_at DESC);

-- =====================================================
-- 3. Create Trigger for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_platform_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_platform_costs_updated_at
    BEFORE UPDATE ON platform_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_costs_updated_at();

-- =====================================================
-- 4. Enable Row Level Security
-- =====================================================

ALTER TABLE platform_costs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. Create RLS Policies
-- =====================================================

-- Apenas admins podem ver custos
CREATE POLICY "Only admins can view costs"
    ON platform_costs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role' = 'admin'
                 OR auth.users.raw_app_meta_data->>'role' = 'admin')
        )
    );

-- Apenas admins podem inserir
CREATE POLICY "Only admins can insert costs"
    ON platform_costs FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role' = 'admin'
                 OR auth.users.raw_app_meta_data->>'role' = 'admin')
        )
    );

-- Apenas admins podem atualizar
CREATE POLICY "Only admins can update costs"
    ON platform_costs FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role' = 'admin'
                 OR auth.users.raw_app_meta_data->>'role' = 'admin')
        )
    );

-- Apenas admins podem deletar
CREATE POLICY "Only admins can delete costs"
    ON platform_costs FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role' = 'admin'
                 OR auth.users.raw_app_meta_data->>'role' = 'admin')
        )
    );

-- =====================================================
-- 6. Add comments for documentation
-- =====================================================

COMMENT ON TABLE platform_costs IS 'Tabela de controle de custos operacionais da plataforma';
COMMENT ON COLUMN platform_costs.category IS 'Categoria do custo: server, marketing, tools, salaries, other';
COMMENT ON COLUMN platform_costs.is_recurring IS 'Se o custo é recorrente';
COMMENT ON COLUMN platform_costs.recurrence_period IS 'Período de recorrência: monthly, yearly, quarterly';
