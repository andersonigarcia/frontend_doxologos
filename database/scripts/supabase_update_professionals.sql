-- Script para atualizar a estrutura da tabela professionals
-- Execute este script no painel do Supabase

-- 1. Adicionar coluna services_ids para armazenar array de IDs dos serviços
ALTER TABLE professionals 
ADD COLUMN services_ids UUID[] DEFAULT '{}';

-- 2. Comentário: A coluna specialty será mantida por compatibilidade mas não será mais usada na interface
-- Se desejar remover completamente a coluna specialty (opcional):
-- ALTER TABLE professionals DROP COLUMN specialty;

-- 3. Atualizar registros existentes (opcional - mapear especialidades para serviços)
-- Você pode executar updates manuais para mapear especialidades existentes para serviços
-- Exemplo:
-- UPDATE professionals SET services_ids = ARRAY['uuid-do-servico-1', 'uuid-do-servico-2'] WHERE specialty = 'Psicologia';

-- 4. Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_professionals_services ON professionals USING GIN (services_ids);