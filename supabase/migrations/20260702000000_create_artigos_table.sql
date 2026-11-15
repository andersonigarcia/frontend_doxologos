-- Migration: Create artigos table for Substack integration
-- Creates the table and sets up RLS policies so public can read and admins can manage

CREATE TABLE IF NOT EXISTS public.artigos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    slug text UNIQUE NOT NULL,
    title text NOT NULL,
    description text,
    content_html text NOT NULL,
    cover_image_url text,
    published_at timestamp with time zone,
    author text,
    status text DEFAULT 'published',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.artigos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published artigos" ON public.artigos;
DROP POLICY IF EXISTS "Admins can manage artigos" ON public.artigos;

-- Public can read published articles
CREATE POLICY "Public can view published artigos" ON public.artigos
    FOR SELECT USING (status = 'published');


-- Admins can manage articles (Insert/Update/Delete)
CREATE POLICY "Admins can manage artigos" ON public.artigos
    FOR ALL
    USING (
        (auth.jwt() ->> 'role') = 'admin' OR 
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    )
    WITH CHECK (
        (auth.jwt() ->> 'role') = 'admin' OR 
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );
