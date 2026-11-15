-- =====================================================================
-- MIGRATION: Módulo CRM WhatsApp & Lembretes Anti-No-Show
-- Data: 2026-08-13
-- Descrição: Criação da infraestrutura para régua de comunicação WhatsApp (24h, 1h e 10min) com suporte a modo gratuito (Web wa.me) e provedores de API.
-- =====================================================================

-- 1. Adicionar colunas de rastreamento de lembretes na tabela bookings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'whatsapp_24h_sent_at') THEN
        ALTER TABLE public.bookings ADD COLUMN whatsapp_24h_sent_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'whatsapp_1h_sent_at') THEN
        ALTER TABLE public.bookings ADD COLUMN whatsapp_1h_sent_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'whatsapp_10min_sent_at') THEN
        ALTER TABLE public.bookings ADD COLUMN whatsapp_10min_sent_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'patient_phone') THEN
        ALTER TABLE public.bookings ADD COLUMN patient_phone VARCHAR(30);
    END IF;
END $$;

-- 2. Tabela de Logs e Histórico de Lembretes WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    inscricao_id UUID REFERENCES public.inscricoes_eventos(id) ON DELETE SET NULL,
    reminder_type VARCHAR(30) NOT NULL CHECK (reminder_type IN ('24h', '1h', '10min', 'confirmation', 'custom')),
    recipient_phone VARCHAR(30) NOT NULL,
    recipient_name VARCHAR(255),
    message_body TEXT NOT NULL,
    wa_me_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'logged_only' CHECK (status IN ('logged_only', 'pending', 'sent', 'failed')),
    provider_response JSONB,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Índices para Otimização de Consultas de Cron / Visualização
CREATE INDEX IF NOT EXISTS idx_wa_reminder_booking_id ON public.whatsapp_reminder_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_wa_reminder_inscricao_id ON public.whatsapp_reminder_logs(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_wa_reminder_status ON public.whatsapp_reminder_logs(status);
CREATE INDEX IF NOT EXISTS idx_wa_reminder_type ON public.whatsapp_reminder_logs(reminder_type);

-- 4. Habilitar RLS
ALTER TABLE public.whatsapp_reminder_logs ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas anteriores para re-execução limpa
DROP POLICY IF EXISTS "Service Role possui acesso total em whatsapp_reminder_logs" ON public.whatsapp_reminder_logs;
DROP POLICY IF EXISTS "Admins podem visualizar logs de whatsapp" ON public.whatsapp_reminder_logs;

-- 6. Políticas de Acesso RLS
CREATE POLICY "Service Role possui acesso total em whatsapp_reminder_logs"
    ON public.whatsapp_reminder_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins podem visualizar logs de whatsapp"
    ON public.whatsapp_reminder_logs
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('admin', 'service_role') OR
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'gestor', 'atendimento')
    );

COMMENT ON TABLE public.whatsapp_reminder_logs IS 'Logs e histórico da régua de lembretes WhatsApp para redução de no-show (faltas).';
