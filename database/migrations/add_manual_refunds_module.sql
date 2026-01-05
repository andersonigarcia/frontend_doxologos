-- Migration: Módulo de reembolsos financeiros manuais
-- Data: 2025-11-09

-- 1) Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2) Tabela principal de reembolsos
CREATE TABLE IF NOT EXISTS public.payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
    processed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'BRL',
    reason TEXT,
    proof_bucket TEXT NOT NULL DEFAULT 'finance-refunds',
    proof_path TEXT NOT NULL,
    proof_checksum TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payment_refunds IS 'Reembolsos manuais aprovados pelo time financeiro.';
COMMENT ON COLUMN public.payment_refunds.payment_id IS 'Pagamento original que recebeu o reembolso.';
COMMENT ON COLUMN public.payment_refunds.processed_by IS 'Usuário backoffice responsável pelo reembolso.';
COMMENT ON COLUMN public.payment_refunds.proof_path IS 'Caminho do comprovante no bucket de armazenamento seguro.';

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_id ON public.payment_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_processed_by ON public.payment_refunds(processed_by);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_created_at ON public.payment_refunds(created_at DESC);

-- 3) Função para manter updated_at sincronizado
CREATE OR REPLACE FUNCTION public.set_payment_refunds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_payment_refunds_updated_at ON public.payment_refunds;
CREATE TRIGGER trigger_set_payment_refunds_updated_at
    BEFORE UPDATE ON public.payment_refunds
    FOR EACH ROW
    EXECUTE FUNCTION public.set_payment_refunds_updated_at();

-- 4) Log de auditoria imutável
CREATE TABLE IF NOT EXISTS public.payment_refund_audit_log (
    id BIGSERIAL PRIMARY KEY,
    refund_id UUID NOT NULL REFERENCES public.payment_refunds(id) ON DELETE CASCADE,
    performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    action TEXT NOT NULL DEFAULT 'refund_created',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payment_refund_audit_log IS 'Histórico imutável de ações relacionadas a reembolsos manuais.';

CREATE INDEX IF NOT EXISTS idx_payment_refund_audit_log_refund_id ON public.payment_refund_audit_log(refund_id);
CREATE INDEX IF NOT EXISTS idx_payment_refund_audit_log_created_at ON public.payment_refund_audit_log(created_at DESC);

-- Função e triggers para impedir alterações após inserção
CREATE OR REPLACE FUNCTION public.prevent_audit_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_refund_audit_log_no_update ON public.payment_refund_audit_log;
CREATE TRIGGER trg_payment_refund_audit_log_no_update
    BEFORE UPDATE ON public.payment_refund_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_update();

DROP TRIGGER IF EXISTS trg_payment_refund_audit_log_no_delete ON public.payment_refund_audit_log;
CREATE TRIGGER trg_payment_refund_audit_log_no_delete
    BEFORE DELETE ON public.payment_refund_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_update();

-- 5) Tabela de notificações de reembolso
CREATE TABLE IF NOT EXISTS public.payment_refund_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id UUID NOT NULL REFERENCES public.payment_refunds(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'error')),
    attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error TEXT,
    recipient_email TEXT NOT NULL,
    cc_emails TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    subject TEXT,
    message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payment_refund_notifications IS 'Fila de notificações (e-mail) para reembolsos manuais.';

CREATE INDEX IF NOT EXISTS idx_payment_refund_notifications_status ON public.payment_refund_notifications(status);
CREATE INDEX IF NOT EXISTS idx_payment_refund_notifications_scheduled_at ON public.payment_refund_notifications(scheduled_at);

CREATE OR REPLACE FUNCTION public.set_payment_refund_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_payment_refund_notifications_updated_at ON public.payment_refund_notifications;
CREATE TRIGGER trigger_set_payment_refund_notifications_updated_at
    BEFORE UPDATE ON public.payment_refund_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.set_payment_refund_notifications_updated_at();

