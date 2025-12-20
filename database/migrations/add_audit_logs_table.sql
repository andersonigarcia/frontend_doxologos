-- ============================================
-- Migração: Tabela de Audit Logs
-- Data: 2025-12-20
-- Fase: 2 - Segurança e Autorização
-- ============================================

-- Descrição:
-- Cria tabela para logs de auditoria de ações críticas do usuário
-- Inclui políticas RLS para segurança e função de limpeza automática

-- ============================================
-- 1. Criar tabela de audit logs
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  level VARCHAR(20) DEFAULT 'info' CHECK (level IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentário da tabela
COMMENT ON TABLE public.audit_logs IS 'Registro de auditoria de ações críticas do usuário';

-- Comentários das colunas
COMMENT ON COLUMN public.audit_logs.user_id IS 'ID do usuário que executou a ação';
COMMENT ON COLUMN public.audit_logs.action IS 'Ação executada (ex: auth:login, booking:cancel)';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Tipo de recurso afetado (ex: booking, payment)';
COMMENT ON COLUMN public.audit_logs.resource_id IS 'ID do recurso afetado';
COMMENT ON COLUMN public.audit_logs.details IS 'Detalhes adicionais da ação em formato JSON';
COMMENT ON COLUMN public.audit_logs.ip_address IS 'Endereço IP do usuário';
COMMENT ON COLUMN public.audit_logs.user_agent IS 'User agent do navegador';
COMMENT ON COLUMN public.audit_logs.level IS 'Nível de severidade do log';

-- ============================================
-- 2. Criar índices para performance
-- ============================================

-- Índice por usuário (queries mais comuns)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON public.audit_logs(user_id);

-- Índice por ação
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON public.audit_logs(action);

-- Índice por data (para ordenação e filtros)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
ON public.audit_logs(created_at DESC);

-- Índice composto para queries por recurso
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
ON public.audit_logs(resource_type, resource_id);

-- Índice por nível (para filtrar logs críticos)
CREATE INDEX IF NOT EXISTS idx_audit_logs_level 
ON public.audit_logs(level);

-- ============================================
-- 3. Função de limpeza automática (90 dias)
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar logs com mais de 90 dias
  DELETE FROM public.audit_logs
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da limpeza
  RAISE NOTICE 'Limpeza de audit logs: % registros removidos', deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_audit_logs() IS 'Remove logs de auditoria com mais de 90 dias';

-- ============================================
-- 4. Habilitar Row Level Security (RLS)
-- ============================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Políticas RLS
-- ============================================

-- Política: Admins podem ver todos os logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Política: Usuários podem ver apenas seus próprios logs
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Política: Service role pode inserir logs
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs" ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Política: Ninguém pode atualizar ou deletar logs (imutável)
DROP POLICY IF EXISTS "Audit logs are immutable" ON public.audit_logs;
CREATE POLICY "Audit logs are immutable" ON public.audit_logs
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON public.audit_logs;
CREATE POLICY "Audit logs cannot be deleted" ON public.audit_logs
  FOR DELETE
  USING (false);

-- ============================================
-- 6. Trigger para prevenir updates/deletes
-- ============================================

CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs são imutáveis e não podem ser modificados ou deletados';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para UPDATE
DROP TRIGGER IF EXISTS trg_audit_logs_no_update ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_no_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- Trigger para DELETE
DROP TRIGGER IF EXISTS trg_audit_logs_no_delete ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_no_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();

-- ============================================
-- 7. Validação da migração
-- ============================================

-- Verificar que tabela foi criada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_logs'
  ) THEN
    RAISE EXCEPTION 'Tabela audit_logs não foi criada';
  END IF;
  
  RAISE NOTICE '✅ Tabela audit_logs criada com sucesso';
END $$;

-- Verificar índices
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'audit_logs'
  AND schemaname = 'public';
  
  IF index_count < 5 THEN
    RAISE WARNING 'Esperado 5 índices, encontrado %', index_count;
  ELSE
    RAISE NOTICE '✅ % índices criados com sucesso', index_count;
  END IF;
END $$;

-- Verificar RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'audit_logs'
    AND schemaname = 'public'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS não está habilitado na tabela audit_logs';
  END IF;
  
  RAISE NOTICE '✅ RLS habilitado com sucesso';
END $$;

-- Verificar políticas
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'audit_logs'
  AND schemaname = 'public';
  
  IF policy_count < 5 THEN
    RAISE WARNING 'Esperado 5 políticas, encontrado %', policy_count;
  ELSE
    RAISE NOTICE '✅ % políticas RLS criadas com sucesso', policy_count;
  END IF;
END $$;

-- ============================================
-- 8. Inserir log de migração
-- ============================================

INSERT INTO public.audit_logs (
  user_id,
  action,
  resource_type,
  details,
  level
) VALUES (
  NULL,
  'system:migration',
  'database',
  '{"migration": "add_audit_logs_table", "version": "1.0", "date": "2025-12-20"}'::jsonb,
  'info'
);

-- ============================================
-- Migração concluída com sucesso!
-- ============================================

RAISE NOTICE '✅ Migração add_audit_logs_table concluída com sucesso!';
