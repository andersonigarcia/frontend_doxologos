-- Verificação de dados históricos para Refatoração do Ledger
SELECT 
    id, 
    status, 
    valor_consulta, 
    valor_repasse_profissional,
    booking_date
FROM bookings 
WHERE status = 'confirmed' 
ORDER BY booking_date DESC
LIMIT 10;
