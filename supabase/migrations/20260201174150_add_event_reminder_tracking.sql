-- Migration: Add event reminder tracking fields
-- Adds fields to track when reminder emails were sent for events

BEGIN;

-- Add reminder tracking columns to inscricoes_eventos
ALTER TABLE public.inscricoes_eventos
ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMPTZ;

-- Add index for efficient querying of events needing reminders
CREATE INDEX IF NOT EXISTS idx_inscricoes_eventos_reminders 
ON public.inscricoes_eventos(evento_id, status, reminder_24h_sent_at, reminder_1h_sent_at)
WHERE status = 'confirmed';

-- Add comment for documentation
COMMENT ON COLUMN public.inscricoes_eventos.reminder_24h_sent_at IS 'Timestamp when 24-hour reminder email was sent';
COMMENT ON COLUMN public.inscricoes_eventos.reminder_1h_sent_at IS 'Timestamp when 1-hour reminder email was sent';

COMMIT;
