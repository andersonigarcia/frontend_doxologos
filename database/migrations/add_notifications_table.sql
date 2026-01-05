-- ============================================
-- Migração: Tabela de Notificações
-- Data: 2025-12-20
-- Fase: 3 - Migrações de Banco de Dados
-- ============================================

-- Descrição:
-- Cria tabela para sistema de notificações em tempo real
-- Inclui políticas RLS, índices otimizados e triggers

-- ============================================
-- 1. Criar tabela de notificações
-- ============================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  link VARCHAR(500),
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE public.notifications IS 'Sistema de notificações em tempo real para usuários';

COMMENT ON COLUMN public.notifications.user_id IS 'ID do usuário que receberá a notificação';
COMMENT ON COLUMN public.notifications.type IS 'Tipo de notificação (booking:confirmed, payment:received, etc)';
COMMENT ON COLUMN public.notifications.title IS 'Título da notificação';
COMMENT ON COLUMN public.notifications.message IS 'Mensagem detalhada da notificação';
COMMENT ON COLUMN public.notifications.link IS 'Link para ação relacionada';
COMMENT ON COLUMN public.notifications.read IS 'Se a notificação foi lida';
COMMENT ON COLUMN public.notifications.read_at IS 'Timestamp de quando foi lida';
COMMENT ON COLUMN public.notifications.metadata IS 'Metadados adicionais em formato JSON';

-- ============================================
-- 2. Criar índices para performance
-- ============================================

-- Índice por usuário (query mais comum)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON public.notifications(user_id);

-- Índice por status de leitura
CREATE INDEX IF NOT EXISTS idx_notifications_read 
ON public.notifications(read);

-- Índice composto para notificações não lidas por usuário
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, read) 
WHERE read = FALSE;

-- Índice por data de criação (para ordenação)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON public.notifications(created_at DESC);

-- Índice por tipo de notificação
CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON public.notifications(type);

-- ============================================
-- 3. Criar função de atualização de timestamp
-- ============================================

CREATE OR REPLACE FUNCTION public.set_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Criar trigger de atualização
-- ============================================

DROP TRIGGER IF EXISTS trigger_set_notifications_updated_at ON public.notifications;
CREATE TRIGGER trigger_set_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_notifications_updated_at();

-- ============================================
-- 5. Criar função para marcar como lida
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_notification_as_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET read = TRUE,
      read_at = NOW()
  WHERE id = notification_id
    AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.mark_notification_as_read(UUID) IS 'Marca uma notificação como lida';

-- ============================================
-- 6. Criar função para marcar todas como lidas
-- ============================================

CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read = TRUE,
      read_at = NOW()
  WHERE user_id = auth.uid()
    AND read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.mark_all_notifications_as_read() IS 'Marca todas as notificações do usuário como lidas';

-- ============================================
-- 7. Criar função para deletar notificações antigas
-- ============================================

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar notificações lidas com mais de 30 dias
  DELETE FROM public.notifications
  WHERE read = TRUE
    AND read_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Limpeza de notificações: % registros removidos', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_notifications() IS 'Remove notificações lidas com mais de 30 dias';

-- ============================================
-- 8. Habilitar Row Level Security (RLS)
-- ============================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 9. Criar políticas RLS
-- ============================================

-- Política: Usuários podem ver apenas suas próprias notificações
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Política: Usuários podem atualizar apenas suas próprias notificações
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política: Usuários podem deletar apenas suas próprias notificações
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- Política: Admins podem ver todas as notificações
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Política: Service role pode inserir notificações
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- ============================================
-- 10. Validação da migração
-- ============================================

-- Verificar que tabela foi criada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) THEN
    RAISE EXCEPTION 'Tabela notifications não foi criada';
  END IF;
  
  RAISE NOTICE '✅ Tabela notifications criada com sucesso';
END $$;

-- Verificar índices
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'notifications'
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
    WHERE tablename = 'notifications'
    AND schemaname = 'public'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS não está habilitado na tabela notifications';
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
  WHERE tablename = 'notifications'
  AND schemaname = 'public';
  
  IF policy_count < 5 THEN
    RAISE WARNING 'Esperado 5 políticas, encontrado %', policy_count;
  ELSE
    RAISE NOTICE '✅ % políticas RLS criadas com sucesso', policy_count;
  END IF;
END $$;

-- ============================================
-- 11. Inserir notificação de migração
-- ============================================

-- Criar notificação de sistema para todos os usuários
-- (Comentado - descomente se quiser notificar usuários sobre a nova feature)
/*
INSERT INTO public.notifications (user_id, type, title, message, metadata)
SELECT 
  id,
  'system:announcement',
  'Sistema de Notificações Ativado',
  'Agora você receberá notificações em tempo real sobre seus agendamentos e pagamentos.',
  '{"migration": "add_notifications_table", "version": "1.0"}'::jsonb
FROM auth.users;
*/

-- ============================================
-- Migração concluída com sucesso!
-- ============================================

RAISE NOTICE '✅ Migração add_notifications_table concluída com sucesso!';
