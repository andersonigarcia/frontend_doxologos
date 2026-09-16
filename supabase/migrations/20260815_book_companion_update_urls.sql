-- ================================================================
-- UPDATE: Atualiza as URLs dos arquivos nos 3 slugs do Book Companion
-- Execute no SQL Editor do Supabase
-- ================================================================

-- Se os registros ainda NÃO foram inseridos, use o arquivo:
-- 20260815_book_companion_seed.sql (INSERT)
--
-- Se os registros JÁ foram inseridos, execute este UPDATE:

UPDATE book_resources SET
    free_file_url  = 'https://ppwjtvzrhvjinsutrjwk.supabase.co/storage/v1/object/public/book-files/mat01-qrcode.pdf',
    paid_file_url  = 'https://ppwjtvzrhvjinsutrjwk.supabase.co/storage/v1/object/public/book-files/mat01-qrcode.pdf',
    updated_at     = now()
WHERE slug = 'mat01-qrcode';

UPDATE book_resources SET
    free_file_url  = 'https://ppwjtvzrhvjinsutrjwk.supabase.co/storage/v1/object/public/book-files/mat02-qrcode.pdf',
    paid_file_url  = 'https://ppwjtvzrhvjinsutrjwk.supabase.co/storage/v1/object/public/book-files/mat02-qrcode.pdf',
    updated_at     = now()
WHERE slug = 'mat02-qrcode';

UPDATE book_resources SET
    free_file_url  = 'https://ppwjtvzrhvjinsutrjwk.supabase.co/storage/v1/object/public/book-files/mat031-qrcode.pdf',
    updated_at     = now()
WHERE slug = 'mat03-qrcode';

-- Verificação: confirma que as 3 linhas foram atualizadas
SELECT slug, chapter_number, title, free_file_url, has_paid_version, paid_file_url, is_active
FROM book_resources
WHERE slug IN ('mat01-qrcode', 'mat02-qrcode', 'mat03-qrcode')
ORDER BY chapter_number;
