-- Allow Admins to insert manual entries into Ledger
CREATE POLICY "Admins can insert ledger entries" ON payment_ledger_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    );

-- Optional: Ensure metadata is JSONB if not already (it is in create script)
-- Add comment
COMMENT ON POLICY "Admins can insert ledger entries" ON payment_ledger_entries IS 'Permite que admins façam lançamentos manuais no livro caixa';
