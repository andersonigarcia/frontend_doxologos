-- =====================================================================
-- MIGRATION: Módulo de Emissão de Nota Fiscal Eletrônica (NFS-e BHISS PBH)
-- Data: 2026-08-13
-- Descrição: Criação da tabela nfse_emissions, políticas RLS e função para automação fiscal.
-- =====================================================================

-- 1. Criar Tabela de Emissões de NFS-e
CREATE TABLE IF NOT EXISTS public.nfse_emissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    inscricao_id UUID REFERENCES public.inscricoes_eventos(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'issued', 'error', 'cancelled')),
    nfse_number VARCHAR(50),
    verification_code VARCHAR(100),
    xml_url TEXT,
    pdf_url TEXT,
    prestador_cnpj VARCHAR(20) DEFAULT '35035127000120',
    tomador_cpf_cnpj VARCHAR(20),
    tomador_nome VARCHAR(255),
    tomador_email VARCHAR(255),
    valor_servico NUMERIC(10,2) NOT NULL CHECK (valor_servico > 0),
    aliquota_iss NUMERIC(5,2) DEFAULT 2.00, -- Alíquota padrão Simples Nacional BHISS para Saúde
    codigo_servico_bh VARCHAR(50) DEFAULT '04.01.01', -- Código tributável de Psicologia/Saúde Mental PBH
    discriminacao TEXT NOT NULL,
    error_message TEXT,
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para Otimização de Consultas
CREATE INDEX IF NOT EXISTS idx_nfse_emissions_booking_id ON public.nfse_emissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_nfse_emissions_inscricao_id ON public.nfse_emissions(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_nfse_emissions_payment_id ON public.nfse_emissions(payment_id);
CREATE INDEX IF NOT EXISTS idx_nfse_emissions_status ON public.nfse_emissions(status);
CREATE INDEX IF NOT EXISTS idx_nfse_emissions_number ON public.nfse_emissions(nfse_number);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.nfse_emissions ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas se existirem para evitar erros em re-execução
DROP POLICY IF EXISTS "Service Role possui acesso total em nfse_emissions" ON public.nfse_emissions;
DROP POLICY IF EXISTS "Admins podem visualizar todas as NFS-e" ON public.nfse_emissions;
DROP POLICY IF EXISTS "Pacientes podem visualizar suas próprias NFS-e" ON public.nfse_emissions;

-- 5. Criar Políticas de Acesso RLS
CREATE POLICY "Service Role possui acesso total em nfse_emissions"
    ON public.nfse_emissions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins podem visualizar todas as NFS-e"
    ON public.nfse_emissions
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') IN ('admin', 'service_role') OR
        (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'gestor', 'financeiro')
    );



CREATE POLICY "Pacientes podem visualizar suas próprias NFS-e"
    ON public.nfse_emissions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = nfse_emissions.booking_id
            AND b.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.inscricoes_eventos ie
            WHERE ie.id = nfse_emissions.inscricao_id
            AND ie.user_id = auth.uid()
        )
    );


-- 6. Trigger para Atualização Automática de updated_at
CREATE OR REPLACE FUNCTION public.update_nfse_emissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_nfse_emissions_updated_at ON public.nfse_emissions;
CREATE TRIGGER trigger_update_nfse_emissions_updated_at
    BEFORE UPDATE ON public.nfse_emissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_nfse_emissions_updated_at();

-- Comentários de Documentação
COMMENT ON TABLE public.nfse_emissions IS 'Registro de emissões automatizadas de NFS-e (PBH BHISS Digital) para consultas de psicologia e eventos.';
COMMENT ON COLUMN public.nfse_emissions.codigo_servico_bh IS 'Item da Lista de Serviços 04.01.01 (Serviços de Psicologia e Saúde Mental - PBH).';
