-- 20260916000005_patient_notes_history.sql
-- Fase 3A: Histórico de versões do Prontuário Eletrônico

-- 1. Adicionar colunas estruturadas à tabela patient_notes existente
ALTER TABLE public.patient_notes
ADD COLUMN IF NOT EXISTS chief_complaint TEXT,        -- Queixa Principal
ADD COLUMN IF NOT EXISTS session_development TEXT,    -- Desenvolvimento da Sessão
ADD COLUMN IF NOT EXISTS homework TEXT,               -- Dever de Casa / Tarefas
ADD COLUMN IF NOT EXISTS session_date DATE;           -- Data da sessão referenciada

-- 2. Tabela de histórico imutável de snapshots por sessão
CREATE TABLE IF NOT EXISTS public.patient_notes_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_note_id UUID REFERENCES public.patient_notes(id) ON DELETE SET NULL,
    professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_email TEXT NOT NULL,
    -- Campos estruturados do prontuário
    chief_complaint TEXT,
    session_development TEXT,
    homework TEXT,
    notes TEXT,                 -- Observações livres (campo legado + extras)
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Índices de performance
CREATE INDEX IF NOT EXISTS idx_patient_notes_history_professional
ON public.patient_notes_history (professional_id, patient_email, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_patient_notes_history_note_id
ON public.patient_notes_history (patient_note_id);

-- 4. RLS: apenas o profissional dono pode ver seu próprio histórico
ALTER TABLE public.patient_notes_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profissional vê seu próprio histórico de notas" ON public.patient_notes_history;
CREATE POLICY "Profissional vê seu próprio histórico de notas"
    ON public.patient_notes_history
    FOR SELECT
    USING (
        auth.uid() = professional_id
    );

DROP POLICY IF EXISTS "Service Role acesso total a patient_notes_history" ON public.patient_notes_history;
CREATE POLICY "Service Role acesso total a patient_notes_history"
    ON public.patient_notes_history
    FOR ALL
    USING (auth.role() = 'service_role');
