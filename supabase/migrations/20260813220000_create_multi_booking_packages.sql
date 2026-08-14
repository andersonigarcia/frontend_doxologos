-- Supabase Migration: 20260813220000_create_multi_booking_packages.sql
-- Módulo de Agendamento Múltiplo & Pacotes Recorrentes de Sessões (Doxologos Psicologia)

-- 1. Criar Tabela de Pacotes de Consultas
CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT,
    patient_cpf TEXT,
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    total_sessions INT NOT NULL DEFAULT 1,
    gross_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    professional_repasse_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    platform_fee_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'completed', 'partially_refunded')),
    marketplace_payment_id TEXT,
    cancellation_reason TEXT,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adicionar Coluna package_id na Tabela public.bookings (Caso não exista)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'package_id'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Índices para Otimização de Consultas de Pacotes
CREATE INDEX IF NOT EXISTS idx_packages_professional_id ON public.packages(professional_id);
CREATE INDEX IF NOT EXISTS idx_packages_patient_email ON public.packages(patient_email);
CREATE INDEX IF NOT EXISTS idx_packages_status ON public.packages(status);
CREATE INDEX IF NOT EXISTS idx_bookings_package_id ON public.bookings(package_id);

-- 4. Habilitar RLS na Tabela public.packages
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para public.packages
CREATE POLICY "Acesso total a pacotes para administradores e serviço"
    ON public.packages
    FOR ALL
    USING (
        auth.role() = 'service_role' OR auth.role() = 'authenticated' OR auth.role() = 'anon'
    );

-- 5. Função RPC para Transição Contábil da Custódia de Pacotes (Regime de Competência)
CREATE OR REPLACE FUNCTION public.release_package_session_escrow(
    p_booking_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_booking RECORD;
    v_repasse DECIMAL(10,2);
    v_platform DECIMAL(10,2);
BEGIN
    -- Buscar dados do agendamento
    SELECT b.id, b.package_id, b.valor_consulta, b.valor_repasse_profissional, b.status, p.id AS payment_id
    INTO v_booking
    FROM public.bookings b
    LEFT JOIN public.payments p ON p.booking_id = b.id OR p.mp_payment_id = b.marketplace_payment_id
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado');
    END IF;

    -- Verificar se é um agendamento vinculado a pacote
    IF v_booking.package_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Agendamento avulso - custódia de pacote não aplicável');
    END IF;

    v_repasse := COALESCE(v_booking.valor_repasse_profissional, v_booking.valor_consulta * 0.60);
    v_platform := v_booking.valor_consulta - v_repasse;

    -- Lançamento no Livro Caixa: Liberação da Custódia PACKAGE_ESCROW
    IF v_booking.payment_id IS NOT NULL THEN
        INSERT INTO public.payment_ledger_entries (transaction_id, entry_type, account_code, amount, description)
        VALUES
            (v_booking.payment_id, 'DEBIT', 'PACKAGE_ESCROW', v_booking.valor_consulta, 'Liberação Custódia Pacote: Sessão #' || p_booking_id),
            (v_booking.payment_id, 'CREDIT', 'REVENUE_SERVICE', v_platform, 'Receita Plataforma: Sessão Pacote #' || p_booking_id),
            (v_booking.payment_id, 'CREDIT', 'LIABILITY_PROFESSIONAL', v_repasse, 'Repasse Profissional: Sessão Pacote #' || p_booking_id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'repasse', v_repasse, 'platform_fee', v_platform);
END;
$$;
