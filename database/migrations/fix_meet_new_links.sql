-- =============================================================================
-- Migration: Corrigir links do Google Meet com valor 'https://meet.google.com/new'
-- Data: 2026-02-23
-- Descrição: Substitui links inválidos gerados antes da correção do bug na
--            função generateGoogleMeetLink(). Cada booking afetado recebe um
--            link único e próprio no formato https://meet.google.com/xxx-yyyy-zzz
-- =============================================================================

-- Verificar quantos registros serão afetados antes de executar:
SELECT COUNT(*) AS total_afetados
FROM bookings
WHERE meeting_link = 'https://meet.google.com/new';

-- Visualizar os registros afetados (opcional):
-- SELECT id, patient_name, booking_date, booking_time, status, meeting_link
-- FROM bookings
-- WHERE meeting_link = 'https://meet.google.com/new'
-- ORDER BY booking_date DESC;

-- =============================================================================
-- FUNÇÃO AUXILIAR: gera um código Meet único no formato xxx-yyyy-zzz
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_meet_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz';
  seg1  TEXT := '';
  seg2  TEXT := '';
  seg3  TEXT := '';
  i     INT;
BEGIN
  FOR i IN 1..3 LOOP
    seg1 := seg1 || substr(chars, floor(random() * 26 + 1)::int, 1);
  END LOOP;
  FOR i IN 1..4 LOOP
    seg2 := seg2 || substr(chars, floor(random() * 26 + 1)::int, 1);
  END LOOP;
  FOR i IN 1..3 LOOP
    seg3 := seg3 || substr(chars, floor(random() * 26 + 1)::int, 1);
  END LOOP;
  RETURN 'https://meet.google.com/' || seg1 || '-' || seg2 || '-' || seg3;
END;
$$;

-- =============================================================================
-- CORREÇÃO: Atualiza cada booking afetado com um link único gerado na hora
-- =============================================================================
UPDATE bookings
SET
  meeting_link      = generate_meet_code(),
  meeting_start_url = meeting_link,  -- mantém sincronizado com o novo link
  updated_at        = NOW()
WHERE meeting_link = 'https://meet.google.com/new';

-- Confirmar o resultado (deve retornar 0 após a execução):
SELECT COUNT(*) AS restantes_com_link_invalido
FROM bookings
WHERE meeting_link = 'https://meet.google.com/new';

-- Limpeza: remove a função auxiliar (não é mais necessária)
DROP FUNCTION IF EXISTS generate_meet_code();
