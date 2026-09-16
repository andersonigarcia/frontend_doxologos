-- ================================================================
-- Doxologos: Configuração do Bucket e Políticas de Storage para o Book Companion
-- Bucket: 'book-files' (público para leitura, restrito a admins/autenticados para escrita)
-- ================================================================

-- 1. Criar o bucket 'book-files' se ainda não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'book-files',
    'book-files',
    true,
    52428800, -- 50 MB
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/zip'];

-- 2. Permitir leitura pública dos arquivos do bucket 'book-files'
DROP POLICY IF EXISTS "book_files_public_read" ON storage.objects;
CREATE POLICY "book_files_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-files');

-- 3. Permitir upload para usuários autenticados (ou admins)
DROP POLICY IF EXISTS "book_files_authenticated_insert" ON storage.objects;
CREATE POLICY "book_files_authenticated_insert"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'book-files'
    AND auth.role() = 'authenticated'
);

-- 4. Permitir atualização para usuários autenticados
DROP POLICY IF EXISTS "book_files_authenticated_update" ON storage.objects;
CREATE POLICY "book_files_authenticated_update"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'book-files'
    AND auth.role() = 'authenticated'
);

-- 5. Permitir exclusão para usuários autenticados
DROP POLICY IF EXISTS "book_files_authenticated_delete" ON storage.objects;
CREATE POLICY "book_files_authenticated_delete"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'book-files'
    AND auth.role() = 'authenticated'
);
