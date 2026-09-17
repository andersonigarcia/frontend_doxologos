-- Corrige as políticas de RLS para a tabela patient_notes_history
-- O professional_id armazenado é da tabela professionals, mas auth.uid() é da auth.users.
-- Precisamos usar um sub-select para verificar a posse.

-- 1. Drop das políticas antigas (se existirem)
DROP POLICY IF EXISTS "Profissional vê seu próprio histórico de notas" ON public.patient_notes_history;
DROP POLICY IF EXISTS "Profissional insere seu próprio histórico" ON public.patient_notes_history;

-- 2. Recriar a política de SELECT
CREATE POLICY "Profissional vê seu próprio histórico de notas"
    ON public.patient_notes_history
    FOR SELECT
    USING (
        professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
    );

-- 3. Criar a política de INSERT
CREATE POLICY "Profissional insere seu próprio histórico"
    ON public.patient_notes_history
    FOR INSERT
    WITH CHECK (
        professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
    );
