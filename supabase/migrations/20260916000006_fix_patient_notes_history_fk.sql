-- Corrige o erro de Foreign Key na tabela patient_notes_history
-- Onde estava auth.users(id), deveria ser public.professionals(id)

ALTER TABLE public.patient_notes_history
DROP CONSTRAINT IF EXISTS patient_notes_history_professional_id_fkey;

ALTER TABLE public.patient_notes_history
ADD CONSTRAINT patient_notes_history_professional_id_fkey
FOREIGN KEY (professional_id) REFERENCES public.professionals(id) ON DELETE CASCADE;
