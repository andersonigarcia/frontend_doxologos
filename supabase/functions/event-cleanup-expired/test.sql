-- ========================================
-- SCRIPT DE TESTE: Expiração de Inscrições
-- ========================================
-- Este script permite testar manualmente a lógica de expiração
-- criando uma inscrição "antiga" e verificando se a função a cancela.

-- 1. Criar uma inscrição de teste com data antiga (>24h)
INSERT INTO inscricoes_eventos (
    evento_id,
    user_id,
    patient_name,
    patient_email,
    status,
    payment_status,
    valor_pago,
    created_at
)
VALUES (
    (SELECT id FROM eventos LIMIT 1), -- Pega o primeiro evento disponível
    (SELECT id FROM auth.users LIMIT 1), -- Pega o primeiro usuário
    'Teste Expiração',
    'teste.expiracao@exemplo.com',
    'pending',
    'pending',
    100.00,
    NOW() - INTERVAL '25 hours' -- 25 horas atrás (deve expirar)
)
RETURNING id;

-- 2. Verificar que a inscrição foi criada
SELECT 
    id,
    patient_name,
    status,
    payment_status,
    created_at,
    AGE(NOW(), created_at) as idade
FROM inscricoes_eventos
WHERE patient_email = 'teste.expiracao@exemplo.com';

-- 3. Após executar a Edge Function `event-cleanup-expired`,
--    execute esta query para verificar se foi cancelada:
SELECT 
    id,
    patient_name,
    status,
    payment_status,
    created_at,
    updated_at
FROM inscricoes_eventos
WHERE patient_email = 'teste.expiracao@exemplo.com';
-- Esperado: status = 'cancelled', payment_status = 'expired'

-- 4. Limpeza: Remover inscrição de teste
DELETE FROM inscricoes_eventos
WHERE patient_email = 'teste.expiracao@exemplo.com';
