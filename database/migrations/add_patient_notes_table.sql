-- Migration: Add patient_notes table for professional notes about patients
-- Created: 2025-12-20
-- Purpose: Allow professionals to store private notes about their patients

-- Create patient_notes table
CREATE TABLE IF NOT EXISTS patient_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  patient_email TEXT NOT NULL,
  patient_name TEXT,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one note record per professional-patient pair
  CONSTRAINT unique_professional_patient UNIQUE (professional_id, patient_email)
);

-- Create index for fast lookups by professional and patient
CREATE INDEX IF NOT EXISTS idx_patient_notes_professional_patient 
  ON patient_notes(professional_id, patient_email);

-- Create index for searching by patient email
CREATE INDEX IF NOT EXISTS idx_patient_notes_patient_email 
  ON patient_notes(patient_email);

-- Enable Row Level Security
ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Professionals can view their own patient notes" ON patient_notes;
DROP POLICY IF EXISTS "Professionals can insert their own patient notes" ON patient_notes;
DROP POLICY IF EXISTS "Professionals can update their own patient notes" ON patient_notes;
DROP POLICY IF EXISTS "Professionals can delete their own patient notes" ON patient_notes;

-- RLS Policy: Professionals can only view their own notes
CREATE POLICY "Professionals can view their own patient notes"
  ON patient_notes FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Professionals can only insert notes for themselves
CREATE POLICY "Professionals can insert their own patient notes"
  ON patient_notes FOR INSERT
  WITH CHECK (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Professionals can only update their own notes
CREATE POLICY "Professionals can update their own patient notes"
  ON patient_notes FOR UPDATE
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Professionals can only delete their own notes
CREATE POLICY "Professionals can delete their own patient notes"
  ON patient_notes FOR DELETE
  USING (
    professional_id IN (
      SELECT id FROM professionals WHERE user_id = auth.uid()
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_patient_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
DROP TRIGGER IF EXISTS trigger_update_patient_notes_updated_at ON patient_notes;
CREATE TRIGGER trigger_update_patient_notes_updated_at
  BEFORE UPDATE ON patient_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_notes_updated_at();

-- Add comment to table
COMMENT ON TABLE patient_notes IS 'Stores professional notes about their patients';
COMMENT ON COLUMN patient_notes.professional_id IS 'Reference to the professional who created the note';
COMMENT ON COLUMN patient_notes.patient_email IS 'Patient email used as identifier';
COMMENT ON COLUMN patient_notes.patient_name IS 'Patient name for reference (may change)';
COMMENT ON COLUMN patient_notes.notes IS 'Professional notes about the patient';
