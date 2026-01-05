-- ==============================================================================
-- Script de Teste: Validação da Automação do Ledger (CORRIGIDO)
-- ==============================================================================
-- Este script simula o fluxo de confirmação de um agendamento para testar
-- se o Trigger de Split do Ledger está funcionando corretamente.
-- ==============================================================================

DO $$
DECLARE
    v_prof_id UUID;
    v_service_id UUID;
    v_user_id UUID; -- Added user_id variable
    v_booking_id UUID;
BEGIN
    -- 1. Buscar dados existentes para popular as chaves estrangeiras
    -- Tenta pegar o primeiro profissional e serviço encontrados
    SELECT id INTO v_prof_id FROM professionals LIMIT 1;
    SELECT id INTO v_service_id FROM services LIMIT 1;
    
    -- Busca um usuário válido para ser o "paciente" (Owner do booking)
    -- Necessário pois a tabela bookings tem user_id NOT NULL
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    IF v_prof_id IS NULL OR v_service_id IS NULL OR v_user_id IS NULL THEN
        RAISE EXCEPTION 'Necessário ter Profissional, Serviço e Usuário cadastrados para testar. (Verifique se há usuários na tabela auth.users)';
    END IF;

    -- 2. Criar um Agendamento de Teste (Pendente)
    INSERT INTO bookings (
        professional_id,
        service_id,
        user_id, -- Added user_id
        patient_name,
        patient_email,
        patient_phone,
        booking_date,
        booking_time,
        status,
        valor_consulta,
        valor_repasse_profissional
    ) VALUES (
        v_prof_id,
        v_service_id,
        v_user_id, -- Using fetched user_id
        'TESTE AUTOMACAO LEDGER',
        'teste@ledger.com',
        '11999999999',
        CURRENT_DATE + 1,
        '10:00',
        'pending',
        100.00, -- Valor Total (R$ 100)
        70.00   -- Repasse (R$ 70) => Plataforma fica com R$ 30
    ) RETURNING id INTO v_booking_id;

    RAISE NOTICE 'Agendamento de Teste Criado: %', v_booking_id;

    -- 3. Confirmar o Agendamento (Isso deve disparar o Trigger)
    UPDATE bookings 
    SET status = 'confirmed' 
    WHERE id = v_booking_id;

    RAISE NOTICE 'Agendamento Confirmado. Verificando Ledger...';
END $$;

-- 4. Verificar os resultados
SELECT 
    created_at,
    account_code, 
    entry_type, 
    amount, 
    description 
FROM payment_ledger_entries 
WHERE description LIKE '%TESTE AUTOMACAO LEDGER%' 
ORDER BY created_at DESC;
