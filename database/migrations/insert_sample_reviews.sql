-- Script para adicionar depoimentos de exemplo na tabela reviews
-- Execute este script no Supabase SQL Editor

-- Primeiro, vamos verificar se a tabela reviews existe e criar caso não exista
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES professionals(id),
    patient_name TEXT NOT NULL,
    patient_email TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alternativa caso os campos tenham nomes diferentes (descomente se necessário):
-- CREATE TABLE IF NOT EXISTS reviews (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     professional_id UUID REFERENCES professionals(id),
--     name TEXT NOT NULL,
--     email TEXT,
--     rating INTEGER CHECK (rating >= 1 AND rating <= 5),
--     comment TEXT,
--     approved BOOLEAN DEFAULT false,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Inserir dados de exemplo (use a versão que corresponder à sua estrutura)
INSERT INTO reviews (patient_name, patient_email, rating, comment, is_approved, created_at) VALUES
('Ana Carolina Silva', 'ana.silva@email.com', 5, 'A equipe da Doxologos transformou minha vida! Depois de anos lutando contra a ansiedade, finalmente encontrei um tratamento que realmente funciona. A abordagem humanizada e o cuidado integral fizeram toda a diferença no meu processo de cura.', true, NOW() - INTERVAL '30 days'),
('Roberto Santos', 'roberto.santos@email.com', 5, 'Estou fazendo terapia há 6 meses e os resultados são incríveis. Minha autoestima melhorou muito e consegui superar a depressão que me acompanhava há anos. Recomendo de olhos fechados!', true, NOW() - INTERVAL '15 days'),
('Maria Fernanda Costa', 'maria.costa@email.com', 5, 'O atendimento da Doxologos é excepcional. Desde a primeira consulta me senti acolhida e compreendida. A terapia me ajudou a encontrar paz interior e a reconectar com minha fé. Gratidão eterna!', true, NOW() - INTERVAL '7 days'),
('João Paulo Oliveira', 'joao.oliveira@email.com', 4, 'Excelente trabalho! A psicóloga foi muito atenciosa e me ajudou a superar momentos difíceis da minha vida. O ambiente é acolhedor e transmite muita tranquilidade.', true, NOW() - INTERVAL '3 days'),
('Carla Rodrigues', 'carla.rodrigues@email.com', 5, 'Depois de passar por várias experiências frustrantes, finalmente encontrei na Doxologos o que precisava. A integração entre ciência e fé fez todo sentido para mim. Minha família toda nota a diferença!', true, NOW() - INTERVAL '1 day');

-- Se o INSERT acima falhar, tente esta versão alternativa com nomes de campos diferentes:
-- INSERT INTO reviews (name, email, rating, comment, approved, created_at) VALUES
-- ('Ana Carolina Silva', 'ana.silva@email.com', 5, 'A equipe da Doxologos transformou minha vida! Depois de anos lutando contra a ansiedade, finalmente encontrei um tratamento que realmente funciona. A abordagem humanizada e o cuidado integral fizeram toda a diferença no meu processo de cura.', true, NOW() - INTERVAL '30 days'),
-- ('Roberto Santos', 'roberto.santos@email.com', 5, 'Estou fazendo terapia há 6 meses e os resultados são incríveis. Minha autoestima melhorou muito e consegui superar a depressão que me acompanhava há anos. Recomendo de olhos fechados!', true, NOW() - INTERVAL '15 days'),
-- ('Maria Fernanda Costa', 'maria.costa@email.com', 5, 'O atendimento da Doxologos é excepcional. Desde a primeira consulta me senti acolhida e compreendida. A terapia me ajudou a encontrar paz interior e a reconectar com minha fé. Gratidão eterna!', true, NOW() - INTERVAL '7 days'),
-- ('João Paulo Oliveira', 'joao.oliveira@email.com', 4, 'Excelente trabalho! A psicóloga foi muito atenciosa e me ajudou a superar momentos difíceis da minha vida. O ambiente é acolhedor e transmite muita tranquilidade.', true, NOW() - INTERVAL '3 days'),
-- ('Carla Rodrigues', 'carla.rodrigues@email.com', 5, 'Depois de passar por várias experiências frustrantes, finalmente encontrei na Doxologos o que precisava. A integração entre ciência e fé fez todo sentido para mim. Minha família toda nota a diferença!', true, NOW() - INTERVAL '1 day');

-- Para verificar a estrutura atual da tabela, execute:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'reviews' 
-- ORDER BY ordinal_position;