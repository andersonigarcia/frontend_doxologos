-- Comprehensive Audit: Check for Data Integrity Issues
-- We are looking for NULLs or logically invalid data that could cause 'NaN' on the frontend.

-- 1. Check BOOKINGS for NULLs in financial fields
SELECT 
    'Booking with NULL value' as issue_type,
    id, 
    booking_date, 
    valor_consulta, 
    valor_repasse_profissional,
    status
FROM bookings
WHERE 
    status IN ('confirmed', 'paid', 'completed')
    AND (valor_consulta IS NULL OR valor_repasse_profissional IS NULL);

-- 2. Check PLATFORM_COSTS for NULL amount
SELECT 
    'Cost with NULL amount' as issue_type,
    id, 
    cost_date, 
    amount, 
    category
FROM platform_costs
WHERE amount IS NULL;

-- 3. Check Schema Types (to confirm everything is numeric)
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE 
    (table_name = 'bookings' AND column_name IN ('valor_consulta', 'valor_repasse_profissional'))
    OR 
    (table_name = 'platform_costs' AND column_name = 'amount');
