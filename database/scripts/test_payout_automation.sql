-- Test Script for Payout Ledger Automation
-- Run this in your Supabase SQL Editor to verify the automation works.

DO $$
DECLARE
    v_prof_id UUID;
    v_payment_id_update UUID;
    v_payment_id_insert UUID;
BEGIN
    -- 1. Get a professional ID (any existing one)
    SELECT id INTO v_prof_id FROM professionals LIMIT 1;
    
    IF v_prof_id IS NULL THEN
        RAISE NOTICE 'No professionals found to test with.';
        RETURN;
    END IF;

    RAISE NOTICE '--- TEST CASE 1: UPDATE STATUS TO PAID ---';
    -- 2. Create a dummy PENDING payment
    INSERT INTO professional_payments (
        professional_id,
        period_start,
        period_end,
        total_amount,
        status,
        created_by
    )
    VALUES (
        v_prof_id,
        CURRENT_DATE,
        CURRENT_DATE,
        300.00, -- Test Amount Update
        'pending',
        auth.uid()
    )
    RETURNING id INTO v_payment_id_update;

    RAISE NOTICE 'Created Pending Payment ID: %', v_payment_id_update;

    -- 3. Update status to PAID
    UPDATE professional_payments
    SET status = 'paid', payment_date = CURRENT_DATE
    WHERE id = v_payment_id_update;

    RAISE NOTICE 'Updated Payment to PAID.';

    -- 4. Verify Ledger Entries for Update
    IF EXISTS (
        SELECT 1 FROM payment_ledger_entries 
        WHERE transaction_id = v_payment_id_update AND account_code = 'LIABILITY_PROFESSIONAL' AND entry_type = 'DEBIT'
    ) THEN
        RAISE NOTICE 'SUCCESS: Liability Debit Entry Found (Update Case).';
    ELSE
        RAISE NOTICE 'FAILURE: Liability Debit Entry NOT Found (Update Case).';
    END IF;


    RAISE NOTICE '--- TEST CASE 2: INSERT AS PAID ---';
    -- 5. Create a payment ALREADY PAID
    INSERT INTO professional_payments (
        professional_id,
        period_start,
        period_end,
        total_amount,
        status,
        created_by
    )
    VALUES (
        v_prof_id,
        CURRENT_DATE,
        CURRENT_DATE,
        700.00, -- Test Amount Insert
        'paid',
        auth.uid()
    )
    RETURNING id INTO v_payment_id_insert;
    
    RAISE NOTICE 'Created PAID Payment ID: %', v_payment_id_insert;

    -- 6. Verify Ledger Entries for Insert
    IF EXISTS (
        SELECT 1 FROM payment_ledger_entries 
        WHERE transaction_id = v_payment_id_insert AND account_code = 'LIABILITY_PROFESSIONAL' AND entry_type = 'DEBIT'
    ) THEN
        RAISE NOTICE 'SUCCESS: Liability Debit Entry Found (Insert Case).';
    ELSE
        RAISE NOTICE 'FAILURE: Liability Debit Entry NOT Found (Insert Case).';
    END IF;

    -- Cleanup (Optional)
    -- DELETE FROM professional_payments WHERE id IN (v_payment_id_update, v_payment_id_insert);
    -- DELETE FROM payment_ledger_entries WHERE transaction_id IN (v_payment_id_update, v_payment_id_insert);

END $$;
