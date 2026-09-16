-- ==============================================================================
-- MIGRATION: 20260815_create_assessment_leads.sql
-- DESCRIÇÃO: Tabela estruturada para persistência de Leads Psicométricos (GAD-7)
-- AUTOR: Squad Multiagente Doxologos Psicologia
-- DATA: 2026-08-15
-- ==============================================================================

-- 1. Enums de Severidade e Status do Lead
DO $$ BEGIN
    CREATE TYPE assessment_severity_enum AS ENUM ('minimal', 'mild', 'moderate', 'severe', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status_enum AS ENUM ('novo', 'contatado', 'agendou', 'sem_interesse', 'descartado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Criação da Tabela assessment_leads
CREATE TABLE IF NOT EXISTS public.assessment_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id VARCHAR(50) NOT NULL,
    assessment_title VARCHAR(150) NOT NULL,
    score SMALLINT NOT NULL CHECK (score >= 0),
    max_score SMALLINT NOT NULL DEFAULT 21,
    severity assessment_severity_enum NOT NULL DEFAULT 'unknown',
    
    -- Dados de Contato Sanitizados (LGPD)
    patient_name VARCHAR(150),
    patient_email VARCHAR(255),
    patient_phone VARCHAR(20),
    
    -- Respostas Estruturadas em JSONB
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    functional_impact SMALLINT,
    
    -- Gestão Operacional / CRM
    status lead_status_enum NOT NULL DEFAULT 'novo',
    admin_notes TEXT,
    contacted_at TIMESTAMPTZ,
    contacted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    converted_to_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    
    -- Metadados de Auditoria e Consentimento
    lgpd_consent BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Índices de Otimização
CREATE INDEX IF NOT EXISTS idx_assessment_leads_severity ON public.assessment_leads(severity);
CREATE INDEX IF NOT EXISTS idx_assessment_leads_status ON public.assessment_leads(status);
CREATE INDEX IF NOT EXISTS idx_assessment_leads_created_at ON public.assessment_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessment_leads_email ON public.assessment_leads(patient_email);
CREATE INDEX IF NOT EXISTS idx_assessment_leads_assessment_id ON public.assessment_leads(assessment_id);

-- 4. Trigger para Atualização Automática de updated_at
CREATE OR REPLACE FUNCTION public.handle_assessment_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assessment_leads_updated_at ON public.assessment_leads;
CREATE TRIGGER trg_assessment_leads_updated_at
    BEFORE UPDATE ON public.assessment_leads
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_assessment_leads_updated_at();

-- 5. Configuração de Row Level Security (RLS)
ALTER TABLE public.assessment_leads ENABLE ROW LEVEL SECURITY;

-- Service Role possui acesso total
DROP POLICY IF EXISTS "Service Role possui acesso total em assessment_leads" ON public.assessment_leads;
CREATE POLICY "Service Role possui acesso total em assessment_leads"
    ON public.assessment_leads FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Política de Leitura: Admins e Profissionais autenticados
DROP POLICY IF EXISTS "Admins podem visualizar todos os leads" ON public.assessment_leads;
DROP POLICY IF EXISTS "Admins e profissionais podem visualizar todos os leads" ON public.assessment_leads;
CREATE POLICY "Admins e profissionais podem visualizar todos os leads"
    ON public.assessment_leads FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('admin', 'service_role') OR
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'gestor', 'professional', 'psicologo') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'gestor', 'professional', 'psicologo') OR
        EXISTS (
            SELECT 1 FROM public.professionals p
            WHERE p.user_id = auth.uid() OR p.id::text = auth.uid()::text
        )
    );

-- Política de Atualização: Admins e Profissionais
DROP POLICY IF EXISTS "Admins podem atualizar status de leads" ON public.assessment_leads;
DROP POLICY IF EXISTS "Admins e profissionais podem atualizar status de leads" ON public.assessment_leads;
CREATE POLICY "Admins e profissionais podem atualizar status de leads"
    ON public.assessment_leads FOR UPDATE
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('admin', 'service_role') OR
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'gestor', 'professional', 'psicologo') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'gestor', 'professional', 'psicologo') OR
        EXISTS (
            SELECT 1 FROM public.professionals p
            WHERE p.user_id = auth.uid() OR p.id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        (auth.jwt() ->> 'role') IN ('admin', 'service_role') OR
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'gestor', 'professional', 'psicologo') OR
        (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'gestor', 'professional', 'psicologo') OR
        EXISTS (
            SELECT 1 FROM public.professionals p
            WHERE p.user_id = auth.uid() OR p.id::text = auth.uid()::text
        )
    );

-- Política de Inserção: Visitantes (anônimos ou autenticados) podem submeter o teste
DROP POLICY IF EXISTS "Visitantes podem registrar respostas de avaliações" ON public.assessment_leads;
CREATE POLICY "Visitantes podem registrar respostas de avaliações"
    ON public.assessment_leads FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