-- 6) Ajustes na tabela payments (contas a receber)
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- 7) Política de segurança: apenas service role por enquanto
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refund_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refund_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.payment_refunds;
CREATE POLICY "Service role full access" ON public.payment_refunds
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON public.payment_refund_audit_log;
CREATE POLICY "Service role full access" ON public.payment_refund_audit_log
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON public.payment_refund_notifications;
CREATE POLICY "Service role full access" ON public.payment_refund_notifications
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 8) Função transacional para registrar reembolso manual
CREATE OR REPLACE FUNCTION public.perform_manual_refund(
    p_payment_id UUID,
    p_amount NUMERIC,
    p_currency TEXT,
    p_reason TEXT,
    p_proof_bucket TEXT,
    p_proof_path TEXT,
    p_proof_checksum TEXT,
    p_metadata JSONB,
    p_processed_by UUID,
    p_notification_recipient TEXT,
    p_notification_cc TEXT[],
    p_notification_subject TEXT,
    p_notification_message TEXT
) RETURNS public.payment_refunds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment RECORD;
    v_amount NUMERIC(10,2);
    v_currency TEXT;
    v_refund public.payment_refunds;
BEGIN
    SELECT *
      INTO v_payment
      FROM public.payments
     WHERE id = p_payment_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0001';
    END IF;

    IF v_payment.status = 'refunded' OR (v_payment.refund_status IS NOT NULL AND lower(v_payment.refund_status) = 'refunded') THEN
        RAISE EXCEPTION 'payment_already_refunded' USING ERRCODE = 'P0001';
    END IF;

    v_amount := COALESCE(p_amount, v_payment.amount);
    IF v_amount IS NULL OR v_amount <= 0 THEN
        RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0001';
    END IF;

    IF v_payment.amount IS NOT NULL AND v_amount > v_payment.amount THEN
        RAISE EXCEPTION 'amount_greater_than_original' USING ERRCODE = 'P0001';
    END IF;

    v_currency := COALESCE(p_currency, v_payment.currency, 'BRL');

    UPDATE public.payments
       SET status = 'refunded',
           refund_status = 'refunded',
           refund_amount = v_amount,
           refund_date = NOW(),
           refunded_at = NOW(),
           updated_at = NOW()
     WHERE id = p_payment_id;

    INSERT INTO public.payment_refunds (
        payment_id,
        processed_by,
        amount,
        currency,
        reason,
        proof_bucket,
        proof_path,
        proof_checksum,
        metadata
    ) VALUES (
        p_payment_id,
        p_processed_by,
        v_amount,
        v_currency,
        p_reason,
        COALESCE(p_proof_bucket, 'finance-refunds'),
        p_proof_path,
        p_proof_checksum,
        COALESCE(p_metadata, '{}'::jsonb)
    ) RETURNING * INTO v_refund;

    INSERT INTO public.payment_refund_audit_log (
        refund_id,
        performed_by,
        action,
        payload
    ) VALUES (
        v_refund.id,
        p_processed_by,
        'refund_created',
        json_build_object(
            'payment_id', p_payment_id,
            'amount', v_amount,
            'currency', v_currency,
            'reason', p_reason,
            'metadata', COALESCE(p_metadata, '{}'::jsonb)
        )
    );

    INSERT INTO public.payment_refund_notifications (
        refund_id,
        status,
        recipient_email,
        cc_emails,
        subject,
        message,
        metadata
    ) VALUES (
        v_refund.id,
        'pending',
        COALESCE(p_notification_recipient, v_payment.payer_email),
        COALESCE(p_notification_cc, ARRAY[]::TEXT[]),
        p_notification_subject,
        p_notification_message,
        json_build_object(
            'payment_id', p_payment_id,
            'refund_id', v_refund.id,
            'payer_email', v_payment.payer_email,
            'booking_id', v_payment.booking_id
        )
    );

    RETURN v_refund;
END;
$$;

GRANT EXECUTE ON FUNCTION public.perform_manual_refund(
    UUID,
    NUMERIC,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    JSONB,
    UUID,
    TEXT,
    TEXT[],
    TEXT,
    TEXT
) TO service_role;

-- 9) Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Migration add_manual_refunds_module executada com sucesso.';
END $$;
