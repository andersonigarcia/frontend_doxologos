-- Tabela centralizada de logs de erro (Frontend + Edge Functions)
-- Garante visibilidade mesmo quando AdBlockers bloqueiam Sentry/GA4

CREATE TABLE IF NOT EXISTS public.system_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('frontend', 'edge_function', 'synthetic')),
  service TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  message TEXT NOT NULL,
  error_code TEXT,
  stack_trace TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  url TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.system_error_logs IS 'Logs estruturados de erros operacionais do frontend e Edge Functions';

CREATE INDEX IF NOT EXISTS idx_system_error_logs_created_at
  ON public.system_error_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_error_logs_service
  ON public.system_error_logs (service);

CREATE INDEX IF NOT EXISTS idx_system_error_logs_severity
  ON public.system_error_logs (severity);

CREATE INDEX IF NOT EXISTS idx_system_error_logs_source
  ON public.system_error_logs (source);

ALTER TABLE public.system_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view system error logs" ON public.system_error_logs;
CREATE POLICY "Admins can view system error logs"
  ON public.system_error_logs
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'gestor') OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "Service role can insert system error logs" ON public.system_error_logs;
CREATE POLICY "Service role can insert system error logs"
  ON public.system_error_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.cleanup_old_system_error_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.system_error_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

