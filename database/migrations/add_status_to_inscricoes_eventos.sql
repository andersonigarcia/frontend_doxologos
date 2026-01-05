-- Migration: Adicionar campos de status e pagamento à tabela inscricoes_eventos
-- Data: 2025-10-29
-- Descrição: Controle de status de inscrição e vinculação com pagamentos

-- Adicionar campos de controle de pagamento e confirmação (um por vez)
ALTER TABLE inscricoes_eventos 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE inscricoes_eventos 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT NULL;

ALTER TABLE inscricoes_eventos 
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100) DEFAULT NULL;

ALTER TABLE inscricoes_eventos 
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP DEFAULT NULL;

ALTER TABLE inscricoes_eventos 
ADD COLUMN IF NOT EXISTS zoom_link_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE inscricoes_eventos 
ADD COLUMN IF NOT EXISTS zoom_link_sent_at TIMESTAMP DEFAULT NULL;

-- Constraints para garantir status válidos
ALTER TABLE inscricoes_eventos 
DROP CONSTRAINT IF EXISTS inscricoes_eventos_status_check;

ALTER TABLE inscricoes_eventos 
ADD CONSTRAINT inscricoes_eventos_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled'));

ALTER TABLE inscricoes_eventos 
DROP CONSTRAINT IF EXISTS inscricoes_eventos_payment_status_check;

ALTER TABLE inscricoes_eventos 
ADD CONSTRAINT inscricoes_eventos_payment_status_check 
CHECK (payment_status IS NULL OR payment_status IN ('pending', 'approved', 'rejected', 'cancelled'));

-- Comentários para documentar os campos
COMMENT ON COLUMN inscricoes_eventos.status IS 'Status da inscrição: pending (aguardando pagamento), confirmed (confirmado), cancelled (cancelado)';
COMMENT ON COLUMN inscricoes_eventos.payment_status IS 'Status do pagamento (apenas eventos pagos): pending, approved, rejected, cancelled';
COMMENT ON COLUMN inscricoes_eventos.payment_id IS 'ID do pagamento no Mercado Pago';
COMMENT ON COLUMN inscricoes_eventos.payment_date IS 'Data de aprovação do pagamento';
COMMENT ON COLUMN inscricoes_eventos.zoom_link_sent IS 'Se o email com link Zoom já foi enviado';
COMMENT ON COLUMN inscricoes_eventos.zoom_link_sent_at IS 'Data/hora do envio do email com Zoom';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_inscricoes_status ON inscricoes_eventos(status);
CREATE INDEX IF NOT EXISTS idx_inscricoes_payment_status ON inscricoes_eventos(payment_status);
CREATE INDEX IF NOT EXISTS idx_inscricoes_payment_id ON inscricoes_eventos(payment_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_evento_id ON inscricoes_eventos(evento_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_patient_email ON inscricoes_eventos(patient_email);

-- Atualizar inscrições existentes para status 'confirmed' (assumindo que já eram confirmadas)
UPDATE inscricoes_eventos 
SET status = 'confirmed'
WHERE status IS NULL;
