-- ==============================================================================
-- Backfill Ledger from Bookings
-- Populates the payment_ledger_entries table with historical data from bookings.
-- Only considers bookings with status = 'confirmed'.
-- Uses booking.id as transaction_id to avoid duplicates.
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Iterate over all confirmed bookings that have a valid price
    FOR r IN
        SELECT id, valor_consulta, created_at, status
        FROM bookings
        WHERE status = 'confirmed'
        AND valor_consulta IS NOT NULL
        AND valor_consulta > 0
    LOOP
        -- Check if we already have a ledger entry for this booking (using booking.id as transaction_id)
        IF NOT EXISTS (SELECT 1 FROM payment_ledger_entries WHERE transaction_id = r.id) THEN
            
            -- 1. DEBIT: Cash Entry (Asset Increase)
            INSERT INTO payment_ledger_entries (
                transaction_id, 
                entry_type, 
                account_code, 
                amount, 
                description, 
                metadata, 
                created_at
            )
            VALUES (
                r.id, 
                'DEBIT', 
                'CASH_BANK', 
                r.valor_consulta, 
                'Recebimento Agendamento (Backfill)', 
                jsonb_build_object('source', 'backfill', 'original_status', r.status), 
                r.created_at
            );

            -- 2. CREDIT: Revenue Entry (Income Increase)
            INSERT INTO payment_ledger_entries (
                transaction_id, 
                entry_type, 
                account_code, 
                amount, 
                description, 
                metadata, 
                created_at
            )
            VALUES (
                r.id, 
                'CREDIT', 
                'REVENUE_GROSS', 
                r.valor_consulta, 
                'Receita Bruta Agendamento (Backfill)', 
                jsonb_build_object('source', 'backfill', 'original_status', r.status), 
                r.created_at
            );
            
            RAISE NOTICE 'Backfilled ledger for booking %', r.id;
            
        END IF;
    END LOOP;
END $$;
