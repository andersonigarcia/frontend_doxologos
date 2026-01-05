-- ============================================
-- Migração: Tabela de Preferências de Usuário
-- Data: 2025-12-20
-- Fase: 3 - Migrações de Banco de Dados
-- ============================================

-- Descrição:
-- Cria tabela para armazenar preferências e configurações do usuário
-- Inclui políticas RLS, triggers e função de criação automática

-- ============================================
-- 1. Criar tabela de preferências
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Aparência
  theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language VARCHAR(10) DEFAULT 'pt-BR',
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  
  -- Notificações
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  push_notifications BOOLEAN DEFAULT TRUE,
  
  -- Lembretes
  email_reminders BOOLEAN DEFAULT TRUE,
  reminder_hours_before INTEGER DEFAULT 24 CHECK (reminder_hours_before >= 1 AND reminder_hours_before <= 168),
  
  -- Personalização
  dashboard_layout JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE public.user_preferences IS 'Preferências e configurações personalizadas do usuário';

COMMENT ON COLUMN public.user_preferences.user_id IS 'ID do usuário (chave primária)';
COMMENT ON COLUMN public.user_preferences.theme IS 'Tema da interface (light, dark, auto)';
COMMENT ON COLUMN public.user_preferences.language IS 'Idioma preferido (pt-BR, en-US)';
COMMENT ON COLUMN public.user_preferences.timezone IS 'Fuso horário do usuário';
COMMENT ON COLUMN public.user_preferences.notifications_enabled IS 'Se notificações estão habilitadas';
COMMENT ON COLUMN public.user_preferences.email_notifications IS 'Se deve receber notificações por email';
COMMENT ON COLUMN public.user_preferences.sms_notifications IS 'Se deve receber notificações por SMS';
COMMENT ON COLUMN public.user_preferences.push_notifications IS 'Se deve receber notificações push';
COMMENT ON COLUMN public.user_preferences.email_reminders IS 'Se deve receber lembretes por email';
COMMENT ON COLUMN public.user_preferences.reminder_hours_before IS 'Horas antes da consulta para enviar lembrete (1-168)';
COMMENT ON COLUMN public.user_preferences.dashboard_layout IS 'Layout personalizado do dashboard em JSON';

-- ============================================
-- 2. Criar índices
-- ============================================

-- Índice por idioma (para queries de usuários por idioma)
CREATE INDEX IF NOT EXISTS idx_user_preferences_language 
ON public.user_preferences(language);

-- Índice por tema
CREATE INDEX IF NOT EXISTS idx_user_preferences_theme 
ON public.user_preferences(theme);

-- ============================================
-- 3. Criar função de atualização de timestamp
-- ============================================

CREATE OR REPLACE FUNCTION public.set_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Criar trigger de atualização
-- ============================================

DROP TRIGGER IF EXISTS trigger_set_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER trigger_set_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_preferences_updated_at();

-- ============================================
-- 5. Criar função para criar preferências padrão
-- ============================================

CREATE OR REPLACE FUNCTION public.create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_default_user_preferences() IS 'Cria preferências padrão automaticamente ao criar novo usuário';

-- ============================================
-- 6. Criar trigger para criar preferências ao criar usuário
-- ============================================

DROP TRIGGER IF EXISTS trigger_create_default_user_preferences ON auth.users;
CREATE TRIGGER trigger_create_default_user_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_user_preferences();

-- ============================================
-- 7. Habilitar Row Level Security (RLS)
-- ============================================

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. Criar políticas RLS
-- ============================================

-- Política: Usuários podem ver apenas suas próprias preferências
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT
  USING (user_id = auth.uid());

-- Política: Usuários podem inserir apenas suas próprias preferências
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Política: Usuários podem atualizar apenas suas próprias preferências
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Política: Usuários podem deletar apenas suas próprias preferências
DROP POLICY IF EXISTS "Users can delete own preferences" ON public.user_preferences;
CREATE POLICY "Users can delete own preferences" ON public.user_preferences
  FOR DELETE
  USING (user_id = auth.uid());

-- Política: Admins podem ver todas as preferências
DROP POLICY IF EXISTS "Admins can view all preferences" ON public.user_preferences;
CREATE POLICY "Admins can view all preferences" ON public.user_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================
-- 9. Criar função helper para obter preferências
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_preferences()
RETURNS TABLE (
  theme VARCHAR(20),
  language VARCHAR(10),
  timezone VARCHAR(50),
  notifications_enabled BOOLEAN,
  email_notifications BOOLEAN,
  sms_notifications BOOLEAN,
  push_notifications BOOLEAN,
  email_reminders BOOLEAN,
  reminder_hours_before INTEGER,
  dashboard_layout JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.theme,
    p.language,
    p.timezone,
    p.notifications_enabled,
    p.email_notifications,
    p.sms_notifications,
    p.push_notifications,
    p.email_reminders,
    p.reminder_hours_before,
    p.dashboard_layout
  FROM public.user_preferences p
  WHERE p.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_preferences() IS 'Retorna as preferências do usuário atual';

-- ============================================
-- 10. Validação da migração
-- ============================================

-- Verificar que tabela foi criada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_preferences'
  ) THEN
    RAISE EXCEPTION 'Tabela user_preferences não foi criada';
  END IF;
  
  RAISE NOTICE '✅ Tabela user_preferences criada com sucesso';
END $$;

-- Verificar constraints
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_name = 'user_preferences'
  AND constraint_type = 'CHECK';
  
  IF constraint_count < 2 THEN
    RAISE WARNING 'Esperado 2 constraints CHECK, encontrado %', constraint_count;
  ELSE
    RAISE NOTICE '✅ % constraints CHECK criados com sucesso', constraint_count;
  END IF;
END $$;

-- Verificar RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'user_preferences'
    AND schemaname = 'public'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS não está habilitado na tabela user_preferences';
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
  WHERE tablename = 'user_preferences'
  AND schemaname = 'public';
  
  IF policy_count < 5 THEN
    RAISE WARNING 'Esperado 5 políticas, encontrado %', policy_count;
  ELSE
    RAISE NOTICE '✅ % políticas RLS criadas com sucesso', policy_count;
  END IF;
END $$;

-- ============================================
-- 11. Criar preferências para usuários existentes
-- ============================================

-- Criar preferências padrão para todos os usuários que ainda não têm
INSERT INTO public.user_preferences (user_id)
SELECT id
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- Verificar quantos usuários receberam preferências
DO $$
DECLARE
  users_count INTEGER;
  prefs_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_count FROM auth.users;
  SELECT COUNT(*) INTO prefs_count FROM public.user_preferences;
  
  RAISE NOTICE '✅ Preferências criadas: % usuários têm preferências de % total', prefs_count, users_count;
END $$;

-- ============================================
-- Migração concluída com sucesso!
-- ============================================

RAISE NOTICE '✅ Migração add_user_preferences_table concluída com sucesso!';
