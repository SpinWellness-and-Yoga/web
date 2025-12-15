-- supabase events table setup
-- run this in your supabase sql editor

-- create events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  venue TEXT,
  capacity INTEGER DEFAULT 0,
  price DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  locations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- create event registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  profession TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  location_preference TEXT NOT NULL,
  needs_directions BOOLEAN DEFAULT false,
  notes TEXT,
  ticket_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- create indexes
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_email ON event_registrations(email);
CREATE INDEX IF NOT EXISTS idx_event_registrations_ticket_number ON event_registrations(ticket_number);

-- enable row level security (optional, adjust as needed)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- create policies for public read access to events
CREATE POLICY "events are viewable by everyone" ON events
  FOR SELECT USING (is_active = true);

CREATE POLICY "event registrations are insertable by everyone" ON event_registrations
  FOR INSERT WITH CHECK (true);

-- create policy for admins to view all registrations (adjust based on your auth setup)
CREATE POLICY "admins can view all registrations" ON event_registrations
  FOR SELECT USING (true);


