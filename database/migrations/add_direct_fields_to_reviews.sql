-- Adicionando campos diretos para depoimentos de outros canais
-- Isso permite criar depoimentos sem necessidade de agendamento

-- Adicionar campos para nome e email diretos (para depoimentos sem agendamento)
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS patient_name TEXT,
ADD COLUMN IF NOT EXISTS patient_email TEXT;

-- Comentário para explicar o uso
COMMENT ON COLUMN reviews.patient_name IS 'Nome do cliente para depoimentos diretos (eventos, palestras, etc.)';
COMMENT ON COLUMN reviews.patient_email IS 'Email do cliente para depoimentos diretos (opcional)';

-- Atualizar a política de segurança para permitir inserção de depoimentos manuais
-- (isso pode ser ajustado conforme suas necessidades de segurança)

-- Permitir valores NULL nos campos relacionais para depoimentos sem agendamento
ALTER TABLE reviews 
ALTER COLUMN booking_id DROP NOT NULL,
ALTER COLUMN patient_id DROP NOT NULL,
ALTER COLUMN professional_id DROP NOT NULL;

-- Inserir alguns exemplos de depoimentos de outros canais
INSERT INTO reviews (
    booking_id,
    patient_id, 
    professional_id,
    patient_name,
    patient_email,
    rating,
    comment,
    is_approved,
    created_at
) VALUES 
(
    NULL,
    NULL,
    NULL,
    'Maria Silva',
    'maria.silva@email.com',
    5,
    'Participei da palestra sobre saúde mental e foi transformadora! A equipe tem um conhecimento incrível e consegue transmitir de forma muito clara. Recomendo para todos.',
    true,
    NOW()
),
(
    NULL,
    NULL,
    NULL,
    'João Santos',
    NULL,
    5,
    'Conheci a clínica através de um evento na comunidade. O atendimento é humanizado e os profissionais são muito competentes. Já indiquei para vários amigos!',
    true,
    NOW()
),
(
    NULL,
    NULL,
    NULL,
    'Ana Costa',
    'ana.costa@gmail.com',
    4,
    'Assisti a live no Instagram sobre cuidados preventivos. Conteúdo de qualidade e muito esclarecedor. Parabéns pela iniciativa de levar informação para todos!',
    true,
    NOW()
);

-- Verificar se os dados foram inseridos
SELECT 
    id,
    patient_name,
    patient_email,
    booking_id,
    patient_id,
    professional_id,
    rating,
    comment,
    is_approved,
    created_at
FROM reviews 
WHERE booking_id IS NULL  -- Depoimentos sem agendamento
ORDER BY created_at DESC;