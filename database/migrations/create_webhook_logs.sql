-- Create webhook_logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) DEFAULT 'mercadopago',
    payload JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20), -- 'success', 'error', 'ignored'
    error_message TEXT,
    signature VARCHAR(255),
    event_id VARCHAR(100)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON webhook_logs(processed_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON webhook_logs(provider);

-- Enable RLS (admin only)
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow only admins to view logs (Accessing auth.users metadata directly)
CREATE POLICY "Admins can view webhook logs" ON webhook_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE id = auth.uid()
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Allow service role to insert (Edge Functions use service role)
CREATE POLICY "Service role can insert webhook logs" ON webhook_logs
    FOR INSERT
    WITH CHECK (true);
