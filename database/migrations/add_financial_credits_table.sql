-- Migration: Criar tabela para créditos financeiros reutilizáveis
-- Data: 2025-11-09
-- Descrição: adiciona a tabela financial_credits para controlar saldos reaproveitáveis por usuário

CREATE TABLE IF NOT EXISTS public.financial_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    original_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    source_type TEXT NOT NULL, -- ex: cancellation, adjustment, compensation
    source_reason TEXT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'BRL',
    status TEXT NOT NULL DEFAULT 'available', -- available, reserved, used, expired
    reserved_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    used_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    used_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.financial_credits IS 'Controle de créditos financeiros que podem ser reaproveitados em novos agendamentos.';
COMMENT ON COLUMN public.financial_credits.user_id IS 'Usuário proprietário do crédito.';
COMMENT ON COLUMN public.financial_credits.original_booking_id IS 'Agendamento que originou o crédito.';
COMMENT ON COLUMN public.financial_credits.original_payment_id IS 'Pagamento que gerou o crédito.';
COMMENT ON COLUMN public.financial_credits.source_type IS 'Motivo do crédito (cancellation, adjustment, manual, etc.).';
COMMENT ON COLUMN public.financial_credits.amount IS 'Valor disponível em crédito.';
COMMENT ON COLUMN public.financial_credits.status IS 'Situação do crédito (available, reserved, used, expired).';
COMMENT ON COLUMN public.financial_credits.metadata IS 'Dados extras (referências externas, notas, etc.).';

CREATE INDEX IF NOT EXISTS idx_financial_credits_user_id ON public.financial_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_credits_status ON public.financial_credits(status);
CREATE INDEX IF NOT EXISTS idx_financial_credits_created_at ON public.financial_credits(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_financial_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_financial_credits_updated_at ON public.financial_credits;
CREATE TRIGGER trigger_set_financial_credits_updated_at
    BEFORE UPDATE ON public.financial_credits
    FOR EACH ROW
    EXECUTE FUNCTION public.set_financial_credits_updated_at();

ALTER TABLE public.financial_credits ENABLE ROW LEVEL SECURITY;

-- Paciente pode consultar apenas créditos do próprio usuário
DROP POLICY IF EXISTS "Patients can view own credits" ON public.financial_credits;
CREATE POLICY "Patients can view own credits" ON public.financial_credits
FOR SELECT
USING (user_id = auth.uid());

-- Cria view com saldo por usuário
DROP VIEW IF EXISTS public.user_credit_balances;
CREATE VIEW public.user_credit_balances AS
SELECT
    user_id,
    COALESCE(SUM(amount) FILTER (WHERE status = 'available'), 0)::NUMERIC(10,2) AS available_amount,
    COALESCE(SUM(amount) FILTER (WHERE status = 'reserved'), 0)::NUMERIC(10,2) AS reserved_amount,
    COALESCE(SUM(amount) FILTER (WHERE status = 'used'), 0)::NUMERIC(10,2) AS used_amount,
    COALESCE(SUM(amount) FILTER (WHERE status = 'expired'), 0)::NUMERIC(10,2) AS expired_amount
FROM public.financial_credits
GROUP BY user_id;

ALTER VIEW public.user_credit_balances OWNER TO postgres;
ALTER VIEW public.user_credit_balances SET (security_barrier = true);

GRANT SELECT ON public.financial_credits TO authenticated;
GRANT SELECT ON public.user_credit_balances TO authenticated;

DO $$
BEGIN
    RAISE NOTICE 'Migration add_financial_credits_table executada com sucesso.';
END $$;
