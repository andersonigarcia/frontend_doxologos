-- Migration: Add status to professionals

DO $$ BEGIN
    CREATE TYPE professional_status AS ENUM ('active', 'suspended', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS status professional_status DEFAULT 'active';
