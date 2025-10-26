-- Diagnóstico da estrutura da tabela bookings
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;