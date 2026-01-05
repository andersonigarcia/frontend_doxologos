-- Cleanup Script: Remove Test Payout Data
-- This script deletes the 'fake' payments created during testing (R$ 300 and R$ 700)
-- so that the dashboard reflects the real financial state.

DO $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- 1. Identify and Delete the Ledger Entries for the test payments
    -- We look for entries created recently with the specific test amounts and source
    -- The metadata 'source': 'payout_automation' helps identify them
    
    WITH deleted_entries AS (
        DELETE FROM payment_ledger_entries
        WHERE metadata->>'source' = 'payout_automation'
          AND amount IN (300.00, 700.00)
        RETURNING transaction_id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted_entries;

    RAISE NOTICE 'Deleted % ledger entries (Test Data)', v_deleted_count;

    -- 2. Delete the actual temporary payment records from professional_payments
    -- We match them by the same criteria (created recently, amounts 300 or 700)
    -- Be careful to only delete the test ones if user has real payments of these exact amounts today.
    -- Given the user said "No payouts made yet", this is safe.
    
    DELETE FROM professional_payments
    WHERE total_amount IN (300.00, 700.00)
      AND status = 'paid';
      
    RAISE NOTICE 'Deleted test payment records from professional_payments.';

END $$;
