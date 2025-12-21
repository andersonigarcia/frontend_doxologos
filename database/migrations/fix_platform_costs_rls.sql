-- Fix RLS Policies for platform_costs
-- Remove policies que acessam auth.users diretamente e recrie com auth.jwt()

-- =====================================================
-- 1. Drop existing policies
-- =====================================================

DROP POLICY IF EXISTS "Only admins can view costs" ON platform_costs;
DROP POLICY IF EXISTS "Only admins can insert costs" ON platform_costs;
DROP POLICY IF EXISTS "Only admins can update costs" ON platform_costs;
DROP POLICY IF EXISTS "Only admins can delete costs" ON platform_costs;

-- =====================================================
-- 2. Create new policies using auth.jwt()
-- =====================================================

-- Apenas admins podem ver custos
CREATE POLICY "Only admins can view costs"
    ON platform_costs FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    );

-- Apenas admins podem inserir
CREATE POLICY "Only admins can insert costs"
    ON platform_costs FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    );

-- Apenas admins podem atualizar
CREATE POLICY "Only admins can update costs"
    ON platform_costs FOR UPDATE
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    );

-- Apenas admins podem deletar
CREATE POLICY "Only admins can delete costs"
    ON platform_costs FOR DELETE
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    );

-- =====================================================
-- 3. Verificar se as policies foram criadas
-- =====================================================

-- Para verificar, execute:
-- SELECT policyname, tablename FROM pg_policies WHERE tablename = 'platform_costs';
