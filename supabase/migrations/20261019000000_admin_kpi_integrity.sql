-- =============================================================================
-- Migration: Admin KPI integrity (Fase 1 do plano de revisão do módulo admin)
-- Ver: docs/04-DEVELOPMENT/ADMIN_METRICS_DICTIONARY.md
--
-- Decisões do gestor:
--   * Regime: CAIXA (data do pagamento aprovado).
--   * Receita = pagamentos aprovados MENOS estornos (payments.refund_amount).
--   * Sem dado => NULL (a UI exibe "—"); nunca um número inventado.
--
-- Mudanças:
--   1. get_dashboard_summary_v3: deltas REAIS vs período anterior (antes: 0 fixo),
--      janela de consultas limitada a hoje (antes incluía datas futuras),
--      ticket médio com mesma data-base (pagamentos), exceção de eventos restrita.
--   2. get_dashboard_pulse_phase2: no-shows reais (antes contava 'cancelled'),
--      ocupação e fila de match = NULL (antes: 75.0 e 0 fixos/placeholder).
--
-- Rollback: reaplicar as definições de 20260913_dashboard_phase2.sql.
-- IMPORTANTE: validar em staging antes de produção (não foi executada em banco).
-- =============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_summary_v3(p_business_model text DEFAULT 'global', days_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin boolean;
    v_cur_from  date := CURRENT_DATE - days_limit;
    v_prev_from date := CURRENT_DATE - (days_limit * 2);

    v_consultas_cur   integer := 0;
    v_consultas_prev  integer := 0;
    v_pacientes_cur   integer := 0;
    v_pacientes_prev  integer := 0;
    v_total_cur       integer := 0;

    v_receita_cur     numeric := 0;
    v_receita_prev    numeric := 0;
    v_pagamentos_cur  integer := 0;

    v_receita_eventos numeric := 0;
    v_ticket_medio    numeric := 0;
    v_total_professionals integer := 0;
BEGIN
    SELECT (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- Consultas: janela atual [hoje - N, hoje] e anterior [hoje - 2N, hoje - N)
    SELECT
        count(*) FILTER (WHERE status IN ('confirmed', 'completed')
                           AND booking_date::date >= v_cur_from),
        count(*) FILTER (WHERE status IN ('confirmed', 'completed')
                           AND booking_date::date >= v_prev_from AND booking_date::date < v_cur_from),
        count(DISTINCT patient_email) FILTER (WHERE patient_email IS NOT NULL
                           AND status IN ('confirmed', 'completed')
                           AND booking_date::date >= v_cur_from),
        count(DISTINCT patient_email) FILTER (WHERE patient_email IS NOT NULL
                           AND status IN ('confirmed', 'completed')
                           AND booking_date::date >= v_prev_from AND booking_date::date < v_cur_from),
        count(*) FILTER (WHERE booking_date::date >= v_cur_from)
    INTO v_consultas_cur, v_consultas_prev, v_pacientes_cur, v_pacientes_prev, v_total_cur
    FROM bookings
    WHERE booking_date::date >= v_prev_from
      AND booking_date::date <= CURRENT_DATE
      AND (p_business_model = 'global' OR business_model = p_business_model);

    -- Receita (CAIXA): pagamentos aprovados menos estornos, por data de aprovação
    SELECT
        coalesce(sum(p.amount - coalesce(p.refund_amount, 0))
                 FILTER (WHERE x.d >= v_cur_from), 0),
        coalesce(sum(p.amount - coalesce(p.refund_amount, 0))
                 FILTER (WHERE x.d >= v_prev_from AND x.d < v_cur_from), 0),
        count(*) FILTER (WHERE x.d >= v_cur_from)
    INTO v_receita_cur, v_receita_prev, v_pagamentos_cur
    FROM payments p
    INNER JOIN bookings b ON b.id = p.booking_id
    CROSS JOIN LATERAL (SELECT coalesce(p.date_approved, p.created_at)::date AS d) x
    WHERE p.status IN ('approved', 'paid')
      AND x.d >= v_prev_from
      AND (p_business_model = 'global' OR b.business_model = p_business_model);

    -- Eventos: só tolera ausência de tabela/coluna (não engole outros erros)
    IF p_business_model = 'global' OR p_business_model = 'b2c' THEN
        BEGIN
            SELECT coalesce(sum(ie.amount), 0) INTO v_receita_eventos
            FROM inscricoes_eventos ie
            WHERE ie.payment_status = 'confirmed'
              AND ie.created_at::date >= v_cur_from;
        EXCEPTION WHEN undefined_column OR undefined_table THEN
            v_receita_eventos := 0;
        END;
    END IF;

    SELECT count(*) INTO v_total_professionals FROM professionals;

    -- Ticket médio: receita ÷ pagamentos da MESMA janela e data-base (caixa)
    IF v_pagamentos_cur > 0 THEN
        v_ticket_medio := round(v_receita_cur / v_pagamentos_cur, 2);
    END IF;

    RETURN json_build_object(
        'consultas_confirmadas', v_consultas_cur,
        'consultas_delta_pct', CASE WHEN v_consultas_prev > 0
            THEN round(((v_consultas_cur - v_consultas_prev)::numeric / v_consultas_prev) * 100, 1) ELSE NULL END,
        'pacientes_unicos', v_pacientes_cur,
        'pacientes_delta_pct', CASE WHEN v_pacientes_prev > 0
            THEN round(((v_pacientes_cur - v_pacientes_prev)::numeric / v_pacientes_prev) * 100, 1) ELSE NULL END,
        'receita_consultas', v_receita_cur,
        'receita_consultas_previous', v_receita_prev,
        'receita_consultas_delta_pct', CASE WHEN v_receita_prev > 0
            THEN round(((v_receita_cur - v_receita_prev) / v_receita_prev) * 100, 1) ELSE NULL END,
        'receita_eventos', v_receita_eventos,
        'ticket_medio', v_ticket_medio,
        'taxa_conversao', CASE WHEN v_total_cur > 0
            THEN round((v_consultas_cur::numeric / v_total_cur) * 100, 1) ELSE NULL END,
        'total_professionals', v_total_professionals
    );
END;
$$;


CREATE OR REPLACE FUNCTION get_dashboard_pulse_phase2(p_business_model text DEFAULT 'global', days_limit integer DEFAULT 1)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_admin boolean;
    v_noshows integer := 0;
    v_espera_horas numeric := 0;
BEGIN
    SELECT (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- No-shows reais: falta do paciente (antes contava 'cancelled', que inclui cancelamentos avisados)
    SELECT count(*) INTO v_noshows
    FROM bookings
    WHERE status IN ('no_show_unjustified', 'no_show')
      AND booking_date::date >= CURRENT_DATE - days_limit
      AND booking_date::date <= CURRENT_DATE
      AND (p_business_model = 'global' OR business_model = p_business_model);

    -- Tempo de espera (horas) até a sessão, últimos 30 dias
    SELECT coalesce(avg(extract(epoch from (b.booking_date + b.booking_time) - b.created_at) / 3600), 0)
    INTO v_espera_horas
    FROM bookings b
    WHERE b.status IN ('confirmed', 'completed')
      AND b.booking_date::date >= CURRENT_DATE - 30
      AND b.booking_date::date <= CURRENT_DATE
      AND (p_business_model = 'global' OR b.business_model = p_business_model);

    -- ocupacao e sem_match: ainda NÃO instrumentados => NULL (a UI mostra "—").
    -- Fase 3: ocupação = horas reservadas ÷ horas publicadas em availability.
    RETURN json_build_object(
        'noshows', v_noshows,
        'espera_horas', round(v_espera_horas, 1),
        'sem_match', NULL,
        'ocupacao', NULL
    );
END;
$$;
