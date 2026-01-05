-- ============================================
-- Rollback: Fase 3 - Migrações de Banco de Dados
-- Data: 2025-12-20
-- ============================================

-- ATENÇÃO: Este script remove as tabelas criadas na Fase 3
-- Execute apenas se necessário reverter as migrações

-- ============================================
-- 1. Remover triggers
-- ============================================

DROP TRIGGER IF EXISTS trigger_create_default_user_preferences ON auth.users;
DROP TRIGGER IF EXISTS trigger_set_user_preferences_updated_at ON public.user_preferences;
DROP TRIGGER IF EXISTS trigger_set_notifications_updated_at ON public.notifications;

RAISE NOTICE '✅ Triggers removidos';

-- ============================================
-- 2. Remover funções
-- ============================================

DROP FUNCTION IF EXISTS public.get_user_preferences() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_user_preferences() CASCADE;
DROP FUNCTION IF EXISTS public.set_user_preferences_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_notifications() CASCADE;
DROP FUNCTION IF EXISTS public.mark_all_notifications_as_read() CASCADE;
DROP FUNCTION IF EXISTS public.mark_notification_as_read(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.set_notifications_updated_at() CASCADE;

RAISE NOTICE '✅ Funções removidas';

-- ============================================
-- 3. Remover tabelas
-- ============================================

DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

RAISE NOTICE '✅ Tabelas removidas';

-- ============================================
-- 4. Validar rollback
-- ============================================

DO $$
DECLARE
  tables_exist BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('notifications', 'user_preferences')
  ) INTO tables_exist;
  
  IF tables_exist THEN
    RAISE EXCEPTION 'Rollback falhou: tabelas ainda existem';
  END IF;
  
  RAISE NOTICE '✅ Rollback concluído com sucesso - todas as tabelas foram removidas';
END $$;

-- ============================================
-- 5. Verificar funções removidas
-- ============================================

DO $$
DECLARE
  functions_exist BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
      'get_user_preferences',
      'create_default_user_preferences',
      'set_user_preferences_updated_at',
      'cleanup_old_notifications',
      'mark_all_notifications_as_read',
      'mark_notification_as_read',
      'set_notifications_updated_at'
    )
  ) INTO functions_exist;
  
  IF functions_exist THEN
    RAISE WARNING 'Algumas funções ainda existem';
  ELSE
    RAISE NOTICE '✅ Todas as funções foram removidas';
  END IF;
END $$;

-- ============================================
-- Rollback concluído!
-- ============================================

RAISE NOTICE '✅ Rollback da Fase 3 concluído com sucesso!';
RAISE NOTICE 'ℹ️  As tabelas notifications e user_preferences foram removidas';
RAISE NOTICE 'ℹ️  Todas as funções e triggers relacionados foram removidos';
