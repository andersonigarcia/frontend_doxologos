-- Migration: Garantir coluna updated_at na tabela bookings
-- Data: 2025-11-09
-- Descrição: adiciona coluna updated_at com atualização automática via trigger

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.bookings
SET updated_at = NOW()
WHERE updated_at IS NULL;

ALTER TABLE public.bookings
ALTER COLUMN updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.set_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_bookings_updated_at ON public.bookings;
CREATE TRIGGER trigger_set_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_bookings_updated_at();

DO $$
BEGIN
    RAISE NOTICE 'Migration add_updated_at_to_bookings executada com sucesso.';
END $$;
