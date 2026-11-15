-- Migration: Create professional_applications table and resumes storage bucket

-- 1. Create enum for application status if it doesn't exist
DO $$ BEGIN
    CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create the professional_applications table
CREATE TABLE IF NOT EXISTS public.professional_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    crp TEXT NOT NULL,
    cpf_cnpj TEXT,
    specialty TEXT NOT NULL,
    experience TEXT NOT NULL,
    message TEXT,
    resume_url TEXT,
    status application_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.professional_applications ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for professional_applications
-- Anyone (anon and authenticated) can insert applications
DROP POLICY IF EXISTS "Anon can insert professional applications" ON public.professional_applications;
DROP POLICY IF EXISTS "Anyone can insert professional applications" ON public.professional_applications;
CREATE POLICY "Anyone can insert professional applications"
    ON public.professional_applications FOR INSERT
    TO public
    WITH CHECK (true);

-- Admins can view and update
DROP POLICY IF EXISTS "Admins can view professional applications" ON public.professional_applications;
CREATE POLICY "Admins can view professional applications"
    ON public.professional_applications FOR SELECT
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') = 'admin' OR 
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

DROP POLICY IF EXISTS "Admins can update professional applications" ON public.professional_applications;
CREATE POLICY "Admins can update professional applications"
    ON public.professional_applications FOR UPDATE
    TO authenticated
    USING (
        (auth.jwt() ->> 'role') = 'admin' OR 
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );


-- 5. Create Storage Bucket for Resumes
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Storage Policies
-- Anyone can upload resumes
DROP POLICY IF EXISTS "Anon can upload resumes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload resumes" ON storage.objects;
CREATE POLICY "Anyone can upload resumes" 
    ON storage.objects FOR INSERT 
    TO public 
    WITH CHECK (bucket_id = 'resumes');

-- Admins can view resumes
DROP POLICY IF EXISTS "Admins can view resumes" ON storage.objects;
CREATE POLICY "Admins can view resumes" 
    ON storage.objects FOR SELECT 
    TO authenticated 
    USING (
        bucket_id = 'resumes' AND (
            (auth.jwt() ->> 'role') = 'admin' OR 
            (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        )
    );
