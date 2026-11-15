-- =====================================================================
-- MIGRATION: Resiliência e Central de Correção de NFS-e (PBH BHISS)
-- Data: 2026-08-14
-- Descrição: Adiciona suporte a categorização de erros, contagem de retentativas,
--            override de dados do tomador, endereço e auditoria de correção.
-- =====================================================================

-- 1. Adicionar novas colunas para controle de resiliência e auditoria
ALTER TABLE public.nfse_emissions
    ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS error_category VARCHAR(50) DEFAULT 'SYSTEM_ERROR',
    ADD COLUMN IF NOT EXISTS corrected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS correction_notes TEXT,
    ADD COLUMN IF NOT EXISTS tomador_endereco JSONB DEFAULT '{}'::jsonb;

-- 2. Atualizar a constraint de status para permitir 'manual_resolved'
DO $$
BEGIN
    ALTER TABLE public.nfse_emissions DROP CONSTRAINT IF EXISTS nfse_emissions_status_check;
    ALTER TABLE public.nfse_emissions ADD CONSTRAINT nfse_emissions_status_check 
        CHECK (status IN ('pending', 'processing', 'issued', 'error', 'cancelled', 'manual_resolved'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Índices de alta performance para a Central de Resiliência
CREATE INDEX IF NOT EXISTS idx_nfse_emissions_error_category ON public.nfse_emissions(error_category);
CREATE INDEX IF NOT EXISTS idx_nfse_emissions_status_created ON public.nfse_emissions(status, created_at DESC);

-- 4. Garantir que Admins possam atualizar registros de NFS-e (para correção e reenvio)
DROP POLICY IF EXISTS "Admins podem atualizar registros de NFS-e" ON public.nfse_emissions;
CREATE POLICY "Admins podem atualizar registros de NFS-e"
    ON public.nfse_emissions
    FOR UPDATE
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('admin', 'service_role') OR
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'gestor', 'financeiro')
    )
    WITH CHECK (
        (auth.jwt() ->> 'role') IN ('admin', 'service_role') OR
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'gestor', 'financeiro')
    );

COMMENT ON COLUMN public.nfse_emissions.error_category IS 'Categorização do erro: VALIDATION_ERROR (payload/CPF), PREFEITURA_OFFLINE (5xx/Timeout), AUTH_ERROR, SYSTEM_ERROR, MANUAL_RESOLVED';
COMMENT ON COLUMN public.nfse_emissions.retry_count IS 'Número de tentativas de reenvio efetuadas';
