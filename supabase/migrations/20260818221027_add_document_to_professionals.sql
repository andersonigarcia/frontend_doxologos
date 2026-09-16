-- =====================================================================
-- MIGRATION: Adicionar campos de documento na tabela professionals
-- =====================================================================

ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20);
