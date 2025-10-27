-- Migration: Adicionar campos do Zoom na tabela bookings
-- Data: 2025-10-26
-- Descrição: Adiciona campos para armazenar informações da sala Zoom

-- Adicionar colunas para dados do Zoom
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS meeting_link TEXT,
ADD COLUMN IF NOT EXISTS meeting_password VARCHAR(50),
ADD COLUMN IF NOT EXISTS meeting_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS meeting_start_url TEXT;

-- Adicionar comentários nas colunas
COMMENT ON COLUMN bookings.meeting_link IS 'Link de acesso do paciente à sala Zoom';
COMMENT ON COLUMN bookings.meeting_password IS 'Senha de acesso à sala Zoom';
COMMENT ON COLUMN bookings.meeting_id IS 'ID da reunião no Zoom';
COMMENT ON COLUMN bookings.meeting_start_url IS 'Link de início da reunião para o host/profissional';

-- Criar índice para melhorar performance de busca por meeting_id
CREATE INDEX IF NOT EXISTS idx_bookings_meeting_id ON bookings(meeting_id);

-- Log da migration
DO $$
BEGIN
    RAISE NOTICE 'Migration: Campos do Zoom adicionados com sucesso à tabela bookings';
END $$;
