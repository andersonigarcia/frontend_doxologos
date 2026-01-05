-- Migration: Automate Ledger Entries for Professional Payouts
-- Description: Creates a trigger to automatically Debit LIABILITY_PROFESSIONAL and Credit CASH_BANK when a payout is marked as paid.

-- 1. Create the function to handle the ledger entry
CREATE OR REPLACE FUNCTION handle_payout_ledger_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_professional_name TEXT;
    v_should_process BOOLEAN;
BEGIN
    -- Determine if we should process
    v_should_process := FALSE;
    
    IF (TG_OP = 'INSERT' AND NEW.status = 'paid') THEN
        v_should_process := TRUE;
    ELSIF (TG_OP = 'UPDATE' AND OLD.status != 'paid' AND NEW.status = 'paid') THEN
        v_should_process := TRUE;
    END IF;

    IF v_should_process THEN
        -- Get professional name for description
        SELECT name INTO v_professional_name
        FROM professionals
        WHERE id = NEW.professional_id;

        -- 1. DEBIT: LIABILITY_PROFESSIONAL (Decrease Liability)
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
            NEW.id, -- Using payment_id as transaction_id
            'DEBIT',
            'LIABILITY_PROFESSIONAL',
            NEW.total_amount,
            'Pagamento Realizado - ' || COALESCE(v_professional_name, 'Profissional'),
            jsonb_build_object(
                'source', 'payout_automation',
                'payment_id', NEW.id,
                'professional_id', NEW.professional_id,
                'period_start', NEW.period_start,
                'period_end', NEW.period_end
            ),
            NOW()
        );

        -- 2. CREDIT: CASH_BANK (Decrease Asset)
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
            NEW.id, -- Using payment_id as transaction_id
            'CREDIT',
            'CASH_BANK',
            NEW.total_amount,
            'Saída de Caixa - Pagamento Profissional',
            jsonb_build_object(
                'source', 'payout_automation',
                'payment_id', NEW.id,
                'professional_id', NEW.professional_id
            ),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS trg_payout_ledger_entry ON professional_payments;

CREATE TRIGGER trg_payout_ledger_entry
    AFTER INSERT OR UPDATE OF status ON professional_payments
    FOR EACH ROW
    EXECUTE FUNCTION handle_payout_ledger_entry();

-- 3. Note: No backfill is performed automatically here to avoid duplicating entries if manual ones exist.
