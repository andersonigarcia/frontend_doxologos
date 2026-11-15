-- Validation Script: Event Financial Splits Migration
-- Description: Validates that the migration was applied correctly
-- Author: System
-- Date: 2026-02-01

DO $$
DECLARE
    v_result BOOLEAN;
    v_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 Validating Event Financial Splits Migration...';
    RAISE NOTICE '';
    
    -- =====================================================
    -- TEST 1: Check eventos table columns
    -- =====================================================
    RAISE NOTICE '1️⃣ Checking eventos table columns...';
    
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'eventos'
    AND column_name IN ('professional_id', 'platform_fee_type', 'platform_fee_value');
    
    IF v_count = 3 THEN
        RAISE NOTICE '   ✅ All required columns exist in eventos table';
    ELSE
        RAISE EXCEPTION '   ❌ Missing columns in eventos table (found % of 3)', v_count;
    END IF;
    
    -- =====================================================
    -- TEST 2: Check event_financial_splits table
    -- =====================================================
    RAISE NOTICE '2️⃣ Checking event_financial_splits table...';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'event_financial_splits'
    ) INTO v_result;
    
    IF v_result THEN
        RAISE NOTICE '   ✅ event_financial_splits table exists';
    ELSE
        RAISE EXCEPTION '   ❌ event_financial_splits table not found';
    END IF;
    
    -- =====================================================
    -- TEST 3: Check calculate_event_split function
    -- =====================================================
    RAISE NOTICE '3️⃣ Checking calculate_event_split function...';
    
    SELECT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'calculate_event_split'
    ) INTO v_result;
    
    IF v_result THEN
        RAISE NOTICE '   ✅ calculate_event_split function exists';
    ELSE
        RAISE EXCEPTION '   ❌ calculate_event_split function not found';
    END IF;
    
    -- =====================================================
    -- TEST 4: Check event_financial_report view
    -- =====================================================
    RAISE NOTICE '4️⃣ Checking event_financial_report view...';
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_name = 'event_financial_report'
    ) INTO v_result;
    
    IF v_result THEN
        RAISE NOTICE '   ✅ event_financial_report view exists';
    ELSE
        RAISE EXCEPTION '   ❌ event_financial_report view not found';
    END IF;
    
    -- =====================================================
    -- TEST 5: Check RLS policies
    -- =====================================================
    RAISE NOTICE '5️⃣ Checking RLS policies...';
    
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE tablename = 'event_financial_splits';
    
    IF v_count >= 2 THEN
        RAISE NOTICE '   ✅ RLS policies configured (% policies found)', v_count;
    ELSE
        RAISE WARNING '   ⚠️  Expected at least 2 RLS policies, found %', v_count;
    END IF;
    
    -- =====================================================
    -- TEST 6: Test split calculation function
    -- =====================================================
    RAISE NOTICE '6️⃣ Testing split calculation function...';
    
    -- Create a test event if needed
    INSERT INTO eventos (titulo, descricao, data_inicio, data_fim, valor, platform_fee_type, platform_fee_value, limite_participantes, data_limite_inscricao, link_slug)
    VALUES ('TEST_EVENT_VALIDATION', 'Test', NOW() + INTERVAL '1 day', NOW() + INTERVAL '2 days', 100.00, 'percentage', 20.00, 10, NOW() + INTERVAL '23 hours', 'test-event-validation-' || EXTRACT(EPOCH FROM NOW())::TEXT)
    ON CONFLICT DO NOTHING;
    
    -- Test the function
    DECLARE
        v_test_evento_id UUID;
        v_platform_amt DECIMAL;
        v_professional_amt DECIMAL;
        v_calc_details JSONB;
    BEGIN
        SELECT id INTO v_test_evento_id FROM eventos WHERE titulo = 'TEST_EVENT_VALIDATION' LIMIT 1;
        
        SELECT platform_amount, professional_amount, calculation_details
        INTO v_platform_amt, v_professional_amt, v_calc_details
        FROM calculate_event_split(v_test_evento_id, 100.00);
        
        IF v_platform_amt = 20.00 AND v_professional_amt = 80.00 THEN
            RAISE NOTICE '   ✅ Split calculation correct (20%% = R$ 20.00 platform, R$ 80.00 professional)';
        ELSE
            RAISE EXCEPTION '   ❌ Split calculation incorrect (got platform: %, professional: %)', 
                v_platform_amt, v_professional_amt;
        END IF;
        
        -- Cleanup test event
        DELETE FROM eventos WHERE titulo = 'TEST_EVENT_VALIDATION';
    END;
    
    -- =====================================================
    -- FINAL RESULT
    -- =====================================================
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ ALL VALIDATION TESTS PASSED!';
    RAISE NOTICE '✅ Migration applied successfully';
    RAISE NOTICE '✅ ========================================';
    
END $$;
