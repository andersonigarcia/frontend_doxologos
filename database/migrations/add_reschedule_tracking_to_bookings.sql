-- Migration: Adicionar rastreamento de reagendamentos
-- Data: 2025-11-09
-- Descrição: adiciona campos de controle na tabela bookings e cria tabela de histórico de reagendamentos

-- 1) Adicionar colunas de rastreamento na tabela bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS rescheduled_from_id UUID REFERENCES public.bookings(id);

COMMENT ON COLUMN public.bookings.reschedule_count IS 'Total de tentativas de reagendamento já realizadas para este agendamento.';
COMMENT ON COLUMN public.bookings.rescheduled_from_id IS 'ID do agendamento original que originou a cadeia de reagendamentos.';

-- Normalizar dados existentes
UPDATE public.bookings
SET reschedule_count = COALESCE(reschedule_count, 0)
WHERE reschedule_count IS NULL;

-- Índice auxiliar para consultas por cadeia de reagendamentos
CREATE INDEX IF NOT EXISTS idx_bookings_rescheduled_from_id
    ON public.bookings(rescheduled_from_id);

-- 2) Criar tabela de histórico de reagendamentos
CREATE TABLE IF NOT EXISTS public.booking_reschedule_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    previous_booking_date DATE NOT NULL,
    previous_booking_time TIME NOT NULL,
    new_booking_date DATE NOT NULL,
    new_booking_time TIME NOT NULL,
    attempt_number SMALLINT NOT NULL CHECK (attempt_number >= 0),
    status TEXT NOT NULL DEFAULT 'success',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.booking_reschedule_history IS 'Histórico detalhado de todas as tentativas de reagendamento realizadas pelos pacientes ou equipe.';
COMMENT ON COLUMN public.booking_reschedule_history.booking_id IS 'Referência para o agendamento impactado pelo reagendamento.';
COMMENT ON COLUMN public.booking_reschedule_history.previous_booking_date IS 'Data anterior do agendamento antes da alteração.';
COMMENT ON COLUMN public.booking_reschedule_history.previous_booking_time IS 'Horário anterior do agendamento antes da alteração.';
COMMENT ON COLUMN public.booking_reschedule_history.new_booking_date IS 'Nova data confirmada após o reagendamento.';
COMMENT ON COLUMN public.booking_reschedule_history.new_booking_time IS 'Novo horário confirmado após o reagendamento.';
COMMENT ON COLUMN public.booking_reschedule_history.attempt_number IS 'Número sequencial da tentativa dentro da cadeia de reagendamentos.';
COMMENT ON COLUMN public.booking_reschedule_history.status IS 'Resultado da tentativa (ex: success, failed, rollback).';
COMMENT ON COLUMN public.booking_reschedule_history.metadata IS 'Dados adicionais (origem, usuário responsável, payloads, etc.).';

-- Índices para acelerar consultas
CREATE INDEX IF NOT EXISTS idx_booking_reschedule_history_booking_id
    ON public.booking_reschedule_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reschedule_history_created_at
    ON public.booking_reschedule_history(created_at DESC);

-- 3) Políticas de segurança (RLS)
ALTER TABLE public.booking_reschedule_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Patients can insert own reschedule history" ON public.booking_reschedule_history;
CREATE POLICY "Patients can insert own reschedule history" ON public.booking_reschedule_history
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.id = booking_id
          AND b.user_id = auth.uid()
    )
);

-- Permitir que pacientes consultem apenas seus próprios registros
DROP POLICY IF EXISTS "Patients can view own reschedule history" ON public.booking_reschedule_history;
CREATE POLICY "Patients can view own reschedule history" ON public.booking_reschedule_history
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.id = booking_id
          AND b.user_id = auth.uid()
    )
);

-- Aviso de conclusão
DO $$
BEGIN
    RAISE NOTICE 'Migration add_reschedule_tracking_to_bookings executada com sucesso.';
END $$;
