-- Script alternativo para criar e popular a tabela reviews
-- Execute no Supabase SQL Editor

-- Remover tabela se existir (cuidado - isso apagará dados existentes!)
-- DROP TABLE IF EXISTS reviews;

-- Criar tabela com estrutura correta
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id UUID REFERENCES public.professionals(id),
    patient_name TEXT NOT NULL,
    patient_email TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Habilitar RLS (Row Level Security) se necessário
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura de reviews aprovados
CREATE POLICY IF NOT EXISTS "Allow read approved reviews" ON public.reviews
    FOR SELECT USING (is_approved = true);

-- Política para permitir inserção (para admin)
CREATE POLICY IF NOT EXISTS "Allow insert reviews" ON public.reviews
    FOR INSERT WITH CHECK (true);

-- Inserir dados de exemplo
INSERT INTO public.reviews (patient_name, patient_email, rating, comment, is_approved, created_at) VALUES
('Ana Carolina Silva', 'ana.silva@email.com', 5, 'A equipe da Doxologos transformou minha vida! Depois de anos lutando contra a ansiedade, finalmente encontrei um tratamento que realmente funciona. A abordagem humanizada e o cuidado integral fizeram toda a diferença no meu processo de cura.', true, NOW() - INTERVAL '30 days'),
('Roberto Santos', 'roberto.santos@email.com', 5, 'Estou fazendo terapia há 6 meses e os resultados são incríveis. Minha autoestima melhorou muito e consegui superar a depressão que me acompanhava há anos. Recomendo de olhos fechados!', true, NOW() - INTERVAL '15 days'),
('Maria Fernanda Costa', 'maria.costa@email.com', 5, 'O atendimento da Doxologos é excepcional. Desde a primeira consulta me senti acolhida e compreendida. A terapia me ajudou a encontrar paz interior e a reconectar com minha fé. Gratidão eterna!', true, NOW() - INTERVAL '7 days'),
('João Paulo Oliveira', 'joao.oliveira@email.com', 4, 'Excelente trabalho! A psicóloga foi muito atenciosa e me ajudou a superar momentos difíceis da minha vida. O ambiente é acolhedor e transmite muita tranquilidade.', true, NOW() - INTERVAL '3 days'),
('Carla Rodrigues', 'carla.rodrigues@email.com', 5, 'Depois de passar por várias experiências frustrantes, finalmente encontrei na Doxologos o que precisava. A integração entre ciência e fé fez todo sentido para mim. Minha família toda nota a diferença!', true, NOW() - INTERVAL '1 day');

-- Verificar os dados inseridos
SELECT patient_name, rating, comment, is_approved, created_at 
FROM public.reviews 
WHERE is_approved = true 
ORDER BY created_at DESC;