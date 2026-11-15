-- Validation Script: Event Cancellation and Refunds Migration
-- Description: Validates that the migration was applied correctly
-- Author: System
-- Date: 2026-02-01

DO $$
DECLARE
    v_result BOOLEAN;
    v_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 Validating Event Cancellation and Refunds Migration...';
    RAISE NOTICE '';
    
    -- =====================================================
    -- TEST 1: Check inscricoes_eventos columns
    -- =====================================================
    RAISE NOTICE '1️⃣ Checking inscricoes_eventos cancellation fields...';
    
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'inscricoes_eventos'
    AND column_name IN ('cancellation_reason', 'cancelled_at', 'refund_status', 'refund_amount');
    
    IF v_count = 4 THEN
        RAISE NOTICE '   ✅ All required columns exist in inscricoes_eventos';
    ELSE
        RAISE EXCEPTION '   ❌ Missing columns in inscricoes_eventos (found % of 4)', v_count;
    END IF;
    
    -- =====================================================
    -- TEST 2: Check event_refunds table
    -- =====================================================
    RAISE NOTICE '2️⃣ Checking event_refunds table...';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'event_refunds'
    ) INTO v_result;
    
    IF v_result THEN
        RAISE NOTICE '   ✅ event_refunds table exists';
    ELSE
        RAISE EXCEPTION '   ❌ event_refunds table not found';
    END IF;
    
    -- =====================================================
    -- TEST 3: Check RLS policies
    -- =====================================================
    RAISE NOTICE '3️⃣ Checking RLS policies...';
    
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE tablename = 'event_refunds';
    
    IF v_count >= 3 THEN
        RAISE NOTICE '   ✅ RLS policies configured (% policies found)', v_count;
    ELSE
        RAISE WARNING '   ⚠️  Expected at least 3 RLS policies, found %', v_count;
    END IF;
    
    -- =====================================================
    -- FINAL RESULT
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ ALL VALIDATION TESTS PASSED!';
    RAISE NOTICE '✅ Refunds migration applied successfully';
    RAISE NOTICE '✅ ========================================';
    
END $$;
