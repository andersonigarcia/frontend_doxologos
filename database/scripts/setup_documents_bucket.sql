-- Script para configurar o bucket 'documents' no Supabase
-- Necessário para upload de comprovantes de pagamento e outros documentos

-- 1. Criar o bucket 'documents' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Política para permitir upload de arquivos (apenas usuários autenticados)
CREATE POLICY "Allow authenticated users to upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- 3. Política para permitir leitura pública dos arquivos
CREATE POLICY "Allow public access to documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- 4. Política para permitir update (apenas usuários autenticados)
CREATE POLICY "Allow authenticated users to update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- 5. Política para permitir delete (apenas usuários autenticados)
CREATE POLICY "Allow authenticated users to delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');
