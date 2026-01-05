-- View: Inscrições completas com dados do evento
-- Data: 2025-10-29
-- Descrição: Facilita consultas de inscrições com informações completas do evento

CREATE OR REPLACE VIEW vw_inscricoes_completas AS
SELECT 
    ie.id,
    ie.evento_id,
    e.titulo AS evento_titulo,
    e.descricao AS evento_descricao,
    e.data_inicio AS data_evento,
    e.data_fim,
    e.valor AS evento_valor,
    e.vagas_disponiveis,
    e.meeting_link,
    e.meeting_password,
    e.meeting_id,
    ie.user_id,
    ie.patient_name AS nome,
    ie.patient_email AS email,
    ie.status,
    ie.payment_status,
    ie.valor_pago,
    ie.payment_id,
    ie.payment_date,
    ie.zoom_link_sent,
    ie.zoom_link_sent_at,
    -- Status descritivo
    CASE 
        WHEN e.valor = 0 THEN 'Gratuito - Confirmado'
        WHEN ie.payment_status = 'approved' THEN 'Pago - Confirmado'
        WHEN ie.payment_status = 'pending' THEN 'Aguardando Pagamento'
        WHEN ie.status = 'confirmed' THEN 'Confirmado'
        WHEN ie.status = 'cancelled' THEN 'Cancelado'
        ELSE 'Pendente'
    END AS status_descricao,
    -- Vagas ocupadas (subquery)
    (
        SELECT COUNT(*) 
        FROM inscricoes_eventos ie2 
        WHERE ie2.evento_id = e.id 
        AND ie2.status = 'confirmed'
    ) AS vagas_ocupadas,
    -- Se ainda há vagas
    CASE 
        WHEN e.vagas_disponiveis = 0 THEN true -- Ilimitado
        WHEN (
            SELECT COUNT(*) 
            FROM inscricoes_eventos ie2 
            WHERE ie2.evento_id = e.id 
            AND ie2.status = 'confirmed'
        ) < e.vagas_disponiveis THEN true
        ELSE false
    END AS tem_vagas
FROM inscricoes_eventos ie
JOIN eventos e ON ie.evento_id = e.id
ORDER BY e.data_inicio DESC;

-- Comentário na view
COMMENT ON VIEW vw_inscricoes_completas IS 'View com dados completos de inscrições incluindo informações do evento, status e vagas';
