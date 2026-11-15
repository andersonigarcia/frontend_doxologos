-- 20260917000000_patient_homework_visibility.sql
-- Adicionar coluna para visibilidade do dever de casa para o paciente

-- 1. Adicionar colunas booleanas
ALTER TABLE public.patient_notes
ADD COLUMN IF NOT EXISTS homework_visible_to_patient BOOLEAN DEFAULT false;

ALTER TABLE public.patient_notes_history
ADD COLUMN IF NOT EXISTS homework_visible_to_patient BOOLEAN DEFAULT false;

-- 2. Atualizar RLS da patient_notes_history para o paciente poder ver suas tarefas liberadas
-- Nota: A identificação do paciente é feita pelo auth.email() comparado ao patient_email.

DROP POLICY IF EXISTS "Paciente vê as próprias tarefas liberadas" ON public.patient_notes_history;

CREATE POLICY "Paciente vê as próprias tarefas liberadas"
    ON public.patient_notes_history
    FOR SELECT
    USING (
        auth.email() = patient_email 
        AND homework_visible_to_patient = true
    );
