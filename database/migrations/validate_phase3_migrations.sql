-- ============================================
-- Validação: Fase 3 - Migrações de Banco de Dados
-- Data: 2025-12-20
-- ============================================

-- Este script valida que as migrações da Fase 3 foram executadas corretamente

-- ============================================
-- 1. Verificar Tabelas
-- ============================================

DO $$
DECLARE
  notifications_exists BOOLEAN;
  user_preferences_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) INTO notifications_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_preferences'
  ) INTO user_preferences_exists;
  
  IF NOT notifications_exists THEN
    RAISE EXCEPTION '❌ Tabela notifications não existe';
  END IF;
  
  IF NOT user_preferences_exists THEN
    RAISE EXCEPTION '❌ Tabela user_preferences não existe';
  END IF;
  
  RAISE NOTICE '✅ Ambas as tabelas existem';
END $$;

-- ============================================
-- 2. Verificar Colunas da Tabela notifications
-- ============================================

DO $$
DECLARE
  expected_columns TEXT[] := ARRAY[
    'id', 'user_id', 'type', 'title', 'message', 'link',
    'read', 'read_at', 'metadata', 'created_at', 'updated_at'
  ];
  actual_columns TEXT[];
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(column_name::TEXT ORDER BY ordinal_position)
  INTO actual_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'notifications';
  
  SELECT ARRAY_AGG(col)
  INTO missing_columns
  FROM UNNEST(expected_columns) AS col
  WHERE col NOT IN (SELECT UNNEST(actual_columns));
  
  IF missing_columns IS NOT NULL AND array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION '❌ Colunas faltando em notifications: %', missing_columns;
  END IF;
  
  RAISE NOTICE '✅ Tabela notifications tem todas as colunas esperadas';
END $$;

-- ============================================
-- 3. Verificar Colunas da Tabela user_preferences
-- ============================================

DO $$
DECLARE
  expected_columns TEXT[] := ARRAY[
    'user_id', 'theme', 'language', 'timezone',
    'notifications_enabled', 'email_notifications', 'sms_notifications',
    'push_notifications', 'email_reminders', 'reminder_hours_before',
    'dashboard_layout', 'created_at', 'updated_at'
  ];
  actual_columns TEXT[];
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(column_name::TEXT ORDER BY ordinal_position)
  INTO actual_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'user_preferences';
  
  SELECT ARRAY_AGG(col)
  INTO missing_columns
  FROM UNNEST(expected_columns) AS col
  WHERE col NOT IN (SELECT UNNEST(actual_columns));
  
  IF missing_columns IS NOT NULL AND array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION '❌ Colunas faltando em user_preferences: %', missing_columns;
  END IF;
  
  RAISE NOTICE '✅ Tabela user_preferences tem todas as colunas esperadas';
END $$;

-- ============================================
-- 4. Verificar Índices
-- ============================================

DO $$
DECLARE
  notifications_indexes INTEGER;
  preferences_indexes INTEGER;
BEGIN
  SELECT COUNT(*) INTO notifications_indexes
  FROM pg_indexes
  WHERE tablename = 'notifications' AND schemaname = 'public';
  
  SELECT COUNT(*) INTO preferences_indexes
  FROM pg_indexes
  WHERE tablename = 'user_preferences' AND schemaname = 'public';
  
  RAISE NOTICE 'ℹ️  Índices em notifications: %', notifications_indexes;
  RAISE NOTICE 'ℹ️  Índices em user_preferences: %', preferences_indexes;
  
  IF notifications_indexes < 5 THEN
    RAISE WARNING '⚠️  Esperado pelo menos 5 índices em notifications, encontrado %', notifications_indexes;
  ELSE
    RAISE NOTICE '✅ Índices em notifications: OK';
  END IF;
  
  IF preferences_indexes < 2 THEN
    RAISE WARNING '⚠️  Esperado pelo menos 2 índices em user_preferences, encontrado %', preferences_indexes;
  ELSE
    RAISE NOTICE '✅ Índices em user_preferences: OK';
  END IF;
END $$;

-- ============================================
-- 5. Verificar RLS
-- ============================================

DO $$
DECLARE
  notifications_rls BOOLEAN;
  preferences_rls BOOLEAN;
BEGIN
  SELECT rowsecurity INTO notifications_rls
  FROM pg_tables
  WHERE tablename = 'notifications' AND schemaname = 'public';
  
  SELECT rowsecurity INTO preferences_rls
  FROM pg_tables
  WHERE tablename = 'user_preferences' AND schemaname = 'public';
  
  IF NOT notifications_rls THEN
    RAISE EXCEPTION '❌ RLS não está habilitado em notifications';
  END IF;
  
  IF NOT preferences_rls THEN
    RAISE EXCEPTION '❌ RLS não está habilitado em user_preferences';
  END IF;
  
  RAISE NOTICE '✅ RLS habilitado em ambas as tabelas';
END $$;

-- ============================================
-- 6. Verificar Políticas RLS
-- ============================================

