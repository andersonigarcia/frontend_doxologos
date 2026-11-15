-- =============================================
-- Migration: Management Dashboard Phase 2
-- Goal: B2B/B2C Tracking, Pulse Metrics (Wait time, No shows)
-- =============================================

-- 1. Schema Updates
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS business_model VARCHAR(20) DEFAULT 'b2c';

-- 2. New RPC for Pulse Metrics (Wait time, No-shows)
CREATE OR REPLACE FUNCTION get_dashboard_pulse_phase2(p_business_model text DEFAULT 'global', days_limit integer DEFAULT 1)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    v_noshows integer := 0;
    v_espera_horas numeric := 0;
    v_sem_match integer := 0;
    v_ocupacao numeric := 0;
BEGIN
    SELECT (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- No-shows hoje ou do período
    SELECT count(*) INTO v_noshows
    FROM bookings
    WHERE status = 'cancelled'
      AND booking_date::date >= CURRENT_DATE - days_limit
      AND (p_business_model = 'global' OR business_model = p_business_model);

    -- Tempo de espera (horas) da primeira sessão (considera todos do período)
    SELECT coalesce(avg(extract(epoch from (b.booking_date + b.booking_time) - b.created_at) / 3600), 0)
    INTO v_espera_horas
    FROM bookings b
    WHERE b.status IN ('confirmed', 'completed')
      AND b.booking_date::date >= CURRENT_DATE - 30
      AND (p_business_model = 'global' OR b.business_model = p_business_model);

    -- Mock/Placeholder para pacientes sem match (se aplicável ao fluxo do cliente)
    v_sem_match := 0; 
    
    -- Mock/Placeholder para ocupação (complexo de calcular sem uma tabela strict de slots ativos)
    -- Num cenário real seria sum(slots_agendados) / sum(capacidade_dos_profissionais_ativos)
    -- Para este MVP usamos um benchmark fixo ou cálculo heurístico (50% base + variação)
    v_ocupacao := 75.0;

    RETURN json_build_object(
        'noshows', v_noshows,
        'espera_horas', round(v_espera_horas, 1),
        'sem_match', v_sem_match,
        'ocupacao', v_ocupacao
    );
END;
$$;


-- 3. Summary RPC (v3) - Includes Business Model Filter
CREATE OR REPLACE FUNCTION get_dashboard_summary_v3(p_business_model text DEFAULT 'global', days_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    v_consultas_atual integer := 0;
    v_pacientes_atual integer := 0;
    v_receita_consultas_atual numeric := 0;
    v_receita_eventos_atual numeric := 0;
    v_total_bookings_atual integer := 0;
    v_ticket_medio numeric := 0;
    v_total_professionals integer := 0;
BEGIN
    SELECT (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    SELECT count(*) INTO v_consultas_atual
    FROM bookings
    WHERE status IN ('confirmed', 'completed')
      AND booking_date::date >= CURRENT_DATE - days_limit
      AND (p_business_model = 'global' OR business_model = p_business_model);

    SELECT count(*) INTO v_total_bookings_atual
    FROM bookings
    WHERE booking_date::date >= CURRENT_DATE - days_limit
      AND (p_business_model = 'global' OR business_model = p_business_model);

    SELECT count(DISTINCT patient_email) INTO v_pacientes_atual
    FROM bookings
    WHERE patient_email IS NOT NULL
      AND status IN ('confirmed', 'completed')
      AND booking_date::date >= CURRENT_DATE - days_limit
      AND (p_business_model = 'global' OR business_model = p_business_model);

    SELECT coalesce(sum(p.amount), 0) INTO v_receita_consultas_atual
    FROM payments p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.status = 'approved'
      AND p.created_at::date >= CURRENT_DATE - days_limit
      AND (p_business_model = 'global' OR b.business_model = p_business_model);

    IF p_business_model = 'global' OR p_business_model = 'b2c' THEN
        BEGIN
            SELECT coalesce(sum(ie.amount), 0) INTO v_receita_eventos_atual
            FROM inscricoes_eventos ie
            WHERE ie.payment_status = 'confirmed'
              AND ie.created_at::date >= CURRENT_DATE - days_limit;
        EXCEPTION WHEN undefined_column OR others THEN
            v_receita_eventos_atual := 0;
        END;
    ELSE
        v_receita_eventos_atual := 0;
    END IF;

    SELECT count(*) INTO v_total_professionals FROM professionals;

    IF v_consultas_atual > 0 THEN
        v_ticket_medio := round(v_receita_consultas_atual / v_consultas_atual, 2);
    END IF;

    RETURN json_build_object(
        'consultas_confirmadas', v_consultas_atual,
        'consultas_delta_pct', 0, -- Simplificado
        'pacientes_unicos', v_pacientes_atual,
        'pacientes_delta_pct', 0, -- Simplificado
        'receita_consultas', v_receita_consultas_atual,
        'receita_consultas_delta_pct', 0, -- Simplificado
        'receita_eventos', v_receita_eventos_atual,
        'ticket_medio', v_ticket_medio,
        'taxa_conversao', CASE WHEN v_total_bookings_atual > 0 THEN round((v_consultas_atual::numeric / v_total_bookings_atual) * 100, 1) ELSE 0 END,
        'total_professionals', v_total_professionals
    );
END;
$$;


-- 4. Temporal RPC (v3) - Includes Business Model Filter
CREATE OR REPLACE FUNCTION get_bookings_temporal_v3(p_business_model text DEFAULT 'global', days_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result json;
BEGIN
    SELECT (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT
            gs.day::date AS date,
            coalesce(ba.confirmados, 0) AS confirmados,
            coalesce(ba.cancelados, 0) AS cancelados,
            coalesce(ra.receita, 0) AS receita
        FROM (
            SELECT (CURRENT_DATE - n)::date AS day
            FROM generate_series(0, days_limit) n
            ORDER BY day ASC
        ) gs
        LEFT JOIN (
            SELECT
                booking_date::date AS bdate,
                count(*) FILTER (WHERE status IN ('confirmed', 'completed')) AS confirmados,
                count(*) FILTER (WHERE status = 'cancelled') AS cancelados
            FROM bookings
            WHERE booking_date::date >= CURRENT_DATE - days_limit
              AND (p_business_model = 'global' OR business_model = p_business_model)
            GROUP BY booking_date::date
        ) ba ON ba.bdate = gs.day
        LEFT JOIN (
            SELECT
                p.created_at::date AS pdate,
                sum(p.amount) AS receita
            FROM payments p
            INNER JOIN bookings bk ON bk.id = p.booking_id
            WHERE p.status = 'approved'
              AND p.created_at::date >= CURRENT_DATE - days_limit
              AND (p_business_model = 'global' OR bk.business_model = p_business_model)
            GROUP BY p.created_at::date
        ) ra ON ra.pdate = gs.day
    ) t;

    RETURN coalesce(result, '[]'::json);
END;
$$;
