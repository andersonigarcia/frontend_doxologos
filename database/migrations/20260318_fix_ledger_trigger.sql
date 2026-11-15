-- ==============================================================================
-- Migração: Correção da Automação do Ledger (Livro Razão)
-- Data: 2026-03-18
-- Objetivo: Disparar inserção para status 'paid', 'completed', 'confirmed' de forma idempotente.
-- E atuar tanto no INSERT quanto no UPDATE.
-- ==============================================================================

CREATE OR REPLACE FUNCTION handle_new_booking_ledger_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_transaction_id UUID;
    v_professional_share DECIMAL(15, 2);
    v_platform_share DECIMAL(15, 2);
    v_description TEXT;
BEGIN
    -- Verificar se é um status válido que demanda recebimento
    IF NEW.status IN ('confirmed', 'paid', 'completed') THEN
        
        -- Checagem de IDEMPOTÊNCIA: o ledger já tem esse valor?
        -- Procuramos pela conta CASH_BANK atrelada a esse agendamento
        IF EXISTS (
            SELECT 1 FROM payment_ledger_entries 
            WHERE metadata->>'booking_id' = NEW.id::text 
            AND account_code = 'CASH_BANK'
        ) THEN
            -- Já processado, ignorar silenciosamente
            RETURN NEW;
        END IF;

        -- Definir ID da transação (usamos o ID do agendamento para linkar)
        v_transaction_id := NEW.id;
        
        -- Calcular valores
        -- O repasse profissional está na coluna valor_repasse_profissional
        v_professional_share := COALESCE(NEW.valor_repasse_profissional, 0);
        
        -- A parte da plataforma é o total (valor_consulta) menos o repasse
        v_platform_share := COALESCE(NEW.valor_consulta, 0) - v_professional_share;
        
        -- Descrição base
        v_description := 'Agendamento #' || split_part(NEW.id::text, '-', 1) || ' - ' || TO_CHAR(NEW.booking_date, 'DD/MM/YYYY');

        -- 1. Lançamento de ENTRADA (Débito em Caixa/Banco)
        INSERT INTO payment_ledger_entries (
            transaction_id,
            entry_type,
            account_code,
            amount,
            description,
            metadata,
            created_at
        ) VALUES (
            v_transaction_id,
            'DEBIT',
            'CASH_BANK',
            NEW.valor_consulta,
            'Recebimento: ' || v_description,
            jsonb_build_object(
                'source', 'automation', 
                'type', 'income_full',
                'booking_id', NEW.id,
                'patient_name', NEW.patient_name
            ),
            NOW()
        );

        -- 2. Lançamento de OBRIGAÇÃO (Crédito em Passivo Profissional)
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
                v_transaction_id,
                'CREDIT',
                'LIABILITY_PROFESSIONAL',
                v_professional_share,
                'A Pagar Profissional: ' || v_description,
                jsonb_build_object(
                    'source', 'automation', 
                    'type', 'liability_split',
                    'professional_id', NEW.professional_id,
                    'booking_id', NEW.id
                ),
                NOW()
            );
        END IF;

        -- 3. Lançamento de RECEITA (Crédito em Receita de Serviço)
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
                v_transaction_id,
                'CREDIT',
                'REVENUE_SERVICE',
                v_platform_share,
                'Receita Plataforma: ' || v_description,
                jsonb_build_object(
                    'source', 'automation', 
                    'type', 'revenue_split',
                    'booking_id', NEW.id
                ),
                NOW()
            );
        END IF;

        RAISE NOTICE 'Ledger entries created for booking %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recriação do Trigger (agora para INSERT OR UPDATE)
DROP TRIGGER IF EXISTS trg_booking_ledger_entry ON bookings;

CREATE TRIGGER trg_booking_ledger_entry
    AFTER INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_booking_ledger_entry();

-- 3. Comentários
COMMENT ON FUNCTION handle_new_booking_ledger_entry IS 'Automatiza lançamentos no Ledger com idempotência ao confirmar/pagar agendamento (INSERT/UPDATE)';

-- ==============================================================================
-- O BACKFILL: Como a trigger agora é idempotente, podemos simplesmente
-- acionar um touch (UPDATE) artificial nas reservas que deviam constar no Ledger
-- ==============================================================================
UPDATE bookings 
SET updated_at = NOW() 
WHERE status IN ('confirmed', 'paid', 'completed')
  AND booking_date >= '2026-03-01'
  AND id NOT IN (
      SELECT COALESCE((metadata->>'booking_id')::uuid, '00000000-0000-0000-0000-000000000000'::uuid) 
      FROM payment_ledger_entries 
      WHERE metadata->>'booking_id' IS NOT NULL
  );
