-- ================================================================
-- POPULAR OU ATUALIZAR OS 3 MATERIAIS DO LIVRO (BOOK COMPANION)
-- Execute este script no SQL Editor do Supabase Dashboard
-- ================================================================

-- 1. Garantir que as políticas RLS permitam administradores via app_metadata E user_metadata
DROP POLICY IF EXISTS "book_resources_admin_all" ON book_resources;
CREATE POLICY "book_resources_admin_all"
    ON book_resources FOR ALL
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

DROP POLICY IF EXISTS "book_resources_public_read" ON book_resources;
CREATE POLICY "book_resources_public_read"
    ON book_resources FOR SELECT
    USING (is_active = TRUE);

-- 2. Inserir ou atualizar os 3 materiais (Upsert via slug)
INSERT INTO book_resources (
    slug,
    chapter_number,
    book_title,
    title,
    description,
    chapter_context,
    bridge_text,
    free_file_url,
    free_file_label,
    has_paid_version,
    paid_title,
    paid_description,
    paid_price_brl,
    paid_file_url,
    paid_license_type,
    paid_file_label,
    is_active
) VALUES

-- ── Material 01 ──────────────────────────────────────────────────
(
    'mat01-qrcode',
    1,
    'Livro Doxologos',
    'Roda do Autoconhecimento',
    'Ferramenta visual para mapear as 8 áreas do seu bem-estar emocional e espiritual, integrando fé e psicologia.',
    'No Capítulo 1, você conheceu as dimensões do ser humano integrado. Use este instrumento para visualizar onde você está em cada área da sua vida.',
    'Quer aprofundar este processo de autoconhecimento com o acompanhamento de um profissional da Doxologos?',
    'https://ppwjtvzrhvjinsutrjwk.supabase.co/storage/v1/object/public/book-files/mat01-qrcode.pdf',
    'Baixar Roda do Autoconhecimento',
    TRUE,
    'Roda do Autoconhecimento — Versão Clínica (Guia do Terapeuta)',
    'Versão vetorial para impressão em consultório com guia de condução e perguntas clínicas. Inclui licença para aplicação com pacientes.',
    27.90,
    'https://ppwjtvzrhvjinsutrjwk.supabase.co/storage/v1/object/public/book-files/mat01-qrcode.pdf',
    'clinical',
    'Adquirir Versão Clínica — R$ 27,90',
    TRUE
),

-- ── Material 02 ──────────────────────────────────────────────────
(
    'mat02-qrcode',
    2,
    'Livro Doxologos',
    'Diário de Reestruturação Cognitiva',
    'Exercício prático de identificação e reescrita de pensamentos automáticos disfuncionais com base na TCC.',
    'No Capítulo 2, você aprendeu sobre o impacto dos pensamentos automáticos no seu bem-estar. Este diário te ajuda a praticar a reestruturação cognitiva no dia a dia.',
    'Nossos psicólogos utilizam esta ferramenta em sessões de TCC. Quer experimentar com suporte profissional?',
    'https://ppwjtvzrhvjinsutrjwk.supabase.co/storage/v1/object/public/book-files/mat02-qrcode.pdf',
    'Baixar Diário de Reestruturação Cognitiva',
    TRUE,
    'Diário de Reestruturação Cognitiva — Kit Clínico Completo (30 sessões)',
    'Kit com 30 folhas de aplicação, guia do terapeuta e protocolo de 8 semanas de TCC. Licença para uso em consultório.',
    47.90,
    'https://ppwjtvzrhvjinsutrjwk.supabase.co/storage/v1/object/public/book-files/mat02-qrcode.pdf',
    'clinical',
    'Adquirir Kit Clínico — R$ 47,90',
    TRUE
),

-- ── Material 03 ──────────────────────────────────────────────────
(
    'mat03-qrcode',
    3,
    'Livro Doxologos',
    'Mapa de Vínculos e Relacionamentos',
    'Instrumento para mapear a qualidade dos seus relacionamentos significativos e identificar padrões relacionais.',
    'No Capítulo 3, você explorou como os vínculos relacionais moldam nossa saúde emocional. Use este mapa para visualizar seus relacionamentos mais importantes.',
    'Terapia de casal, familiar ou individual pode ajudar a transformar esses vínculos. Conheça nossos especialistas.',
    'https://ppwjtvzrhvjinsutrjwk.supabase.co/storage/v1/object/public/book-files/mat031-qrcode.pdf',
    'Baixar Mapa de Vínculos',
    FALSE,
    NULL,
    NULL,
    0,
    NULL,
    'personal',
    NULL,
    TRUE
)

ON CONFLICT (slug) DO UPDATE SET
    chapter_number    = EXCLUDED.chapter_number,
    book_title        = EXCLUDED.book_title,
    title             = EXCLUDED.title,
    description       = EXCLUDED.description,
    chapter_context   = EXCLUDED.chapter_context,
    bridge_text       = EXCLUDED.bridge_text,
    free_file_url     = EXCLUDED.free_file_url,
    free_file_label   = EXCLUDED.free_file_label,
    has_paid_version  = EXCLUDED.has_paid_version,
    paid_title        = EXCLUDED.paid_title,
    paid_description  = EXCLUDED.paid_description,
    paid_price_brl    = EXCLUDED.paid_price_brl,
    paid_file_url     = EXCLUDED.paid_file_url,
    paid_license_type = EXCLUDED.paid_license_type,
    paid_file_label   = EXCLUDED.paid_file_label,
    is_active         = EXCLUDED.is_active,
    updated_at        = now();

-- 3. Consulta de Verificação (retorna os 3 itens inseridos/atualizados)
SELECT id, slug, chapter_number, title, free_file_url, has_paid_version, paid_price_brl, is_active
FROM book_resources
ORDER BY chapter_number;
