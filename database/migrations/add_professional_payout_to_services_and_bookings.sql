-- Ajusta tabelas services e bookings para suportar repasse do profissional
BEGIN;

-- Garante coluna de repasse no catálogo de serviços
ALTER TABLE public.services
    ADD COLUMN IF NOT EXISTS professional_payout NUMERIC(10,2);

-- Inicializa repasse dos serviços existentes com o valor atual cobrado do paciente
UPDATE public.services
SET professional_payout = price
WHERE professional_payout IS NULL
  AND price IS NOT NULL;

-- Garante coluna de repasse histórico em bookings
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS valor_repasse_profissional NUMERIC(10,2);

-- Replica o valor cobrado ao paciente para o campo de repasse quando ainda não houver registro
UPDATE public.bookings
SET valor_repasse_profissional = valor_consulta
WHERE valor_repasse_profissional IS NULL
  AND valor_consulta IS NOT NULL;

COMMIT;
