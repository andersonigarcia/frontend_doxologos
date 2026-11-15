-- Migration: Add CRP to professionals

ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS crp TEXT;
