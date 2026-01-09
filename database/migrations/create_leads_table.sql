-- Migration: Create Leads Table for Lead Magnet Tracking
-- Description: Stores all leads captured through various lead magnets (quiz, checklist, guides, etc.)
-- Author: Doxologos Team
-- Date: 2026-01-08

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  lead_magnet_type TEXT NOT NULL, -- 'anxiety_guide', 'therapy_quiz', 'mental_health_checklist', etc.
  source_page TEXT, -- URL da página de captura
  metadata JSONB DEFAULT '{}', -- Dados adicionais (respostas do quiz, preferências, etc.)
  converted_to_booking BOOLEAN DEFAULT FALSE,
  booking_id UUID REFERENCES bookings(id), -- Referência ao agendamento se convertido
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_magnet_type ON leads(lead_magnet_type);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_converted ON leads(converted_to_booking);
CREATE INDEX IF NOT EXISTS idx_leads_source_page ON leads(source_page);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Enable Row Level-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone (including anonymous users) can insert leads
CREATE POLICY "Anyone can insert leads"
  ON leads
  FOR INSERT
  TO anon, authenticated  -- Allow both anonymous and authenticated users
  WITH CHECK (true);  -- No restrictions on insert

-- RLS Policy: Admins can view all leads
CREATE POLICY "Admins can view all leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_public
      WHERE users_public.id = auth.uid()
      AND users_public.role = 'admin'
    )
  );

-- RLS Policy: Admins can update leads (e.g., mark as converted)
CREATE POLICY "Admins can update leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_public
      WHERE users_public.id = auth.uid()
      AND users_public.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_public
      WHERE users_public.id = auth.uid()
      AND users_public.role = 'admin'
    )
  );

-- RLS Policy: Admins can delete leads (if needed for GDPR compliance)
CREATE POLICY "Admins can delete leads"
  ON leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users_public
      WHERE users_public.id = auth.uid()
      AND users_public.role = 'admin'
    )
  );

-- Create view for lead analytics (admin only)
CREATE OR REPLACE VIEW lead_analytics AS
SELECT 
  lead_magnet_type,
  COUNT(*) as total_leads,
  COUNT(CASE WHEN converted_to_booking THEN 1 END) as converted_leads,
  ROUND(
    COUNT(CASE WHEN converted_to_booking THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*)::NUMERIC, 0) * 100, 
    2
  ) as conversion_rate,
  source_page,
  DATE_TRUNC('day', created_at) as date
FROM leads
GROUP BY lead_magnet_type, source_page, DATE_TRUNC('day', created_at)
ORDER BY date DESC, total_leads DESC;

-- Grant access to view for authenticated users
GRANT SELECT ON lead_analytics TO authenticated;

-- Comments for documentation
COMMENT ON TABLE leads IS 'Stores all leads captured through lead magnets (guides, quizzes, checklists, etc.)';
COMMENT ON COLUMN leads.lead_magnet_type IS 'Type of lead magnet: anxiety_guide, therapy_quiz, mental_health_checklist, etc.';
COMMENT ON COLUMN leads.source_page IS 'URL of the page where the lead was captured';
COMMENT ON COLUMN leads.metadata IS 'Additional data like quiz answers, preferences, UTM parameters, etc.';
COMMENT ON COLUMN leads.converted_to_booking IS 'Flag indicating if this lead converted to a booking';
COMMENT ON COLUMN leads.booking_id IS 'Reference to the booking if converted';
