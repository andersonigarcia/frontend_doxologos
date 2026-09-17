-- 20260916000000_backend_rate_limiter.sql
-- Fase 1: Rate Limiter e Filas de Retentativa (Resiliência para escala 7x)

-- ==========================================
-- 1. Rate Limiter Backend
-- ==========================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  action text NOT NULL,
  key text NOT NULL,
  hits integer DEFAULT 1,
  expires_at timestamp with time zone NOT NULL,
  PRIMARY KEY (action, key)
);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service_role can access this table directly
CREATE POLICY "Service role has full access to rate_limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Função atômica para checar e incrementar rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action text,
  p_key text,
  p_max_hits integer,
  p_window_seconds integer
) RETURNS jsonb AS $$
DECLARE
  v_hits integer;
  v_expires_at timestamp with time zone;
  v_allowed boolean;
BEGIN
  -- Tenta pegar o registro atual
  SELECT hits, expires_at INTO v_hits, v_expires_at 
  FROM public.rate_limits 
  WHERE action = p_action AND key = p_key;

  IF NOT FOUND OR v_expires_at < now() THEN
    -- Primeiro hit ou expirado, criar novo/sobrescrever
    INSERT INTO public.rate_limits (action, key, hits, expires_at)
    VALUES (p_action, p_key, 1, now() + (p_window_seconds || ' seconds')::interval)
    ON CONFLICT (action, key) DO UPDATE 
    SET hits = 1, expires_at = now() + (p_window_seconds || ' seconds')::interval
    RETURNING hits, expires_at INTO v_hits, v_expires_at;
  ELSE
    -- Incrementar hits
    UPDATE public.rate_limits 
    SET hits = hits + 1
    WHERE action = p_action AND key = p_key
    RETURNING hits, expires_at INTO v_hits, v_expires_at;
  END IF;

  v_allowed := v_hits <= p_max_hits;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'hits', v_hits,
    'remaining', GREATEST(0, p_max_hits - v_hits),
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 2. Sistema de Filas (Retry para SMTP/Webhooks)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.background_tasks_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_type text NOT NULL, -- 'email', 'webhook_retry', etc
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 5,
  next_retry_at timestamp with time zone DEFAULT now(),
  last_error text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índice parcial para queries rápidas de tarefas pendentes
CREATE INDEX idx_background_tasks_queue_status_retry 
ON public.background_tasks_queue (status, next_retry_at) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.background_tasks_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to background_tasks_queue"
ON public.background_tasks_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_updated_at_background_tasks ON public.background_tasks_queue;
CREATE TRIGGER trigger_set_updated_at_background_tasks
BEFORE UPDATE ON public.background_tasks_queue
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
