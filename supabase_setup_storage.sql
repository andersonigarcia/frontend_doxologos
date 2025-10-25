-- Script para configurar o Storage no Supabase para fotos de profissionais

-- 1. Criar o bucket 'professional-photos' (Execute no SQL Editor do Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-photos', 'professional-photos', true);

-- 2. Criar política para permitir upload de imagens (RLS)
CREATE POLICY "Allow authenticated users to upload professional photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'professional-photos' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'professionals'
);

-- 3. Criar política para permitir leitura pública das imagens
CREATE POLICY "Allow public access to professional photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'professional-photos');

-- 4. Criar política para permitir update/delete apenas para usuários autenticados
CREATE POLICY "Allow authenticated users to update professional photos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'professional-photos' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated users to delete professional photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'professional-photos' 
    AND auth.role() = 'authenticated'
);

-- 5. Alterar o campo image_url na tabela professionals para aceitar URLs mais longas
ALTER TABLE professionals 
ALTER COLUMN image_url TYPE TEXT;

-- Opcional: Comentário para documentar a mudança
COMMENT ON COLUMN professionals.image_url IS 'URL pública da foto do profissional armazenada no Supabase Storage ou link externo';

-- 6. Adicionar novos campos para controle de exibição de eventos
ALTER TABLE eventos 
ADD COLUMN IF NOT EXISTS data_inicio_exibicao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS data_fim_exibicao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Comentários para documentar os novos campos
COMMENT ON COLUMN eventos.data_inicio_exibicao IS 'Data e hora que o evento começará a aparecer na página principal';
COMMENT ON COLUMN eventos.data_fim_exibicao IS 'Data e hora que o evento deixará de aparecer na página principal';
COMMENT ON COLUMN eventos.ativo IS 'Status do evento (ativo/inativo) - permite ocultar eventos a qualquer momento';

-- 7. Criar tabela de inscrições em eventos se não existir
CREATE TABLE IF NOT EXISTS inscricoes_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID REFERENCES eventos(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT,
    status_pagamento TEXT DEFAULT 'pendente',
    valor_pago DECIMAL(10,2),
    data_inscricao TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_inscricoes_eventos_evento_id ON inscricoes_eventos(evento_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_eventos_user_id ON inscricoes_eventos(user_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_eventos_status ON inscricoes_eventos(status_pagamento);

-- Opcional: Atualizar eventos existentes com valores padrão para exibição
-- (Execute apenas se quiser que eventos antigos apareçam imediatamente)
UPDATE eventos 
SET 
    data_inicio_exibicao = COALESCE(data_inicio_exibicao, created_at),
    data_fim_exibicao = COALESCE(data_fim_exibicao, data_limite_inscricao),
    ativo = COALESCE(ativo, true)
WHERE data_inicio_exibicao IS NULL OR data_fim_exibicao IS NULL;