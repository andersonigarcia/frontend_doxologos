-- ================================================
-- VERIFICAR ESTRUTURA DA TABELA BOOKINGS
-- ================================================
-- Execute esta query primeiro para ver as colunas reais

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
ORDER BY ordinal_position;
