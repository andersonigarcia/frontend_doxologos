-- ========================================
-- SCRIPT DE TESTE: Event Reminders
-- ========================================
-- Este script permite testar manualmente a lógica de lembretes
-- criando inscrições com datas estratégicas.

-- 1. Criar evento de teste (24h no futuro)
INSERT INTO eventos (
    titulo,
    descricao,
    tipo_evento,
    formato,
    data_inicio,
    data_fim,
    limite_participantes,
    data_limite_inscricao,
    link_slug,
    status,
    valor,
    vagas_disponiveis,
    ativo
)
VALUES (
    'Workshop de Teste - Lembretes',
    'Evento criado para testar sistema de lembretes automáticos',
    'Workshop',
    'Online',
    NOW() + INTERVAL '24 hours 5 minutes', -- 24h e 5 min no futuro (dentro da janela de 15min)
    NOW() + INTERVAL '26 hours',
    50,
    NOW() + INTERVAL '23 hours', -- Limite de inscrição antes do evento
    'workshop-teste-lembretes-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'aberto',
    0, -- Gratuito para facilitar teste
    50,
    true
)
RETURNING id, titulo, data_inicio;

-- 2. Criar inscrição confirmada (copie o ID do evento acima)
INSERT INTO inscricoes_eventos (
    evento_id,
    user_id,
    patient_name,
    patient_email,
    status,
    payment_status,
    valor_pago
)
VALUES (
    'COLE_O_ID_DO_EVENTO_AQUI', -- Substitua pelo ID retornado acima
    (SELECT id FROM auth.users LIMIT 1), -- Primeiro usuário do sistema
    'Teste Lembrete',
    'seu_email_de_teste@exemplo.com', -- SUBSTITUA pelo seu email real
    'confirmed',
    NULL,
    0
)
RETURNING id, patient_email, status;

-- 3. Verificar que a inscrição foi criada sem lembretes enviados
SELECT 
    ie.id,
    ie.patient_name,
    ie.patient_email,
    ie.status,
    ie.reminder_24h_sent_at,
    ie.reminder_1h_sent_at,
    e.titulo,
    e.data_inicio,
    e.formato,
    AGE(e.data_inicio, NOW()) as tempo_ate_evento
FROM inscricoes_eventos ie
JOIN eventos e ON e.id = ie.evento_id
WHERE ie.patient_email = 'seu_email_de_teste@exemplo.com'
ORDER BY ie.created_at DESC;

-- 4. Executar a Edge Function manualmente:
-- curl -X POST https://SEU_PROJECT.supabase.co/functions/v1/event-send-reminders \
--   -H "Authorization: Bearer SEU_SERVICE_ROLE_KEY"

-- 5. Após executar a função, verificar se o timestamp foi atualizado:
SELECT 
    ie.id,
    ie.patient_name,
    ie.patient_email,
    ie.reminder_24h_sent_at,
    ie.reminder_1h_sent_at,
    e.titulo,
    e.data_inicio,
    AGE(e.data_inicio, NOW()) as tempo_ate_evento
FROM inscricoes_eventos ie
JOIN eventos e ON e.id = ie.evento_id
WHERE ie.patient_email = 'seu_email_de_teste@exemplo.com'
ORDER BY ie.created_at DESC;
-- Esperado: reminder_24h_sent_at deve ter um timestamp

-- 6. Para testar lembrete de 1h, criar outro evento:
INSERT INTO eventos (
    titulo,
    descricao,
    tipo_evento,
    formato,
    data_inicio,
    data_fim,
    limite_participantes,
    data_limite_inscricao,
    link_slug,
    status,
    valor,
    vagas_disponiveis,
    ativo
)
VALUES (
    'Workshop de Teste - Lembrete 1h',
    'Evento para testar lembrete de 1 hora',
    'Workshop',
    'Online',
    NOW() + INTERVAL '1 hour 5 minutes', -- 1h e 5 min no futuro
    NOW() + INTERVAL '3 hours',
    50,
    NOW() + INTERVAL '30 minutes',
    'workshop-teste-1h-' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'aberto',
    0,
    50,
    true
)
RETURNING id, titulo, data_inicio;

-- 7. Criar inscrição para teste de 1h
INSERT INTO inscricoes_eventos (
    evento_id,
    user_id,
    patient_name,
    patient_email,
    status,
    payment_status,
    valor_pago,
    reminder_24h_sent_at -- Marcar como já enviado para não enviar 24h
)
VALUES (
    'COLE_O_ID_DO_EVENTO_1H_AQUI',
    (SELECT id FROM auth.users LIMIT 1),
    'Teste Lembrete 1h',
    'seu_email_de_teste@exemplo.com',
    'confirmed',
    NULL,
    0,
    NOW() - INTERVAL '23 hours' -- Simula que o lembrete de 24h já foi enviado
)
RETURNING id, patient_email, status;

-- 8. Verificar eventos criados
SELECT 
    e.id,
    e.titulo,
    e.tipo_evento,
    e.formato,
    e.data_inicio,
    e.status,
    e.valor,
    e.vagas_disponiveis,
    COUNT(ie.id) as total_inscricoes
FROM eventos e
LEFT JOIN inscricoes_eventos ie ON ie.evento_id = e.id
WHERE e.titulo LIKE 'Workshop de Teste%'
GROUP BY e.id
ORDER BY e.created_at DESC;

-- 9. Limpeza: Remover dados de teste
DELETE FROM inscricoes_eventos
WHERE patient_email = 'seu_email_de_teste@exemplo.com';

DELETE FROM eventos
WHERE titulo LIKE 'Workshop de Teste%';

-- Verificar limpeza
SELECT COUNT(*) as eventos_teste_restantes
FROM eventos
WHERE titulo LIKE 'Workshop de Teste%';
