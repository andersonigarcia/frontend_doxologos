-- Migration: Adicionar campos Zoom à tabela eventos
-- Data: 2025-10-29
-- Descrição: Permite armazenar link, senha e ID da sala Zoom criada automaticamente

-- Adicionar campos Zoom à tabela eventos
ALTER TABLE eventos 
ADD COLUMN IF NOT EXISTS meeting_link TEXT,
ADD COLUMN IF NOT EXISTS meeting_password TEXT,
ADD COLUMN IF NOT EXISTS meeting_id TEXT,
ADD COLUMN IF NOT EXISTS meeting_start_url TEXT,
ADD COLUMN IF NOT EXISTS vagas_disponiveis INTEGER DEFAULT 0;

-- Comentários para documentar os campos
COMMENT ON COLUMN eventos.meeting_link IS 'Link da sala Zoom para participantes (join_url)';
COMMENT ON COLUMN eventos.meeting_password IS 'Senha da sala Zoom';
COMMENT ON COLUMN eventos.meeting_id IS 'ID da reunião no Zoom';
COMMENT ON COLUMN eventos.meeting_start_url IS 'Link para host iniciar a reunião (start_url)';
COMMENT ON COLUMN eventos.vagas_disponiveis IS 'Número máximo de participantes (0 = ilimitado)';

-- Índice para consultas de eventos com Zoom
CREATE INDEX IF NOT EXISTS idx_eventos_meeting_id ON eventos(meeting_id);
CREATE INDEX IF NOT EXISTS idx_eventos_vagas ON eventos(vagas_disponiveis);

-- Validar que vagas não sejam negativas
ALTER TABLE eventos 
ADD CONSTRAINT eventos_vagas_non_negative 
CHECK (vagas_disponiveis >= 0);
