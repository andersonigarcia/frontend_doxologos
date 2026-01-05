-- ==============================================================================
-- Migração: Automação do Split do Ledger (Livro Razão)
-- Data: 2025-12-22
-- Objetivo: Automatizar a criação de entradas no Ledger quando um agendamento é confirmado.
-- Logica:
--  1. DEBIT CASH_BANK (Valor Total)
--  2. CREDIT LIABILITY_PROFESSIONAL (Valor Repasse)
--  3. CREDIT REVENUE_SERVICE (Valor Total - Repasse)
-- ==============================================================================

-- 1. Criação da Função Trigger
CREATE OR REPLACE FUNCTION handle_new_booking_ledger_entry()
RETURNS TRIGGER AS $$
DECLARE
    v_transaction_id UUID;
    v_professional_share DECIMAL(15, 2);
    v_platform_share DECIMAL(15, 2);
    v_description TEXT;
BEGIN
    -- Apenas processar se status mudou para 'confirmed' (pagamento aprovado)
    -- E se o anterior NÃO era confirmed (para evitar duplicidade em updates simples)
    IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
        
        -- Definir ID da transação (usamos o ID do agendamento para linkar)
        v_transaction_id := NEW.id;
        
        -- Calcular valores
        -- O repasse profissional está na coluna valor_repasse_profissional
        -- Se estiver nulo, assumimos 0
        v_professional_share := COALESCE(NEW.valor_repasse_profissional, 0);
        
        -- A parte da plataforma é o total (valor_consulta) menos o repasse
        v_platform_share := COALESCE(NEW.valor_consulta, 0) - v_professional_share;
        
        -- Descrição base
        v_description := 'Agendamento #' || NEW.id || ' - ' || TO_CHAR(NEW.booking_date, 'DD/MM/YYYY');

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
                    'professional_id', NEW.professional_id
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
                    'type', 'revenue_split'
                ),
                NOW()
            );
        END IF;

        RAISE NOTICE 'Ledger entries created for booking %', NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criação do Trigger
DROP TRIGGER IF EXISTS trg_booking_ledger_entry ON bookings;

CREATE TRIGGER trg_booking_ledger_entry
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_booking_ledger_entry();

-- 3. Comentários
COMMENT ON FUNCTION handle_new_booking_ledger_entry IS 'Automatiza lançamentos no Ledger (Split Implícito) ao confirmar agendamento';
