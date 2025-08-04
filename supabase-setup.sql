-- Supabase SQL Setup for WhatsApp Gmail Bot
-- Run these commands in your Supabase SQL Editor

-- Create bookings table to store WhatsApp messages sent
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  country_code TEXT NOT NULL,
  message_sent TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_logs table to store FAQ interactions
CREATE TABLE IF NOT EXISTS chat_logs (
  id SERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(phone_number);
CREATE INDEX IF NOT EXISTS idx_bookings_timestamp ON bookings(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_logs_phone ON chat_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_chat_logs_timestamp ON chat_logs(timestamp);

-- Enable Row Level Security (RLS) for better security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role access (for your bot)
CREATE POLICY "Allow service role access" ON bookings
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role access" ON chat_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Optional: Create a view to see recent activity
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
  'booking' as type,
  phone_number,
  message_sent as message,
  timestamp
FROM bookings
UNION ALL
SELECT 
  'chat' as type,
  phone_number,
  CONCAT(message, ' -> ', response) as message,
  timestamp
FROM chat_logs
ORDER BY timestamp DESC
LIMIT 50;