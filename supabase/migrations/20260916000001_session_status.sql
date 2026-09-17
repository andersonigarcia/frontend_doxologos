-- 20260916000001_session_status.sql
-- Fase 2: Controle de Sala de Espera (Prevenção de quebra de sigilo)

-- 1. Adicionar o campo session_status
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS session_status text DEFAULT 'not_started'::text;

-- Restrição de valores permitidos (Opcional, mas recomendado para integridade)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_session_status'
    ) THEN
        ALTER TABLE public.bookings
        ADD CONSTRAINT valid_session_status CHECK (session_status IN ('not_started', 'in_progress', 'finished'));
    END IF;
END $$;

-- 2. Habilitar o Realtime para a tabela bookings (para a Sala de Espera reagir instantaneamente)
-- Tenta adicionar a tabela ao canal do realtime (ignora se já estiver lá)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    END IF;
END $$;

-- NOTA: O Supabase exige que políticas RLS existam para que o Realtime respeite os acessos.
-- Presume-se que a tabela bookings já possui RLS onde o patient ou professional pode ver suas próprias consultas.
