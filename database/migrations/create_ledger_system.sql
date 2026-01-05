-- ============================================
-- Migração: Sistema de Ledger (Livro Razão)
-- ============================================

-- 1. Tabela para registros contábeis (Double Entry)
CREATE TABLE IF NOT EXISTS payment_ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL, -- Referência à transação original (payment_id, booking_id, payout_id)
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    account_code VARCHAR(50) NOT NULL, -- Ex: 'CASH_BANK', 'ACCOUNTS_RECEIVABLE', 'REVENUE_SERVICE', 'LIABILITY_PROFESSIONAL'
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Auditoria
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_ledger_transaction ON payment_ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON payment_ledger_entries(account_code);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON payment_ledger_entries(created_at);

-- 3. Segurança (RLS)
ALTER TABLE payment_ledger_entries ENABLE ROW LEVEL SECURITY;

-- Política: Apenas Admins podem visualizar o Ledger
CREATE POLICY "Admins can view ledger entries" ON payment_ledger_entries
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Política: Ninguém pode alterar/deletar registros (Imutabilidade)
-- Não criamos policies FOR UPDATE ou FOR DELETE, o que por padrão bloqueia essas ações (deny-all)

-- Política: Service Role pode inserir (para automações e Edge Functions)
CREATE POLICY "Service role can insert ledger entries" ON payment_ledger_entries
    FOR INSERT
    WITH CHECK (true);

-- 4. Comentários para documentação
COMMENT ON TABLE payment_ledger_entries IS 'Registros contábeis imutáveis de dupla entrada (Ledger)';
COMMENT ON COLUMN payment_ledger_entries.entry_type IS 'DEBIT ou CREDIT';
COMMENT ON COLUMN payment_ledger_entries.account_code IS 'Código da conta contábil (Ex: LIABILTY_PROFESSIONAL)';
