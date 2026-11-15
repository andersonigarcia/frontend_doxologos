-- =============================================================================
-- Migration: Corrigir meeting_start_url ainda com valor '/new'
-- Data: 2026-02-23 (patch da migration anterior)
-- 
-- PROBLEMA: O UPDATE anterior usou `meeting_start_url = meeting_link` no mesmo
-- SET, mas no PostgreSQL os valores são lidos ANTES da atualização.
-- Então meeting_start_url foi setado de volta para 'https://meet.google.com/new'.
--
-- SOLUÇÃO: Para Google Meet, meeting_start_url deve ser IGUAL ao meeting_link
-- (não existe "link de anfitrião" separado no Meet — é o mesmo link para todos).
-- =============================================================================

-- 1. Verificar quantos registros ainda estão com /new no start_url:
SELECT COUNT(*) AS total_com_start_url_invalido
FROM bookings
WHERE meeting_start_url = 'https://meet.google.com/new';

-- 2. Corrigir: para bookings do Google Meet, meeting_start_url = meeting_link
--    (a coluna meeting_link já foi corrigida pela migration anterior)
UPDATE bookings
SET
  meeting_start_url = meeting_link,
  updated_at = NOW()
WHERE
  meeting_start_url = 'https://meet.google.com/new'
  AND meeting_link IS NOT NULL
  AND meeting_link != 'https://meet.google.com/new';

-- 3. Verificar resultado (deve retornar 0):
SELECT COUNT(*) AS restantes_invalidos
FROM bookings
WHERE meeting_start_url = 'https://meet.google.com/new';

-- 4. Sanity check: confirmar que meeting_start_url == meeting_link para Google Meet
SELECT id, meeting_link, meeting_start_url,
       (meeting_start_url = meeting_link) AS estao_iguais
FROM bookings
WHERE meeting_link LIKE 'https://meet.google.com/%'
  AND meeting_link != 'https://meet.google.com/new'
ORDER BY created_at DESC
LIMIT 10;
