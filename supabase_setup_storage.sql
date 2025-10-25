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