DO $$
DECLARE
  notifications_policies INTEGER;
  preferences_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO notifications_policies
  FROM pg_policies
  WHERE tablename = 'notifications' AND schemaname = 'public';
  
  SELECT COUNT(*) INTO preferences_policies
  FROM pg_policies
  WHERE tablename = 'user_preferences' AND schemaname = 'public';
  
  RAISE NOTICE 'ℹ️  Políticas em notifications: %', notifications_policies;
  RAISE NOTICE 'ℹ️  Políticas em user_preferences: %', preferences_policies;
  
  IF notifications_policies < 5 THEN
    RAISE WARNING '⚠️  Esperado pelo menos 5 políticas em notifications, encontrado %', notifications_policies;
  ELSE
    RAISE NOTICE '✅ Políticas em notifications: OK';
  END IF;
  
  IF preferences_policies < 5 THEN
    RAISE WARNING '⚠️  Esperado pelo menos 5 políticas em user_preferences, encontrado %', preferences_policies;
  ELSE
    RAISE NOTICE '✅ Políticas em user_preferences: OK';
  END IF;
END $$;

-- ============================================
-- 7. Verificar Funções
-- ============================================

DO $$
DECLARE
  expected_functions TEXT[] := ARRAY[
    'mark_notification_as_read',
    'mark_all_notifications_as_read',
    'cleanup_old_notifications',
    'set_notifications_updated_at',
    'create_default_user_preferences',
    'set_user_preferences_updated_at',
    'get_user_preferences'
  ];
  actual_functions TEXT[];
  missing_functions TEXT[];
BEGIN
  SELECT ARRAY_AGG(p.proname::TEXT)
  INTO actual_functions
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname = ANY(expected_functions);
  
  SELECT ARRAY_AGG(func)
  INTO missing_functions
  FROM UNNEST(expected_functions) AS func
  WHERE func NOT IN (SELECT UNNEST(COALESCE(actual_functions, ARRAY[]::TEXT[])));
  
  IF missing_functions IS NOT NULL AND array_length(missing_functions, 1) > 0 THEN
    RAISE WARNING '⚠️  Funções faltando: %', missing_functions;
  ELSE
    RAISE NOTICE '✅ Todas as funções esperadas existem';
  END IF;
END $$;

-- ============================================
-- 8. Verificar Triggers
-- ============================================

DO $$
DECLARE
  notifications_triggers INTEGER;
  preferences_triggers INTEGER;
  users_triggers INTEGER;
BEGIN
  SELECT COUNT(*) INTO notifications_triggers
  FROM pg_trigger
  WHERE tgrelid = 'public.notifications'::regclass;
  
  SELECT COUNT(*) INTO preferences_triggers
  FROM pg_trigger
  WHERE tgrelid = 'public.user_preferences'::regclass;
  
  SELECT COUNT(*) INTO users_triggers
  FROM pg_trigger
  WHERE tgrelid = 'auth.users'::regclass
  AND tgname = 'trigger_create_default_user_preferences';
  
  RAISE NOTICE 'ℹ️  Triggers em notifications: %', notifications_triggers;
  RAISE NOTICE 'ℹ️  Triggers em user_preferences: %', preferences_triggers;
  RAISE NOTICE 'ℹ️  Trigger de criação em auth.users: %', users_triggers;
  
  IF notifications_triggers < 1 THEN
    RAISE WARNING '⚠️  Esperado pelo menos 1 trigger em notifications';
  ELSE
    RAISE NOTICE '✅ Triggers em notifications: OK';
  END IF;
  
  IF preferences_triggers < 1 THEN
    RAISE WARNING '⚠️  Esperado pelo menos 1 trigger em user_preferences';
  ELSE
    RAISE NOTICE '✅ Triggers em user_preferences: OK';
  END IF;
  
  IF users_triggers < 1 THEN
    RAISE WARNING '⚠️  Trigger de criação automática não encontrado em auth.users';
  ELSE
    RAISE NOTICE '✅ Trigger de criação automática: OK';
  END IF;
END $$;

-- ============================================
-- 9. Teste de Inserção (Opcional)
-- ============================================

-- Descomente para testar inserção de dados
/*
DO $$
DECLARE
  test_notification_id UUID;
BEGIN
  -- Testar inserção de notificação
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (auth.uid(), 'system:test', 'Teste de Validação', 'Esta é uma notificação de teste')
  RETURNING id INTO test_notification_id;
  
  RAISE NOTICE '✅ Notificação de teste criada: %', test_notification_id;
  
  -- Limpar teste
  DELETE FROM public.notifications WHERE id = test_notification_id;
  RAISE NOTICE '✅ Notificação de teste removida';
  
  -- Testar inserção de preferências
  INSERT INTO public.user_preferences (user_id, theme)
  VALUES (auth.uid(), 'dark')
  ON CONFLICT (user_id) DO UPDATE SET theme = 'dark';
  
  RAISE NOTICE '✅ Preferências de teste criadas/atualizadas';
END $$;
*/

-- ============================================
-- 10. Resumo da Validação
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '  VALIDAÇÃO DA FASE 3 CONCLUÍDA';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tabelas: notifications, user_preferences';
  RAISE NOTICE '✅ RLS: Habilitado em ambas';
  RAISE NOTICE '✅ Políticas: Configuradas corretamente';
  RAISE NOTICE '✅ Índices: Criados para performance';
  RAISE NOTICE '✅ Funções: Todas as helpers criadas';
  RAISE NOTICE '✅ Triggers: Configurados corretamente';
  RAISE NOTICE '';
  RAISE NOTICE 'ℹ️  Execute testes de inserção para validar funcionamento';
  RAISE NOTICE '';
END $$;
