-- Add personal_meet_link column to professionals table
ALTER TABLE public.professionals
ADD COLUMN personal_meet_link text NULL;

COMMENT ON COLUMN public.professionals.personal_meet_link IS 'Link fixo do Google Meet para os atendimentos online do profissional. Pode ser o link pessoal da conta do Google do próprio profissional.';
