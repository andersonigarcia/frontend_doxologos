-- Rollback Migration: Remove Financial Split Support for Events
-- Description: Removes event_financial_splits table and related fields
-- Author: System
-- Date: 2026-02-01

-- =====================================================
-- ROLLBACK PART 6: Drop Trigger
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_event_splits_timestamp ON event_financial_splits;
DROP FUNCTION IF EXISTS update_event_splits_updated_at();

-- =====================================================
-- ROLLBACK PART 5: Drop RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all splits" ON event_financial_splits;
DROP POLICY IF EXISTS "Professionals can view their own splits" ON event_financial_splits;
DROP POLICY IF EXISTS "Only system can insert splits" ON event_financial_splits;

-- =====================================================
-- ROLLBACK PART 4: Drop View
-- =====================================================

DROP VIEW IF EXISTS event_financial_report;

-- =====================================================
-- ROLLBACK PART 3: Drop Function
-- =====================================================

DROP FUNCTION IF EXISTS calculate_event_split(UUID, DECIMAL);

-- =====================================================
-- ROLLBACK PART 2: Drop Table
-- =====================================================

DROP TABLE IF EXISTS event_financial_splits CASCADE;

-- =====================================================
-- ROLLBACK PART 1: Remove Columns from eventos
-- =====================================================

ALTER TABLE eventos
DROP COLUMN IF EXISTS professional_id CASCADE,
DROP COLUMN IF EXISTS split_type CASCADE,
DROP COLUMN IF EXISTS split_value CASCADE,
DROP COLUMN IF EXISTS platform_fee_type CASCADE,
DROP COLUMN IF EXISTS platform_fee_value CASCADE;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Rollback completed successfully!';
    RAISE NOTICE '   - Removed event_financial_splits table';
    RAISE NOTICE '   - Removed split fields from eventos';
    RAISE NOTICE '   - Removed all related functions and views';
END $$;
