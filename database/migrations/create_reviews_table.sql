-- Script para trabalhar com a estrutura REAL da tabela reviews do Supabase
-- A tabela já existe com esta estrutura:
-- id, booking_id, patient_id, professional_id, rating, comment, is_approved, created_at

-- ATENÇÃO: Este script serve apenas como exemplo, pois a estrutura real requer
-- IDs válidos de bookings, patients e professionals existentes

-- Para inserir dados de exemplo, você precisa de IDs reais. Execute primeiro:
-- SELECT id FROM bookings LIMIT 5;
-- SELECT id FROM professionals LIMIT 5;

-- Exemplo de INSERT (substitua pelos IDs reais):
/*
INSERT INTO public.reviews (booking_id, patient_id, professional_id, rating, comment, is_approved) VALUES
('UUID-DO-BOOKING-1', 'UUID-DO-PACIENTE-1', 'UUID-DO-PROFISSIONAL-1', 5, 'Excelente atendimento! Me senti muito acolhida durante todo o processo.', true),
('UUID-DO-BOOKING-2', 'UUID-DO-PACIENTE-2', 'UUID-DO-PROFISSIONAL-2', 5, 'Recomendo de olhos fechados! A terapia mudou minha vida.', true),
('UUID-DO-BOOKING-3', 'UUID-DO-PACIENTE-3', 'UUID-DO-PROFISSIONAL-3', 4, 'Muito bom atendimento, ambiente acolhedor e profissional competente.', true);
*/

-- Verificar reviews existentes:
SELECT r.*, b.patient_name, b.patient_email, p.name as professional_name
FROM public.reviews r
LEFT JOIN public.bookings b ON r.booking_id = b.id
LEFT JOIN public.professionals p ON r.professional_id = p.id
ORDER BY r.created_at DESC;

-- Habilitar RLS se necessário:
-- ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Política para leitura de reviews aprovados:
-- CREATE POLICY IF NOT EXISTS "Allow read approved reviews" ON public.reviews
--     FOR SELECT USING (is_approved = true);