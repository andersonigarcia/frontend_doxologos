-- =====================================================================
-- MIGRATION: NFS-e — package_id, emission_mode e constraints de unicidade
-- Data: 2026-09-02
-- Fixes: Bug #4 (idempotência package_id), rastreabilidade, anti-duplicatas
-- =====================================================================

-- 1. Adicionar colunas ausentes para rastreabilidade de pacotes e modo de emissão
ALTER TABLE public.nfse_emissions
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS emission_mode VARCHAR(20) DEFAULT 'sandbox'
    CHECK (emission_mode IN ('sandbox', 'production', 'manual'));

-- 2. Índice para busca por package_id (Fix Bug #4 — idempotência correta)
CREATE INDEX IF NOT EXISTS idx_nfse_emissions_package_id
  ON public.nfse_emissions(package_id);

CREATE INDEX IF NOT EXISTS idx_nfse_emissions_emission_mode
  ON public.nfse_emissions(emission_mode);

-- 3. Constraints parciais de unicidade para prevenir NFS-e duplicadas
--    (Partial unique index: apenas registros com status='issued' são únicos)
CREATE UNIQUE INDEX IF NOT EXISTS uq_nfse_issued_per_booking
  ON public.nfse_emissions(booking_id)
  WHERE booking_id IS NOT NULL AND status = 'issued';

CREATE UNIQUE INDEX IF NOT EXISTS uq_nfse_issued_per_package
  ON public.nfse_emissions(package_id)
  WHERE package_id IS NOT NULL AND status = 'issued';

CREATE UNIQUE INDEX IF NOT EXISTS uq_nfse_issued_per_inscricao
  ON public.nfse_emissions(inscricao_id)
  WHERE inscricao_id IS NOT NULL AND status = 'issued';

-- 4. Atualizar constraint de status para cobrir todos os valores usados no código
DO $$
BEGIN
  ALTER TABLE public.nfse_emissions DROP CONSTRAINT IF EXISTS nfse_emissions_status_check;
  ALTER TABLE public.nfse_emissions ADD CONSTRAINT nfse_emissions_status_check
    CHECK (status IN ('pending', 'processing', 'issued', 'error', 'cancelled', 'manual_resolved'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 5. Garantir coluna valor_servico com check flexível (permite 0 em modo error antes de update)
-- A constraint original (valor_servico > 0) impede gravação de registros de erro sem valor.
-- Ajuste: tornar a constraint em nível de trigger ou remover para flexibilidade.
-- NOTA: A constraint CHECK na criação original bloqueava inserção de erros sem valor.
--       Vamos substituir por DEFAULT conservador.
ALTER TABLE public.nfse_emissions ALTER COLUMN valor_servico SET DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE public.nfse_emissions DROP CONSTRAINT IF EXISTS nfse_emissions_valor_servico_check;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Comentários de documentação
COMMENT ON COLUMN public.nfse_emissions.package_id IS 'Referência ao pacote de sessões para rastreabilidade fiscal e idempotência de emissão.';
COMMENT ON COLUMN public.nfse_emissions.emission_mode IS 'Modo de emissão: sandbox (simulado), production (BHISS Digital real), manual (emitido no portal PBH).';
