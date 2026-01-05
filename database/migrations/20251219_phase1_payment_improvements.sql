-- =====================================================
-- FASE 1: Preparação do Banco de Dados
-- IMPACTO: ZERO - Apenas adiciona colunas NULLABLE
-- DATA: 2025-12-19
-- =====================================================

-- Descrição:
-- Esta migração adiciona novas colunas à tabela payments e cria
-- a tabela payment_attempts sem afetar dados ou queries existentes.
-- Todas as colunas são NULLABLE para manter backward compatibility.

-- =====================================================
-- 1. Adicionar colunas à tabela payments
-- =====================================================

-- Adicionar coluna para chave de idempotência
-- Previne criação de pagamentos duplicados
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Adicionar coluna para data de expiração
-- Permite expirar pagamentos pendentes automaticamente
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Adicionar contador de tentativas
-- Rastreia quantas vezes o usuário tentou pagar
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_attempt_count INTEGER DEFAULT 1;

-- Adicionar metadados adicionais
-- Armazena informações extras sobre o pagamento
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- =====================================================
-- 2. Criar índices para performance
-- =====================================================

-- Índice para buscar por idempotency_key
-- Usado para verificar pagamentos duplicados rapidamente
CREATE INDEX IF NOT EXISTS idx_payments_idempotency 
ON payments(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Índice para buscar pagamentos que expiram
-- Usado pela função de expiração automática
CREATE INDEX IF NOT EXISTS idx_payments_expires 
ON payments(expires_at) 
WHERE expires_at IS NOT NULL 
  AND status IN ('pending', 'in_process');

-- Índice composto para buscar pagamentos pendentes por booking
-- Otimiza a verificação de pagamentos duplicados
CREATE INDEX IF NOT EXISTS idx_payments_booking_status 
ON payments(booking_id, status) 
WHERE status IN ('pending', 'in_process', 'approved');

-- =====================================================
-- 3. Criar tabela de tentativas de pagamento
-- =====================================================

-- Tabela para registrar todas as tentativas de pagamento
-- Útil para auditoria e debugging
CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  inscricao_id UUID REFERENCES inscricoes_eventos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'initiated',
  error_message TEXT,
  error_code TEXT,
  idempotency_key TEXT,
  mp_payment_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT payment_attempts_status_check 
    CHECK (status IN ('initiated', 'processing', 'succeeded', 'failed', 'cancelled')),
  CONSTRAINT payment_attempts_amount_positive 
    CHECK (amount > 0),
  CONSTRAINT payment_attempts_booking_or_inscricao 
    CHECK (booking_id IS NOT NULL OR inscricao_id IS NOT NULL)
);

-- Índices para payment_attempts
CREATE INDEX IF NOT EXISTS idx_payment_attempts_booking 
ON payment_attempts(booking_id) 
WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_inscricao 
ON payment_attempts(inscricao_id) 
WHERE inscricao_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_user 
ON payment_attempts(user_id) 
WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_idempotency 
ON payment_attempts(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_created 
ON payment_attempts(created_at DESC);

-- =====================================================
-- 4. Criar função de atualização automática
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_payment_attempts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS payment_attempts_updated_at_trigger ON payment_attempts;
CREATE TRIGGER payment_attempts_updated_at_trigger
  BEFORE UPDATE ON payment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_attempts_updated_at();

-- =====================================================
-- 5. Adicionar comentários para documentação
-- =====================================================

COMMENT ON COLUMN payments.idempotency_key IS 
  'Chave única para prevenir pagamentos duplicados. Formato: booking_{id}_{date}';

COMMENT ON COLUMN payments.expires_at IS 
  'Data/hora em que o pagamento pendente expira automaticamente';

COMMENT ON COLUMN payments.payment_attempt_count IS 
  'Número de tentativas de pagamento para este agendamento';

COMMENT ON COLUMN payments.metadata IS 
  'Dados adicionais sobre o pagamento em formato JSON';

COMMENT ON TABLE payment_attempts IS 
  'Registra todas as tentativas de pagamento para auditoria e debugging';

-- =====================================================
-- 6. Verificação de integridade
-- =====================================================

-- Verificar se as colunas foram criadas
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'payments'
    AND column_name IN ('idempotency_key', 'expires_at', 'payment_attempt_count', 'metadata');
  
  IF col_count = 4 THEN
    RAISE NOTICE '✅ Todas as 4 colunas foram adicionadas com sucesso à tabela payments';
  ELSE
    RAISE WARNING '⚠️ Apenas % de 4 colunas foram adicionadas', col_count;
  END IF;
END $$;

-- Verificar se a tabela payment_attempts foi criada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'payment_attempts'
  ) THEN
    RAISE NOTICE '✅ Tabela payment_attempts criada com sucesso';
  ELSE
    RAISE WARNING '⚠️ Tabela payment_attempts não foi criada';
  END IF;
END $$;

-- =====================================================
-- 7. Grants de permissão
-- =====================================================

-- Garantir que authenticated users podem acessar payment_attempts
GRANT SELECT, INSERT ON payment_attempts TO authenticated;
GRANT SELECT, INSERT ON payment_attempts TO anon;

-- Service role tem acesso total
GRANT ALL ON payment_attempts TO service_role;

-- =====================================================
-- FIM DA MIGRAÇÃO - FASE 1
-- =====================================================

-- PRÓXIMOS PASSOS:
-- 1. Executar esta migração em staging
-- 2. Validar que queries existentes continuam funcionando
-- 3. Verificar que agendamentos confirmados estão visíveis
-- 4. Prosseguir para Fase 2: Migração de dados existentes
