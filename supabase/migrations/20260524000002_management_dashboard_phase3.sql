-- Migration: Management Dashboard RPCs - Phase 3 (Page Views)
-- Cria tabela de analytics nativo e função de agrupamento.

CREATE TABLE IF NOT EXISTS public.page_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    path text NOT NULL,
    user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Allow inserts for anyone" ON public.page_views;
DROP POLICY IF EXISTS "Allow select for admins" ON public.page_views;

-- Permitir inserção para anônimos e autenticados (qualquer um pode gerar page view)
CREATE POLICY "Allow inserts for anyone" ON public.page_views
    FOR INSERT 
    WITH CHECK (true);

-- Permitir leitura apenas para admins
CREATE POLICY "Allow select for admins" ON public.page_views
    FOR SELECT
    USING (
        (auth.jwt() ->> 'role') = 'admin' OR 
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );


-- Função RPC para buscar estatísticas de acesso (Top Páginas)
CREATE OR REPLACE FUNCTION get_page_views_stats(days_limit integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result json;
BEGIN
    -- Security Check
    SELECT (auth.jwt() ->> 'role') = 'admin' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' INTO is_admin;
    
    IF NOT is_admin THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem acessar estas estatísticas.';
    END IF;

    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
        SELECT 
            path, 
            count(*) as views,
            count(DISTINCT session_id) as unique_sessions
        FROM page_views
        WHERE created_at >= CURRENT_DATE - days_limit
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
    ) t;
    
    RETURN coalesce(result, '[]'::json);
END;
$$;
