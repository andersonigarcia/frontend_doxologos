-- Migration: Isolate Event Scaling and Presence Tracking (1,000 participants capacity)
-- Adds presenca_eventos table, performance indices, and reserve_event_spot RPC with FOR UPDATE lock

BEGIN;

-- 1. Create Table for Event Room Presence & Attendance Tracking
CREATE TABLE IF NOT EXISTS public.presenca_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    inscricao_id UUID REFERENCES public.inscricoes_eventos(id) ON DELETE CASCADE,
    check_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    check_out_at TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    duration_seconds INT DEFAULT 0,
    source TEXT DEFAULT 'web',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- RLS Policies for presenca_eventos
ALTER TABLE public.presenca_eventos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS presenca_eventos_admin_rw ON public.presenca_eventos;
CREATE POLICY presenca_eventos_admin_rw ON public.presenca_eventos
FOR ALL
USING ((auth.jwt()->>'role') IN ('admin', 'superadmin', 'service_role'))
WITH CHECK ((auth.jwt()->>'role') IN ('admin', 'superadmin', 'service_role'));

DROP POLICY IF EXISTS presenca_eventos_user_own ON public.presenca_eventos;
CREATE POLICY presenca_eventos_user_own ON public.presenca_eventos
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Performance Indices for High Concurrency Event Scaling
CREATE INDEX IF NOT EXISTS idx_inscricoes_eventos_evento_status 
ON public.inscricoes_eventos(evento_id, status);

CREATE INDEX IF NOT EXISTS idx_presenca_eventos_lookup 
ON public.presenca_eventos(evento_id, user_id);

-- 3. Atomic Spot Reservation Procedure with Line Locking (FOR UPDATE)
CREATE OR REPLACE FUNCTION public.reserve_event_spot(
    p_evento_id UUID,
    p_user_id UUID,
    p_patient_name TEXT,
    p_patient_email TEXT,
    p_patient_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_evento RECORD;
    v_count INT;
    v_status TEXT;
    v_payment_status TEXT;
    v_inscricao RECORD;
BEGIN
    -- Lock target event row for update to guarantee concurrency safety
    SELECT id, vagas_disponiveis, limite_participantes, valor, titulo
    INTO v_evento
    FROM public.eventos
    WHERE id = p_evento_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Evento não encontrado');
    END IF;

    -- Check if user is already registered
    SELECT id, status INTO v_inscricao
    FROM public.inscricoes_eventos
    WHERE evento_id = p_evento_id AND user_id = p_user_id
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_registered', true,
            'inscricao_id', v_inscricao.id,
            'status', v_inscricao.status
        );
    END IF;

    -- Count active registrations
    SELECT COUNT(*) INTO v_count
    FROM public.inscricoes_eventos
    WHERE evento_id = p_evento_id AND status IN ('confirmed', 'pending');

    -- Enforce capacity limits if defined
    IF (v_evento.vagas_disponiveis IS NOT NULL AND v_evento.vagas_disponiveis > 0 AND v_count >= v_evento.vagas_disponiveis) OR
       (v_evento.limite_participantes IS NOT NULL AND v_evento.limite_participantes > 0 AND v_count >= v_evento.limite_participantes) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Vagas esgotadas para este evento');
    END IF;

    -- Determine initial status (free vs paid)
    IF COALESCE(v_evento.valor, 0) = 0 THEN
        v_status := 'confirmed';
        v_payment_status := NULL;
    ELSE
        v_status := 'pending';
        v_payment_status := 'pending';
    END IF;

    -- Insert registration atomically
    INSERT INTO public.inscricoes_eventos (
        evento_id,
        user_id,
        patient_name,
        patient_email,
        patient_phone,
        status,
        payment_status,
        valor_pago,
        data_inscricao
    ) VALUES (
        p_evento_id,
        p_user_id,
        p_patient_name,
        p_patient_email,
        p_patient_phone,
        v_status,
        v_payment_status,
        COALESCE(v_evento.valor, 0),
        timezone('utc', now())
    )
    RETURNING * INTO v_inscricao;

    RETURN jsonb_build_object(
        'success', true,
        'already_registered', false,
        'inscricao_id', v_inscricao.id,
        'status', v_inscricao.status,
        'valor', COALESCE(v_evento.valor, 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_event_spot(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

COMMIT;
