-- Diagnostic Script: Analyze Ledger Composition
-- This script helps understand the current balances by showing the sum of Debits and Credits for each account.

WITH AccountSummaries AS (
    SELECT 
        account_code,
        entry_type,
        COUNT(*) as entry_count,
        SUM(amount) as total_amount
    FROM payment_ledger_entries
    GROUP BY account_code, entry_type
)
SELECT 
    account_code,
    SUM(CASE WHEN entry_type = 'DEBIT' THEN total_amount ELSE 0 END) as total_debits,
    SUM(CASE WHEN entry_type = 'CREDIT' THEN total_amount ELSE 0 END) as total_credits,
    SUM(CASE 
        -- For Asset (Cash): Debit - Credit
        WHEN account_code = 'CASH_BANK' THEN 
             (CASE WHEN entry_type = 'DEBIT' THEN total_amount ELSE 0 END) - 
             (CASE WHEN entry_type = 'CREDIT' THEN total_amount ELSE 0 END)
        -- For Liability/Equity: Credit - Debit
        ELSE 
             (CASE WHEN entry_type = 'CREDIT' THEN total_amount ELSE 0 END) - 
             (CASE WHEN entry_type = 'DEBIT' THEN total_amount ELSE 0 END)
    END) as net_balance
FROM AccountSummaries
GROUP BY account_code;

-- Also list the last 10 entries to see if test data is present
SELECT * FROM payment_ledger_entries ORDER BY created_at DESC LIMIT 10;
