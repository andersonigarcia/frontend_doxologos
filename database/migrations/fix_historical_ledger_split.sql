-- ==============================================================================
-- Migração: Correção do Histórico do Ledger (Refatoração)
-- Data: 2025-12-22
-- Objetivo: Corrigir lançamentos passados que estavam como "Receita Bruta (Legado)"
--           aplicando a nova lógica de Split (Receita vs Passivo).
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
    v_professional_share DECIMAL(15, 2);
    v_platform_share DECIMAL(15, 2);
    v_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Iniciando refatoração do histórico do Ledger...';

    -- Iterar sobre todos os agendamentos confirmados que têm valor de repasse definido
    FOR r IN
        SELECT id, valor_consulta, valor_repasse_profissional, booking_date, patient_name, professional_id
        FROM bookings
        WHERE status = 'confirmed'
        AND valor_consulta > 0
        AND valor_repasse_profissional IS NOT NULL
    LOOP
        -- 1. Remover lançamentos antigos deste agendamento para evitar duplicidade ou sujeira
        DELETE FROM payment_ledger_entries WHERE transaction_id = r.id;

        -- Calcular os valores
        v_professional_share := r.valor_repasse_profissional;
        v_platform_share := r.valor_consulta - v_professional_share;

        -- 2. Recriar Lançamento 1: ENTRADA (Débito em Caixa/Banco)
        INSERT INTO payment_ledger_entries (
            transaction_id,
            entry_type,
            account_code,
            amount,
            description,
            metadata,
            created_at
        ) VALUES (
            r.id,
            'DEBIT',
            'CASH_BANK',
            r.valor_consulta,
            'Recebimento: Agendamento #' || r.id || ' - ' || TO_CHAR(r.booking_date, 'DD/MM/YYYY'),
            jsonb_build_object(
                'source', 'refactor_fix', 
                'type', 'income_full',
                'original_date', r.booking_date
            ),
            NOW() -- Ou r.created_at se preferir manter a data original do insert, mas NOW indica quando foi corrigido
        );

        -- 3. Recriar Lançamento 2: OBRIGAÇÃO (Crédito em Passivo Profissional)
        IF v_professional_share > 0 THEN
            INSERT INTO payment_ledger_entries (
                transaction_id,
                entry_type,
                account_code,
                amount,
                description,
                metadata,
                created_at
            ) VALUES (
                r.id,
                'CREDIT',
                'LIABILITY_PROFESSIONAL',
                v_professional_share,
                'A Pagar Profissional: Agendamento #' || r.id,
                jsonb_build_object(
                    'source', 'refactor_fix', 
                    'type', 'liability_split',
                    'professional_id', r.professional_id
                ),
                NOW()
            );
        END IF;

        -- 4. Recriar Lançamento 3: RECEITA (Crédito em Receita de Serviço)
        IF v_platform_share > 0 THEN
            INSERT INTO payment_ledger_entries (
                transaction_id,
                entry_type,
                account_code,
                amount,
                description,
                metadata,
                created_at
            ) VALUES (
                r.id,
                'CREDIT',
                'REVENUE_SERVICE',
                v_platform_share,
                'Receita Plataforma: Agendamento #' || r.id,
                jsonb_build_object(
                    'source', 'refactor_fix', 
                    'type', 'revenue_split'
                ),
                NOW()
            );
        END IF;

        v_count := v_count + 1;
    END LOOP;

    RAISE NOTICE 'Refatoração concluída! % registros processados/corrigidos.', v_count;
END $$;
