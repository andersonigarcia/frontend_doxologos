-- Migration: Add whatsapp and phone columns to professionals table
-- Date: 2026-08-13

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'professionals' AND column_name = 'whatsapp'
    ) THEN
        ALTER TABLE professionals ADD COLUMN whatsapp TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'professionals' AND column_name = 'phone'
    ) THEN
        ALTER TABLE professionals ADD COLUMN phone TEXT;
    END IF;
END $$;
