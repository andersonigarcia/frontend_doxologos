-- Script SQL para adicionar funcionalidade de mês/ano à tabela availability
-- Execute este script no painel SQL do Supabase

-- 1. Adicionar colunas month e year à tabela availability
ALTER TABLE availability 
ADD COLUMN month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
ADD COLUMN year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- 2. Remover a constraint UNIQUE antiga que só considerava professional_id e day_of_week
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_professional_id_day_of_week_key;

-- 3. Criar nova constraint UNIQUE que inclui month e year
-- Isso permite que um profissional tenha horários diferentes para o mesmo dia da semana em meses diferentes
ALTER TABLE availability 
ADD CONSTRAINT availability_professional_id_day_month_year_key 
UNIQUE(professional_id, day_of_week, month, year);

-- 4. Atualizar registros existentes para ter month e year atuais
UPDATE availability 
SET month = EXTRACT(MONTH FROM CURRENT_DATE), 
    year = EXTRACT(YEAR FROM CURRENT_DATE) 
WHERE month IS NULL OR year IS NULL;

-- 5. Verificar se as alterações foram aplicadas corretamente
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'availability' 
AND column_name IN ('month', 'year');

-- 6. Mostrar alguns dados de exemplo
SELECT * FROM availability LIMIT 5;