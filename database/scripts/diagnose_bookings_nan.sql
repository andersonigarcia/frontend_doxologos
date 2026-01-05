-- Diagnostic Script: Check Booking Values (Corrected for Numeric Types)
-- The previous error confirmed that 'valor_consulta' is NUMERIC, not TEXT.
-- This means "bad text" like '$100' is impossible. The issue is likely NULLs.

SELECT 
    id, 
    booking_date, 
    valor_consulta, 
    valor_repasse_profissional,
    status
FROM bookings
WHERE 
    status IN ('confirmed', 'paid', 'completed')
    AND (
        valor_consulta IS NULL 
        OR 
        valor_repasse_profissional IS NULL
    )
ORDER BY booking_date DESC;

-- Also check schema again just to be 100% sure of types
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND column_name IN ('valor_consulta', 'valor_repasse_profissional');
