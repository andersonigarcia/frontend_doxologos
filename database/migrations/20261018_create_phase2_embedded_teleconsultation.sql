-- ==============================================================================
-- Migration: 20261018_create_phase2_embedded_teleconsultation.sql
-- Descrição: Estrutura da Fase 2 para Teleconsulta Embarcada, Copiloto IA,
--            Circuit Breaker e Ledger Financeiro da IA.
-- ==============================================================================

-- 1. Campos de suporte à teleconsulta e modo de atendimento na tabela bookings
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS video_room_name text NULL,
ADD COLUMN IF NOT EXISTS video_room_url text NULL,
ADD COLUMN IF NOT EXISTS session_started_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS session_ended_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS actual_duration_minutes integer NULL,
ADD COLUMN IF NOT EXISTS consultation_mode text DEFAULT 'embedded' CHECK (consultation_mode IN ('embedded', 'fallback_phase1'));

COMMENT ON COLUMN public.bookings.video_room_name IS 'Nome único da sala efêmera no Daily.co';
COMMENT ON COLUMN public.bookings.video_room_url IS 'URL da sala Daily.co acessada via token seguro';
COMMENT ON COLUMN public.bookings.consultation_mode IS 'Modo de atendimento: embedded (Daily.co) ou fallback_phase1 (link seguro de contingência)';

-- 2. Campos de controle do Copiloto IA no perfil dos profissionais
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS ai_copilot_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS ai_trial_sessions_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_trial_limit integer DEFAULT 3;

COMMENT ON COLUMN public.professionals.ai_copilot_enabled IS 'Indica se o psicólogo aderiu ao assistente de prontuários com IA';
COMMENT ON COLUMN public.professionals.ai_trial_sessions_used IS 'Quantidade de consultas gratuitas de teste do Copiloto IA já utilizadas';
COMMENT ON COLUMN public.professionals.ai_trial_limit IS 'Limite de consultas gratuitas de degustação (padrão: 3)';

-- 3. Tabela de Auditoria e Telemetria de Presença (Anti-Fraude e Verificação)
CREATE TABLE IF NOT EXISTS public.consultation_telemetry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    participant_role text NOT NULL CHECK (participant_role IN ('patient', 'professional', 'system')),
    user_id uuid REFERENCES auth.users(id),
    event_type text NOT NULL CHECK (event_type IN ('joined', 'left', 'ejected', 'heartbeat', 'circuit_breaker_triggered')),
    metadata jsonb NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_booking ON public.consultation_telemetry(booking_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON public.consultation_telemetry(created_at);

ALTER TABLE public.consultation_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e sistema podem gerenciar telemetria"
ON public.consultation_telemetry FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
));

CREATE POLICY "Usuários podem visualizar sua própria telemetria"
ON public.consultation_telemetry FOR SELECT
USING (auth.uid() = user_id);

-- 4. Tabela de Prontuário e Evolução Clínica (Acesso Exclusivo do Profissional - CFP)
CREATE TABLE IF NOT EXISTS public.clinical_evolutions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES auth.users(id),
    professional_id uuid NOT NULL REFERENCES public.professionals(id),
    ai_generated_summary jsonb NULL,
    professional_notes text NULL,
    transcript_text text NULL,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
    approved_at timestamptz NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_evolutions_booking ON public.clinical_evolutions(booking_id);
CREATE INDEX IF NOT EXISTS idx_clinical_evolutions_patient ON public.clinical_evolutions(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_evolutions_prof ON public.clinical_evolutions(professional_id);

ALTER TABLE public.clinical_evolutions ENABLE ROW LEVEL SECURITY;

-- Sigilo absoluto: Apenas o psicólogo dono do registro pode ver e editar sua evolução clínica
CREATE POLICY "Apenas o psicólogo responsável tem acesso ao prontuário"
ON public.clinical_evolutions FOR ALL
USING (auth.uid() IN (
    SELECT user_id FROM public.professionals WHERE id = clinical_evolutions.professional_id
));

-- 5. Tabela de Gestão Financeira da IA (Ledger de IA para o Painel Admin)
CREATE TABLE IF NOT EXISTS public.ai_usage_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    professional_id uuid NOT NULL REFERENCES public.professionals(id),
    is_trial boolean DEFAULT false,
    add_on_amount numeric(10,2) DEFAULT 2.90,
    technical_cost numeric(10,2) DEFAULT 1.20,
    net_margin numeric(10,2) GENERATED ALWAYS AS (
        CASE WHEN is_trial THEN -technical_cost ELSE (add_on_amount - technical_cost) END
    ) STORED,
    billing_status text DEFAULT 'pending_payout_deduction' CHECK (billing_status IN ('pending_payout_deduction', 'deducted', 'waived_trial', 'cancelled')),
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_ledger_prof ON public.ai_usage_ledger(professional_id);
CREATE INDEX IF NOT EXISTS idx_ai_ledger_created ON public.ai_usage_ledger(created_at);

ALTER TABLE public.ai_usage_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e sistema gerenciam o ledger de IA"
ON public.ai_usage_ledger FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role' OR auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
));

CREATE POLICY "Psicólogos podem consultar seus próprios lançamentos de IA"
ON public.ai_usage_ledger FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.professionals WHERE id = ai_usage_ledger.professional_id
));
