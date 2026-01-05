-- ==============================================================================
-- Allow Admins to UPDATE and DELETE *Manual* Ledger Entries
-- System entries (webhook) remain immutable.
-- ==============================================================================

-- 1. Policy for UPDATE
-- Only admins, only if source is manual_reconciliation
CREATE POLICY "Admins can update manual ledger entries" ON payment_ledger_entries
    FOR UPDATE
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        AND
        metadata->>'source' = 'manual_reconciliation'
    )
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        AND
        metadata->>'source' = 'manual_reconciliation'
    );

-- 2. Policy for DELETE
-- Only admins, only if source is manual_reconciliation
CREATE POLICY "Admins can delete manual ledger entries" ON payment_ledger_entries
    FOR DELETE
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin' OR auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
        AND
        metadata->>'source' = 'manual_reconciliation'
    );

COMMENT ON POLICY "Admins can update manual ledger entries" ON payment_ledger_entries IS 'Permite editar apenas lançamentos manuais';
COMMENT ON POLICY "Admins can delete manual ledger entries" ON payment_ledger_entries IS 'Permite excluir apenas lançamentos manuais';
