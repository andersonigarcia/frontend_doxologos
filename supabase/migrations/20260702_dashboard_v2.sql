-- =============================================
-- Migration: Management Dashboard RPCs v2
-- =============================================
-- As funções v1 (get_dashboard_summary, get_bookings_temporal,
-- get_professional_workload, get_patient_retention, get_page_views_stats)
-- NÃO são alteradas. Este arquivo apenas ADICIONA novas funções.
-- =============================================

-- ──────────────────────────────────────────────────────────────────
-- 1. Resumo Geral v2
--    - Receita real via tabela payments (status = 'approved')
--    - Receita de eventos separada
--    - Delta vs período anterior de mesma duração
--    - Ticket médio, taxa de conversão, taxa de retenção
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_summary_v2(days_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result   json;

    v_consultas_atual    integer := 0;
    v_consultas_anterior integer := 0;
    v_consultas_delta    numeric;

    v_pacientes_atual    integer := 0;
    v_pacientes_anterior integer := 0;
    v_pacientes_delta    numeric;

    v_receita_consultas_atual    numeric := 0;
    v_receita_consultas_anterior numeric := 0;
    v_receita_consultas_delta    numeric;

    v_receita_eventos_atual numeric := 0;

    v_total_bookings_atual integer := 0;
    v_ticket_medio         numeric := 0;
    v_taxa_conversao       numeric := 0;
    v_taxa_retencao        numeric := 0;
    v_total_professionals  integer := 0;
BEGIN
    SELECT (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem acessar estas estatísticas.';
    END IF;

    -- ── Período atual ──────────────────────────────────────────────

    SELECT count(*) INTO v_consultas_atual
    FROM bookings
    WHERE status IN ('confirmed', 'completed')
      AND booking_date::date >= CURRENT_DATE - days_limit;

    SELECT count(*) INTO v_total_bookings_atual
    FROM bookings
    WHERE booking_date::date >= CURRENT_DATE - days_limit;

    SELECT count(DISTINCT patient_email) INTO v_pacientes_atual
    FROM bookings
    WHERE patient_email IS NOT NULL
      AND status IN ('confirmed', 'completed')
      AND booking_date::date >= CURRENT_DATE - days_limit;

    -- Receita real de consultas via payments aprovados
    SELECT coalesce(sum(p.amount), 0) INTO v_receita_consultas_atual
    FROM payments p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.status = 'approved'
      AND p.created_at::date >= CURRENT_DATE - days_limit;

    -- Receita de eventos (silencia erros de schema se campo não existir)
    BEGIN
        SELECT coalesce(sum(ie.amount), 0) INTO v_receita_eventos_atual
        FROM inscricoes_eventos ie
        WHERE ie.payment_status = 'confirmed'
          AND ie.created_at::date >= CURRENT_DATE - days_limit;
    EXCEPTION WHEN undefined_column OR others THEN
        v_receita_eventos_atual := 0;
    END;

    -- ── Período anterior (mesma duração, imediatamente antes) ──────

    SELECT count(*) INTO v_consultas_anterior
    FROM bookings
    WHERE status IN ('confirmed', 'completed')
      AND booking_date::date >= CURRENT_DATE - (days_limit * 2)
      AND booking_date::date <  CURRENT_DATE - days_limit;

    SELECT count(DISTINCT patient_email) INTO v_pacientes_anterior
    FROM bookings
    WHERE patient_email IS NOT NULL
      AND status IN ('confirmed', 'completed')
      AND booking_date::date >= CURRENT_DATE - (days_limit * 2)
      AND booking_date::date <  CURRENT_DATE - days_limit;

    SELECT coalesce(sum(p.amount), 0) INTO v_receita_consultas_anterior
    FROM payments p
    INNER JOIN bookings b ON b.id = p.booking_id
    WHERE p.status = 'approved'
      AND p.created_at::date >= CURRENT_DATE - (days_limit * 2)
      AND p.created_at::date <  CURRENT_DATE - days_limit;

    -- ── Profissionais cadastrados ───────────────────────────────────
    SELECT count(*) INTO v_total_professionals FROM professionals;

    -- ── Deltas (%) ─────────────────────────────────────────────────
    IF v_consultas_anterior > 0 THEN
        v_consultas_delta := round(
            ((v_consultas_atual - v_consultas_anterior)::numeric / v_consultas_anterior) * 100, 1
        );
    END IF;

    IF v_pacientes_anterior > 0 THEN
        v_pacientes_delta := round(
            ((v_pacientes_atual - v_pacientes_anterior)::numeric / v_pacientes_anterior) * 100, 1
        );
    END IF;

    IF v_receita_consultas_anterior > 0 THEN
        v_receita_consultas_delta := round(
            ((v_receita_consultas_atual - v_receita_consultas_anterior) / v_receita_consultas_anterior) * 100, 1
        );
    END IF;

    -- ── Métricas derivadas ─────────────────────────────────────────
    IF v_total_bookings_atual > 0 THEN
        v_taxa_conversao := round(
            (v_consultas_atual::numeric / v_total_bookings_atual) * 100, 1
        );
    END IF;

    IF v_consultas_atual > 0 THEN
        v_ticket_medio := round(v_receita_consultas_atual / v_consultas_atual, 2);
    END IF;

    -- Taxa de retenção: pacientes com 2+ consultas / total pacientes únicos
    SELECT
        CASE WHEN count(*) > 0 THEN
            round(count(*) FILTER (WHERE num_consultas >= 2)::numeric / count(*) * 100, 1)
        ELSE 0 END
    INTO v_taxa_retencao
    FROM (
        SELECT patient_email, count(*) AS num_consultas
        FROM bookings
        WHERE status IN ('confirmed', 'completed') AND patient_email IS NOT NULL
        GROUP BY patient_email
    ) sub;

    -- ── Resultado ─────────────────────────────────────────────────
    result := json_build_object(
        -- Métricas principais com delta
        'consultas_confirmadas',         v_consultas_atual,
        'consultas_delta_pct',           v_consultas_delta,
        'pacientes_unicos',              v_pacientes_atual,
        'pacientes_delta_pct',           v_pacientes_delta,
        'receita_consultas',             v_receita_consultas_atual,
        'receita_consultas_delta_pct',   v_receita_consultas_delta,
        'receita_eventos',               v_receita_eventos_atual,
        -- Métricas derivadas
        'ticket_medio',                  v_ticket_medio,
        'taxa_conversao',                v_taxa_conversao,
        'taxa_retencao',                 v_taxa_retencao,
        'total_professionals',           v_total_professionals,
        -- Compatibilidade com v1 (mantidos para não quebrar código existente)
        'total_bookings',                v_total_bookings_atual,
        'unique_patients',               v_pacientes_atual,
        'total_revenue',                 v_receita_consultas_atual
    );

    RETURN result;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- 2. Funil de Conversão
--    Retorna array de etapas com contagem e taxa de drop-off
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_conversion_funnel(days_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result   json;

    v_home_views             integer := 0;
    v_booking_views          integer := 0;
    v_bookings_criados       integer := 0;
    v_bookings_nao_cancelados integer := 0;
    v_bookings_confirmados   integer := 0;
BEGIN
    SELECT (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- Etapa 1: visitas à Home (excluindo /admin*)
    SELECT count(*) INTO v_home_views
    FROM page_views
    WHERE path = '/'
      AND created_at >= CURRENT_DATE - days_limit;

    -- Etapa 2: visitas à página de agendamento
    SELECT count(*) INTO v_booking_views
    FROM page_views
    WHERE path = '/agendamento'
      AND created_at >= CURRENT_DATE - days_limit;

    -- Etapa 3: bookings criados (qualquer status)
    SELECT count(*) INTO v_bookings_criados
    FROM bookings
    WHERE booking_date::date >= CURRENT_DATE - days_limit;

    -- Etapa 4: bookings não cancelados (foram ao pagamento)
    SELECT count(*) INTO v_bookings_nao_cancelados
    FROM bookings
    WHERE status NOT IN ('cancelled')
      AND booking_date::date >= CURRENT_DATE - days_limit;

    -- Etapa 5: pagamentos confirmados
    SELECT count(*) INTO v_bookings_confirmados
    FROM bookings
    WHERE status IN ('confirmed', 'completed')
      AND booking_date::date >= CURRENT_DATE - days_limit;

    result := json_build_array(
        json_build_object(
            'stage', 1,
            'label', 'Visitas à Home',
            'count', v_home_views,
            'drop_off_pct', 0
        ),
        json_build_object(
            'stage', 2,
            'label', 'Acessaram Agendamento',
            'count', v_booking_views,
            'drop_off_pct', CASE WHEN v_home_views > 0
                THEN round((1 - v_booking_views::numeric / v_home_views) * 100, 1)
                ELSE 0 END
        ),
        json_build_object(
            'stage', 3,
            'label', 'Iniciaram Booking',
            'count', v_bookings_criados,
            'drop_off_pct', CASE WHEN v_booking_views > 0
                THEN round((1 - v_bookings_criados::numeric / v_booking_views) * 100, 1)
                ELSE 0 END
        ),
        json_build_object(
            'stage', 4,
            'label', 'Foram ao Pagamento',
            'count', v_bookings_nao_cancelados,
            'drop_off_pct', CASE WHEN v_bookings_criados > 0
                THEN round((1 - v_bookings_nao_cancelados::numeric / v_bookings_criados) * 100, 1)
                ELSE 0 END
        ),
        json_build_object(
            'stage', 5,
            'label', 'Pagamento Confirmado',
            'count', v_bookings_confirmados,
            'drop_off_pct', CASE WHEN v_bookings_nao_cancelados > 0
                THEN round((1 - v_bookings_confirmados::numeric / v_bookings_nao_cancelados) * 100, 1)
                ELSE 0 END
        )
    );

    RETURN result;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- 3. Temporal v2
--    Série diária com confirmados, cancelados e receita real
--    Usa generate_series para preencher dias sem agendamentos
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_bookings_temporal_v2(days_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result   json;
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
            gs.day::date                          AS date,
            coalesce(ba.confirmados, 0)           AS confirmados,
            coalesce(ba.cancelados,  0)           AS cancelados,
            coalesce(ba.total,       0)           AS total,
            coalesce(ra.receita,     0)           AS receita
        FROM (
            SELECT (CURRENT_DATE - n)::date AS day
            FROM generate_series(0, days_limit) n
            ORDER BY day ASC
        ) gs
        LEFT JOIN (
            SELECT
                booking_date::date AS bdate,
                count(*) FILTER (WHERE status IN ('confirmed', 'completed')) AS confirmados,
                count(*) FILTER (WHERE status = 'cancelled')                 AS cancelados,
                count(*)                                                      AS total
            FROM bookings
            WHERE booking_date::date >= CURRENT_DATE - days_limit
            GROUP BY booking_date::date
        ) ba ON ba.bdate = gs.day
        LEFT JOIN (
            SELECT
                created_at::date AS pdate,
                sum(amount)      AS receita
            FROM payments
            WHERE status = 'approved'
              AND created_at::date >= CURRENT_DATE - days_limit
            GROUP BY created_at::date
        ) ra ON ra.pdate = gs.day
    ) t;

    RETURN coalesce(result, '[]'::json);
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- 4. Workload de Profissionais v2
--    Inclui receita por profissional e taxa de conclusão
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_professional_workload_v2(days_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result   json;
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
            p.id,
            p.name,
            count(b.id)                                                                      AS total_appointments,
            count(b.id) FILTER (WHERE b.status IN ('confirmed', 'completed'))                AS completed_appointments,
            CASE WHEN count(b.id) > 0
                THEN round(
                    count(b.id) FILTER (WHERE b.status IN ('confirmed', 'completed'))::numeric
                    / count(b.id) * 100, 1)
                ELSE 0
            END                                                                              AS taxa_conclusao,
            coalesce((
                SELECT sum(pay.amount)
                FROM payments pay
                INNER JOIN bookings bk ON bk.id = pay.booking_id
                WHERE bk.professional_id = p.id
                  AND pay.status = 'approved'
                  AND bk.booking_date::date >= CURRENT_DATE - days_limit
            ), 0)                                                                            AS receita
        FROM professionals p
        LEFT JOIN bookings b
            ON b.professional_id = p.id
           AND b.booking_date::date >= CURRENT_DATE - days_limit
        GROUP BY p.id, p.name
        ORDER BY total_appointments DESC
    ) t;

    RETURN coalesce(result, '[]'::json);
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- 5. Estatísticas de Eventos
--    Inscrições confirmadas, receita (se disponível) e top eventos
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_event_stats(days_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin        boolean;
    result          json;
    v_total_inscritos integer := 0;
    v_receita_eventos numeric  := 0;
    v_top_eventos     json;
BEGIN
    SELECT (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- Inscrições confirmadas no período
    SELECT count(*) INTO v_total_inscritos
    FROM inscricoes_eventos ie
    WHERE ie.payment_status = 'confirmed'
      AND ie.created_at::date >= CURRENT_DATE - days_limit;

    -- Receita de eventos (silencia erro se campo amount não existir)
    BEGIN
        SELECT coalesce(sum(ie.amount), 0) INTO v_receita_eventos
        FROM inscricoes_eventos ie
        WHERE ie.payment_status = 'confirmed'
          AND ie.created_at::date >= CURRENT_DATE - days_limit;
    EXCEPTION WHEN undefined_column OR others THEN
        v_receita_eventos := 0;
    END;

    -- Top 5 eventos por inscrições
    SELECT json_agg(row_to_json(te)) INTO v_top_eventos
    FROM (
        SELECT
            ev.title,
            count(ie.id) AS inscricoes
        FROM inscricoes_eventos ie
        INNER JOIN eventos ev ON ev.id = ie.evento_id
        WHERE ie.payment_status = 'confirmed'
          AND ie.created_at::date >= CURRENT_DATE - days_limit
        GROUP BY ev.id, ev.title
        ORDER BY inscricoes DESC
        LIMIT 5
    ) te;

    result := json_build_object(
        'total_inscritos',  v_total_inscritos,
        'receita_eventos',  v_receita_eventos,
        'top_eventos',      coalesce(v_top_eventos, '[]'::json)
    );

    RETURN result;
END;
$$;


-- ──────────────────────────────────────────────────────────────────
-- 6. Alertas Operacionais
--    Bookings pending há mais de 24h e profissionais inativos
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_pending_alerts()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin              boolean;
    result                json;
    v_pending_expirados   integer := 0;
    v_prof_inativos       integer := 0;
BEGIN
    SELECT (auth.jwt() ->> 'role') = 'admin'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado.';
    END IF;

    -- Bookings com pending_payment para datas passadas (agendamento vencido não pago)
    SELECT count(*) INTO v_pending_expirados
    FROM bookings
    WHERE status = 'pending_payment'
      AND booking_date::date < CURRENT_DATE;

    -- Profissionais sem nenhum booking nos últimos 30 dias
    SELECT count(*) INTO v_prof_inativos
    FROM professionals p
    WHERE NOT EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.professional_id = p.id
          AND b.booking_date::date >= CURRENT_DATE - 30
          AND b.status NOT IN ('cancelled')
    );

    result := json_build_object(
        'pending_expirados',   v_pending_expirados,
        'profissionais_inativos', v_prof_inativos
    );

    RETURN result;
END;
$$;
