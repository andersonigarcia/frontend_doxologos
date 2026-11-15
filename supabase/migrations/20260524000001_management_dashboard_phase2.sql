-- Migration: Management Dashboard RPCs - Phase 2 (Retention)
-- Cria função para retornar métricas de retenção e recorrência de pacientes.

CREATE OR REPLACE FUNCTION get_patient_retention()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result json;
BEGIN
    -- Security Check: Verifica se o token JWT pertence a um admin
    SELECT (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem acessar estas estatísticas.';
    END IF;

    WITH patient_counts AS (
        SELECT 
            patient_email, 
            count(*) as num_consultas
        FROM bookings
        WHERE status IN ('confirmed', 'completed', 'paid') 
          AND patient_email IS NOT NULL
        GROUP BY patient_email
    ),
    retention_buckets AS (
        SELECT
            CASE 
                WHEN num_consultas = 1 THEN 'Única Consulta'
                WHEN num_consultas BETWEEN 2 AND 3 THEN 'Recorrente (2-3)'
                ELSE 'Fiel (4+)'
            END as category,
            count(*) as count
        FROM patient_counts
        GROUP BY 
            CASE 
                WHEN num_consultas = 1 THEN 'Única Consulta'
                WHEN num_consultas BETWEEN 2 AND 3 THEN 'Recorrente (2-3)'
                ELSE 'Fiel (4+)'
            END
    )
    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT category, count FROM retention_buckets
        ORDER BY 
            CASE category
                WHEN 'Única Consulta' THEN 1
                WHEN 'Recorrente (2-3)' THEN 2
                WHEN 'Fiel (4+)' THEN 3
                ELSE 4
            END
    ) t;
    
    RETURN coalesce(result, '[]'::json);
END;
$$;
