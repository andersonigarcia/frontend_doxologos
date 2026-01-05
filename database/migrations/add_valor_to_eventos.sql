-- Migration: Adicionar campo de valor aos eventos
-- Data: 2025-10-29
-- Descrição: Permite que eventos tenham um valor (pagos) ou sejam gratuitos (valor = 0)

-- Adicionar coluna valor à tabela eventos
ALTER TABLE eventos 
ADD COLUMN IF NOT EXISTS valor DECIMAL(10,2) DEFAULT 0;

-- Comentário para documentar o campo
COMMENT ON COLUMN eventos.valor IS 'Valor do evento em reais. 0 = gratuito, >0 = pago';

-- Atualizar eventos existentes para serem gratuitos por padrão
UPDATE eventos 
SET valor = 0 
WHERE valor IS NULL;

-- Adicionar constraint para garantir que valor não seja negativo
ALTER TABLE eventos 
ADD CONSTRAINT eventos_valor_non_negative 
CHECK (valor >= 0);

-- Índice para consultas de eventos gratuitos vs pagos (opcional)
CREATE INDEX IF NOT EXISTS idx_eventos_valor ON eventos(valor);

-- Garantir que a tabela inscricoes_eventos tenha a coluna valor_pago
-- (ela pode já existir no schema mas não estar criada no banco)
ALTER TABLE inscricoes_eventos 
ADD COLUMN IF NOT EXISTS valor_pago DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN inscricoes_eventos.valor_pago IS 'Valor pago pelo participante na inscrição do evento';
