-- Add this to your existing Supabase database
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  session_id TEXT PRIMARY KEY,
  session_data TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role access" ON whatsapp_sessions
  FOR ALL USING (auth.role() = 'service_role');