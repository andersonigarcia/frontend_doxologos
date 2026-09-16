-- Migration para rastreabilidade de agendamentos de urgência/encaixe

-- Adicionar referência ao administrador que criou o agendamento (idempotente)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES auth.users(id);

-- Adicionar referência ao administrador que lançou o pagamento (idempotente)
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES auth.users(id);

-- Atualizar comentários para fins de documentação
COMMENT ON COLUMN public.bookings.created_by_admin_id IS 'ID do administrador que realizou este agendamento via fluxo de exceção (Urgência/Encaixe)';
COMMENT ON COLUMN public.payments.created_by_admin_id IS 'ID do administrador que registrou este pagamento via fluxo de exceção (Urgência/Encaixe)';
