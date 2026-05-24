-- Migration: Management Dashboard RPCs
-- Cria funções de agregação no banco de dados para o Dashboard Gerencial.
-- Segurança (RLS) via SECURITY DEFINER e validação de JWT role.

-- 1. Resumo Geral do Dashboard
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    v_total_bookings integer;
    v_total_professionals integer;
    v_unique_patients integer;
    v_total_revenue numeric;
    result json;
BEGIN
    -- Security Check: Verifica se o token JWT pertence a um admin
    SELECT (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem acessar estas estatísticas.';
    END IF;
    
    -- Cálculos
    SELECT count(*) INTO v_total_bookings FROM bookings;
    SELECT count(*) INTO v_total_professionals FROM professionals;
    SELECT count(DISTINCT patient_email) INTO v_unique_patients FROM bookings WHERE patient_email IS NOT NULL;
    SELECT coalesce(sum(valor_consulta), 0) INTO v_total_revenue FROM bookings WHERE status = 'confirmed' OR status = 'completed';
    
    result := json_build_object(
        'total_bookings', v_total_bookings,
        'total_professionals', v_total_professionals,
        'unique_patients', v_unique_patients,
        'total_revenue', v_total_revenue
    );
    
    RETURN result;
END;
$$;

-- 2. Visão Temporal de Agendamentos (Últimos 30 dias por padrão)
CREATE OR REPLACE FUNCTION get_bookings_temporal(days_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result json;
BEGIN
    SELECT (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem acessar estas estatísticas.';
    END IF;

    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            date_trunc('day', booking_date::date) as date,
            count(*) as count
        FROM bookings
        WHERE booking_date::date >= CURRENT_DATE - days_limit
        GROUP BY date_trunc('day', booking_date::date)
        ORDER BY date_trunc('day', booking_date::date) ASC
    ) t;
    
    RETURN coalesce(result, '[]'::json);
END;
$$;

-- 3. Carga e Ranking de Profissionais
CREATE OR REPLACE FUNCTION get_professional_workload()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result json;
BEGIN
    SELECT (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem acessar estas estatísticas.';
    END IF;

    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            p.id,
            p.name,
            count(b.id) as total_appointments,
            sum(CASE WHEN b.status IN ('confirmed', 'completed') THEN 1 ELSE 0 END) as completed_appointments
        FROM professionals p
        LEFT JOIN bookings b ON b.professional_id = p.id
        GROUP BY p.id, p.name
        ORDER BY total_appointments DESC
    ) t;
    
    RETURN coalesce(result, '[]'::json);
END;
$$;
