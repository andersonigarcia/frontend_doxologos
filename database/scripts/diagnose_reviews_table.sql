-- Script de diagnóstico para verificar a estrutura da tabela reviews
-- Execute no Supabase SQL Editor

-- 1. Verificar se a tabela existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'reviews'
) AS table_exists;

-- 2. Ver todas as tabelas que contêm "review" no nome
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%review%';

-- 3. Se a tabela existir, mostrar sua estrutura
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'reviews'
ORDER BY ordinal_position;

-- 4. Contar quantos registros existem (se a tabela existir)
-- SELECT COUNT(*) as total_reviews FROM public.reviews;

-- 5. Ver alguns registros de exemplo (se existirem)
-- SELECT * FROM public.reviews LIMIT 5;