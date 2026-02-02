-- Migration: Create cancel_event_registration RPC
-- Description: Creates a secure function to handle event cancellation logic
-- Author: System
-- Date: 2026-02-01

CREATE OR REPLACE FUNCTION cancel_event_registration(
    p_inscricao_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to update policies if needed, but mainly to encapsulate logic
AS $$
DECLARE
    v_inscricao RECORD;
    v_evento RECORD;
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();
    
    -- Fetch registration details
    SELECT * INTO v_inscricao
    FROM inscricoes_eventos
    WHERE id = p_inscricao_id;
    
    -- Validate existence
    IF v_inscricao IS NULL THEN
        RAISE EXCEPTION 'Inscrição não encontrada';
    END IF;
    
    -- Validate ownership (security check)
    IF v_inscricao.user_id != v_user_id THEN
        RAISE EXCEPTION 'Permissão negada';
    END IF;
    
    -- Validate status
    IF v_inscricao.status = 'cancelled' THEN
        RAISE EXCEPTION 'Inscrição já está cancelada';
    END IF;
    
    -- Fetch event details
    SELECT * INTO v_evento
    FROM eventos
    WHERE id = v_inscricao.evento_id;
    
    -- Determine Logic based on Payment
    -- Case 1: Paid Event with Confirmed Payment
    IF v_evento.valor > 0 AND v_inscricao.payment_status IN ('paid', 'approved', 'confirmed') THEN
        -- Mark as cancelled and request refund
        UPDATE inscricoes_eventos
        SET 
            status = 'cancelled',
            cancellation_reason = p_reason,
            cancelled_at = NOW(),
            refund_status = 'requested',
            updated_at = NOW()
        WHERE id = p_inscricao_id;
        
        v_result := jsonb_build_object(
            'status', 'cancelled',
            'refund_status', 'requested',
            'message', 'Inscrição cancelada. Reembolso solicitado.'
        );
        
    -- Case 2: Free Event or Paid but Pending (No Refund needed)
    ELSE
        -- Just cancel
        UPDATE inscricoes_eventos
        SET 
            status = 'cancelled',
            cancellation_reason = p_reason,
            cancelled_at = NOW(),
            refund_status = 'none', -- Explicitly none as no refund needed
            updated_at = NOW()
        WHERE id = p_inscricao_id;
        
        v_result := jsonb_build_object(
            'status', 'cancelled',
            'refund_status', 'none',
            'message', 'Inscrição cancelada com sucesso.'
        );
    END IF;
    
    -- Return result
    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao cancelar inscrição: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION cancel_event_registration IS 'Cancela uma inscrição de evento e solicita reembolso se aplicável. Seguro para chamar do client.';
