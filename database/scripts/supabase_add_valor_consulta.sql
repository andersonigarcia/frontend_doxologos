-- Migration: Adicionar campo valor_consulta na tabela bookings
-- Objetivo: Armazenar o valor histórico da consulta no momento do agendamento
-- Isso permite manter o histórico financeiro correto mesmo quando os preços dos serviços mudarem

-- Adicionar coluna valor_consulta na tabela bookings
ALTER TABLE bookings 
ADD COLUMN valor_consulta DECIMAL(10,2);

-- Comentário da coluna para documentação
COMMENT ON COLUMN bookings.valor_consulta IS 'Valor histórico da consulta no momento do agendamento (preserva histórico financeiro)';

-- Atualizar registros existentes com o valor atual do serviço
-- (para migração de dados já existentes)
UPDATE bookings 
SET valor_consulta = services.valor 
FROM services 
WHERE bookings.service_id = services.id 
AND bookings.valor_consulta IS NULL;

-- Opcional: Adicionar constraint para garantir que valor_consulta não seja negativo
ALTER TABLE bookings 
ADD CONSTRAINT bookings_valor_consulta_positive 
CHECK (valor_consulta >= 0);

-- Verificar a migração
SELECT 
    id, 
    service_id, 
    valor_consulta,
    created_at 
FROM bookings 
ORDER BY created_at DESC 
LIMIT 10;