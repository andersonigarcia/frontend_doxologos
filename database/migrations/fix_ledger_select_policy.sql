-- ==============================================================================
-- Fix Ledger Select Policy
-- The previous policy relied on reading 'auth.users', which is restricted.
-- We will replace it with a policy that checks the JWT metadata directly.
-- ==============================================================================

-- Drop the old restricted policy
DROP POLICY IF EXISTS "Admins can view ledger entries" ON payment_ledger_entries;

-- Create the new optimized policy
CREATE POLICY "Admins can view ledger entries" ON payment_ledger_entries
    FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    );

COMMENT ON POLICY "Admins can view ledger entries" ON payment_ledger_entries IS 'Permite admins visualizarem o ledger checando metadata do JWT (mais rápido e seguro)';
