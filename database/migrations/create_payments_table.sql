-- Migration: Criar tabela payments para gerenciar pagamentos do Mercado Pago
-- Execute no Supabase SQL Editor

-- Criar tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    mp_payment_id TEXT UNIQUE,
    mp_preference_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT, -- pix, credit_card, debit_card, bank_transfer (boleto)
    payment_type TEXT, -- tipo específico do MP
    amount DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2), -- valor líquido após taxas
    fee_amount DECIMAL(10,2), -- valor das taxas do MP
    currency TEXT DEFAULT 'BRL',
    payer_email TEXT,
    payer_name TEXT,
    payer_document TEXT, -- CPF/CNPJ
    description TEXT,
    status_detail TEXT, -- detalhe do status do MP
    external_reference TEXT, -- referência externa
    payment_url TEXT, -- URL do boleto ou PIX
    qr_code TEXT, -- QR Code do PIX
    qr_code_base64 TEXT, -- QR Code em base64
    ticket_url TEXT, -- URL do boleto
    date_approved TIMESTAMPTZ,
    date_created TIMESTAMPTZ,
    date_last_updated TIMESTAMPTZ,
    raw_payload JSONB, -- payload completo do MP
    refund_id TEXT, -- ID do reembolso se houver
    refund_amount DECIMAL(10,2), -- valor reembolsado
    refund_status TEXT, -- status do reembolso
    refund_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON payments(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_preference_id ON payments(mp_preference_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_payer_email ON payments(payer_email);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Comentários para documentação
COMMENT ON TABLE payments IS 'Tabela de pagamentos integrada com Mercado Pago';
COMMENT ON COLUMN payments.mp_payment_id IS 'ID único do pagamento no Mercado Pago';
COMMENT ON COLUMN payments.mp_preference_id IS 'ID da preferência de pagamento criada';
COMMENT ON COLUMN payments.status IS 'Status: pending, approved, authorized, in_process, in_mediation, rejected, cancelled, refunded, charged_back';
COMMENT ON COLUMN payments.payment_method IS 'Método: pix, credit_card, debit_card, bank_transfer';
COMMENT ON COLUMN payments.raw_payload IS 'Dados completos retornados pelo Mercado Pago';

-- Atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Verificar criação
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;
