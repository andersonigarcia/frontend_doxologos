-- Script para garantir que user_id seja obrigatório na tabela bookings
-- Todo agendamento deve estar associado a um usuário (criado automaticamente se necessário)

-- 1. Verificar estrutura atual
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('user_id', 'patient_email', 'patient_name', 'patient_phone')
ORDER BY ordinal_position;

-- 2. Garantir que user_id NÃO seja NULL (se necessário)
-- Primeiro, atualizar registros existentes sem user_id (se houver)
-- Este UPDATE seria executado apenas se necessário

-- 3. Garantir que user_id seja obrigatório
ALTER TABLE bookings ALTER COLUMN user_id SET NOT NULL;

-- 4. Verificar/criar constraint foreign key correta
-- A constraint deve referenciar auth.users, não users_public
DO $$ 
BEGIN
    -- Remover constraint antiga se existir referência incorreta
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_name = 'bookings_user_id_fkey' 
        AND tc.table_name = 'bookings'
        AND kcu.table_name = 'bookings'
    ) THEN
        -- Verificar se a constraint atual está correta
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage
            WHERE constraint_name = 'bookings_user_id_fkey'
            AND table_name = 'users'
            AND table_schema = 'auth'
        ) THEN
            ALTER TABLE bookings DROP CONSTRAINT bookings_user_id_fkey;
            RAISE NOTICE 'Constraint bookings_user_id_fkey removida (referência incorreta)';
        END IF;
    END IF;
END $$;

-- 5. Criar constraint correta se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bookings_user_id_fkey' 
        AND table_name = 'bookings'
    ) THEN
        ALTER TABLE bookings 
        ADD CONSTRAINT bookings_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Constraint bookings_user_id_fkey criada corretamente';
    END IF;
END $$;

-- 6. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_patient_email ON bookings(patient_email);

-- 7. Comentários explicativos
COMMENT ON COLUMN bookings.user_id IS 'UUID do usuário (obrigatório). Usuário é criado automaticamente no agendamento se não existir.';
COMMENT ON COLUMN bookings.patient_email IS 'Email do paciente (obrigatório). Usado para criar usuário se necessário.';
COMMENT ON COLUMN bookings.patient_name IS 'Nome do paciente (obrigatório).';
COMMENT ON COLUMN bookings.patient_phone IS 'Telefone do paciente (obrigatório).';

-- 8. Verificar resultado final
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name = 'user_id';

-- Verificar constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name='bookings'
AND kcu.column_name = 'user_id';
