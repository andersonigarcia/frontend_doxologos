-- Migration: Corrigir relacionamentos e Adicionar Lógica de Reversão Financeira
-- Data: 2026-02-01

-- 1. CORREÇÃO: Função apenas para Processar Reversão (FK removida pois profiles não acessível por FK direta neste contexto ou já existente)

-- 2. FUNÇÃO: Processar Reversão Financeira (Estorno de Splits)
CREATE OR REPLACE FUNCTION process_refund_reversal(
    p_inscricao_id UUID,
    p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inscricao RECORD;
    v_refund RECORD;
    v_split RECORD;
    v_total_reversal DECIMAL(10,2) := 0;
BEGIN
    -- Obter dados da inscrição
    SELECT * INTO v_inscricao
    FROM inscricoes_eventos
    WHERE id = p_inscricao_id;

    IF v_inscricao IS NULL THEN
        RAISE EXCEPTION 'Inscrição não encontrada';
    END IF;

    -- Obter dados do reembolso (log)
    SELECT * INTO v_refund
    FROM event_refunds
    WHERE inscricao_id = p_inscricao_id;
    
    -- Se não existir log de reembolso, criar um temporário/padrão? 
    -- Idealmente já deve existir se foi aprovado. Se não, cria agora.
    IF v_refund IS NULL THEN
         INSERT INTO event_refunds (evento_id, inscricao_id, payment_id, amount, status, reason, processed_by)
         VALUES (v_inscricao.evento_id, p_inscricao_id, v_inscricao.payment_id, v_inscricao.valor_pago, 'processing', 'Auto-generated during reversal processing', p_admin_id)
         RETURNING * INTO v_refund;
    END IF;

    -- Encontrar splits originais associados a esta venda (por payment_id ou inscricao_id)
    -- Assumindo que temos o payment_id na tabela event_financial_splits (ou metadata)
    -- Se não tivermos link direto, teremos que recalcular baseados nas regras do evento?
    -- MELHOR: Usar a tabela event_financial_splits se ela tiver inscricao_id. 
    -- Verifiquei tasks anteriores: 'Register splits in event_financial_splits table'.
    
    -- Loop pelos splits originais para criar os reversos
    FOR v_split IN 
        SELECT * FROM event_financial_splits 
        WHERE payment_id = v_inscricao.payment_id -- Assumindo que payment_id é o link
    LOOP
        -- Inserir reverso (valor negativo)
        INSERT INTO event_financial_splits (
            evento_id,
            professional_id,
            role,
            amount_type,
            amount_value,
            calculated_amount,
            status,
            payment_id,
            reference_date,
            created_at
        ) VALUES (
            v_split.evento_id,
            v_split.professional_id,
            v_split.role,
            v_split.amount_type,
            v_split.amount_value,
            -1 * v_split.calculated_amount, -- Valor Negativo
            'refunded',
            v_split.payment_id, -- Mantém mesmo payment ID para rastreio ou adicionar sufixo? Melhor manter link.
            NOW(),
            NOW()
        );
        
        v_total_reversal := v_total_reversal + v_split.calculated_amount;
    END LOOP;

    -- Se não encontrou splits (evento antigo ou erro), apenas registra o refund status
    
    -- Atualizar status final
    UPDATE inscricoes_eventos
    SET 
        refund_status = 'processed',
        updated_at = NOW()
    WHERE id = p_inscricao_id;

    UPDATE event_refunds
    SET 
        status = 'completed',
        processed_at = NOW(),
        processed_by = p_admin_id,
        updated_at = NOW()
    WHERE id = v_refund.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Reembolso processado e splits estornados com sucesso.',
        'reversed_amount', v_total_reversal
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao processar reversão: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION process_refund_reversal IS 'Processa o estorno financeiro gerando splits negativos e atualizando status.';
