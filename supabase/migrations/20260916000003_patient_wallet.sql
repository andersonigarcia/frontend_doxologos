-- 20260916000003_patient_wallet.sql
-- Fase 3: Carteira Digital do Paciente e Transações

-- 1. Tabela da Carteira do Paciente
CREATE TABLE IF NOT EXISTS public.patient_wallets (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Histórico de Transações
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL, -- Valores positivos para crédito, negativos para débito
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_cancellation', 'debit_payment', 'admin_adjustment')),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Adicionar coluna na tabela payments para rastrear pagamentos mistos (Wallet + PIX/Cartão)
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS wallet_balance_used NUMERIC(10, 2) DEFAULT 0.00;

-- 4. Função Segura (RPC) para Adicionar/Remover Saldo
-- Esta função garante que a leitura do saldo, a atualização e a inserção do log ocorram de forma atômica
CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
    p_patient_id UUID,
    p_amount NUMERIC,
    p_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_booking_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com privilégios de quem criou a função (Admin)
AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- 1. Garante que a carteira existe, travando a linha para leitura concorrente
    INSERT INTO public.patient_wallets (id, balance)
    VALUES (p_patient_id, 0.00)
    ON CONFLICT (id) DO NOTHING;

    SELECT balance INTO v_current_balance
    FROM public.patient_wallets
    WHERE id = p_patient_id
    FOR UPDATE; -- Bloqueia a linha contra outras transações simultâneas

    -- 2. Calcula novo saldo
    v_new_balance := v_current_balance + p_amount;

    -- 3. Validação de saldo negativo
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Saldo insuficiente na carteira do paciente.';
    END IF;

    -- 4. Atualiza a carteira
    UPDATE public.patient_wallets
    SET balance = v_new_balance,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_patient_id;

    -- 5. Registra a transação
    INSERT INTO public.wallet_transactions (patient_id, amount, transaction_type, description, booking_id)
    VALUES (p_patient_id, p_amount, p_type, p_description, p_booking_id);

    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance,
        'amount', p_amount
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- 5. RLS Policies
-- Carteira (Wallet)
ALTER TABLE public.patient_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pacientes podem ver sua própria carteira"
    ON public.patient_wallets FOR SELECT
    USING (auth.uid() = id);

-- Transações
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pacientes podem ver suas próprias transações"
    ON public.wallet_transactions FOR SELECT
    USING (auth.uid() = patient_id);
