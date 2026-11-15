-- Migration: Add meeting_link_release_minutes to eventos
-- Description: Controls how many minutes before the event the meeting link becomes visible
-- Default: 60 minutes

ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS meeting_link_release_minutes INTEGER DEFAULT 60;

COMMENT ON COLUMN eventos.meeting_link_release_minutes IS 'Minutos antes do início do evento para liberar o link da sala. Default: 60.';
