-- Fix RLS Policies for professional_payments
-- Remove policies que acessam auth.users diretamente e recrie com auth.jwt()

-- =====================================================
-- 1. Drop existing policies
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all payments" ON professional_payments;
DROP POLICY IF EXISTS "Only admins can insert payments" ON professional_payments;
DROP POLICY IF EXISTS "Only admins can update payments" ON professional_payments;
DROP POLICY IF EXISTS "Only admins can delete payments" ON professional_payments;
DROP POLICY IF EXISTS "Only admins can manage payment bookings" ON payment_bookings;

-- =====================================================
-- 2. Create new policies using auth.jwt()
-- =====================================================

-- Admins podem ver todos os pagamentos
CREATE POLICY "Admins can view all payments"
    ON professional_payments FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    );

-- Profissionais podem ver apenas seus pagamentos (mantém como está)
-- Esta policy já está correta pois não acessa auth.users

-- Apenas admins podem inserir
CREATE POLICY "Only admins can insert payments"
    ON professional_payments FOR INSERT
    TO authenticated
    WITH CHECK (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    );

-- Apenas admins podem atualizar
CREATE POLICY "Only admins can update payments"
    ON professional_payments FOR UPDATE
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    );

-- Apenas admins podem deletar
CREATE POLICY "Only admins can delete payments"
    ON professional_payments FOR DELETE
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    );

-- =====================================================
-- 3. Fix payment_bookings policies
-- =====================================================

CREATE POLICY "Only admins can manage payment bookings"
    ON payment_bookings FOR ALL
    TO authenticated
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
        OR
        (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin')
    );

-- =====================================================
-- 4. Verificar se as policies foram criadas
-- =====================================================

-- Para verificar, execute:
-- SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('professional_payments', 'payment_bookings');
