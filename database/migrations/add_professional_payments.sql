-- Sprint 8: Sistema de Pagamentos aos Profissionais
-- Migration: Create professional_payments and payment_bookings tables

-- =====================================================
-- 1. Create professional_payments table
-- =====================================================

CREATE TABLE IF NOT EXISTS professional_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
    
    -- Período do pagamento
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Valores
    total_bookings INTEGER NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Informações de pagamento
    payment_date DATE,
    payment_method VARCHAR(50), -- 'pix', 'transferencia', 'dinheiro', 'outro'
    payment_proof_url TEXT,
    
    -- Status e controle
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    notes TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_period CHECK (period_end >= period_start),
    CONSTRAINT valid_amount CHECK (total_amount >= 0),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'cancelled'))
);

-- =====================================================
-- 2. Create payment_bookings table (relacionamento)
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES professional_payments(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(payment_id, booking_id)
);

-- =====================================================
-- 3. Create Indexes
-- =====================================================

-- Indexes para professional_payments
CREATE INDEX IF NOT EXISTS idx_professional_payments_professional 
    ON professional_payments(professional_id);

CREATE INDEX IF NOT EXISTS idx_professional_payments_status 
    ON professional_payments(status);

CREATE INDEX IF NOT EXISTS idx_professional_payments_period 
    ON professional_payments(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_professional_payments_payment_date 
    ON professional_payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_professional_payments_created_at 
    ON professional_payments(created_at DESC);

-- Indexes para payment_bookings
CREATE INDEX IF NOT EXISTS idx_payment_bookings_payment 
    ON payment_bookings(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_bookings_booking 
    ON payment_bookings(booking_id);

-- =====================================================
-- 4. Create Trigger for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_professional_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_professional_payments_updated_at
    BEFORE UPDATE ON professional_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_professional_payments_updated_at();

-- =====================================================
-- 5. Enable Row Level Security
-- =====================================================

ALTER TABLE professional_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_bookings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. Create RLS Policies for professional_payments
-- =====================================================

-- Admins podem ver todos os pagamentos
CREATE POLICY "Admins can view all payments"
    ON professional_payments FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role' = 'admin'
                 OR auth.users.raw_app_meta_data->>'role' = 'admin')
        )
    );

-- Profissionais podem ver apenas seus pagamentos
CREATE POLICY "Professionals can view their payments"
    ON professional_payments FOR SELECT
    TO authenticated
    USING (
        professional_id IN (
            SELECT id FROM professionals
            WHERE user_id = auth.uid()
        )
    );

-- Apenas admins podem inserir
CREATE POLICY "Only admins can insert payments"
    ON professional_payments FOR INSERT
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
CREATE POLICY "Only admins can update payments"
    ON professional_payments FOR UPDATE
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
CREATE POLICY "Only admins can delete payments"
    ON professional_payments FOR DELETE
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
-- 7. Create RLS Policies for payment_bookings
-- =====================================================

-- Seguir as mesmas políticas de professional_payments
CREATE POLICY "Payment bookings follow payment policies for select"
    ON payment_bookings FOR SELECT
    TO authenticated
    USING (
        payment_id IN (
            SELECT id FROM professional_payments
        )
    );

CREATE POLICY "Only admins can manage payment bookings"
    ON payment_bookings FOR ALL
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
-- 8. Create helpful views
-- =====================================================

-- View para pagamentos com informações do profissional
CREATE OR REPLACE VIEW professional_payments_with_details AS
SELECT 
    pp.*,
    p.name as professional_name,
    u.email as created_by_email,
    u2.email as paid_by_email,
    COUNT(pb.id) as bookings_count
FROM professional_payments pp
LEFT JOIN professionals p ON pp.professional_id = p.id
LEFT JOIN auth.users u ON pp.created_by = u.id
LEFT JOIN auth.users u2 ON pp.paid_by = u2.id
LEFT JOIN payment_bookings pb ON pp.id = pb.payment_id
GROUP BY pp.id, p.name, u.email, u2.email;

-- =====================================================
-- 9. Add comments for documentation
-- =====================================================

COMMENT ON TABLE professional_payments IS 'Tabela de controle de pagamentos aos profissionais';
COMMENT ON COLUMN professional_payments.period_start IS 'Data de início do período do pagamento';
COMMENT ON COLUMN professional_payments.period_end IS 'Data de fim do período do pagamento';
COMMENT ON COLUMN professional_payments.total_amount IS 'Valor total a ser pago ao profissional';
COMMENT ON COLUMN professional_payments.payment_method IS 'Método de pagamento: pix, transferencia, dinheiro, outro';
COMMENT ON COLUMN professional_payments.status IS 'Status do pagamento: pending, paid, cancelled';

COMMENT ON TABLE payment_bookings IS 'Relacionamento entre pagamentos e agendamentos incluídos';
