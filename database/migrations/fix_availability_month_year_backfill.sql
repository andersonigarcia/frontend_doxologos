-- Migration: Backfill month/year for existing availability records
-- Purpose: Preserve existing availability data by setting appropriate month/year values
-- Date: 2026-01-04

-- Step 1: Check current state of availability table
DO $$
DECLARE
    records_without_month_year INTEGER;
BEGIN
    SELECT COUNT(*) INTO records_without_month_year
    FROM availability
    WHERE month IS NULL OR year IS NULL;
    
    RAISE NOTICE 'Found % records without month/year values', records_without_month_year;
END $$;

-- Step 2: For records without month/year, set them to current month/year
-- This assumes existing availability should apply to the current period
UPDATE availability
SET 
    month = COALESCE(month, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER),
    year = COALESCE(year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
WHERE month IS NULL OR year IS NULL;

-- Step 3: Verify the update
DO $$
DECLARE
    total_records INTEGER;
    records_with_month_year INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records FROM availability;
    SELECT COUNT(*) INTO records_with_month_year 
    FROM availability 
    WHERE month IS NOT NULL AND year IS NOT NULL;
    
    RAISE NOTICE 'Total records: %, Records with month/year: %', total_records, records_with_month_year;
    
    IF total_records != records_with_month_year THEN
        RAISE EXCEPTION 'Migration failed: Not all records have month/year values';
    END IF;
END $$;

-- Step 4: Ensure constraints are in place
-- Drop old constraint if it exists
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_professional_id_day_of_week_key;

-- Add new constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'availability_professional_id_day_month_year_key'
    ) THEN
        ALTER TABLE availability 
        ADD CONSTRAINT availability_professional_id_day_month_year_key 
        UNIQUE(professional_id, day_of_week, month, year);
        RAISE NOTICE 'Created unique constraint on (professional_id, day_of_week, month, year)';
    ELSE
        RAISE NOTICE 'Constraint already exists';
    END IF;
END $$;

-- Step 5: Display sample of migrated data
SELECT 
    professional_id,
    day_of_week,
    month,
    year,
    array_length(available_times, 1) as num_time_slots,
    available_times
FROM availability
ORDER BY professional_id, year, month, day_of_week
LIMIT 10;

-- Step 6: Summary statistics
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT professional_id) as num_professionals,
    COUNT(DISTINCT (year, month)) as num_month_year_combinations,
    MIN(year) as earliest_year,
    MAX(year) as latest_year
FROM availability;
