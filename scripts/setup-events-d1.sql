-- D1 database setup for events
-- run with: wrangler d1 execute spinwellness_web --local --file=scripts/setup-events-d1.sql

-- enable foreign keys (if supported)
PRAGMA foreign_keys = ON;

-- create events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  location TEXT NOT NULL,
  venue TEXT,
  capacity INTEGER DEFAULT 0,
  price REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  locations TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- create event registrations table
-- note: foreign keys are handled at application level for D1 compatibility
CREATE TABLE IF NOT EXISTS event_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  profession TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  location_preference TEXT NOT NULL,
  needs_directions INTEGER DEFAULT 0,
  notes TEXT,
  ticket_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'confirmed',
  created_at TEXT DEFAULT (datetime('now'))
);

-- create indexes (only after tables are created)
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);

-- verify event_registrations table exists before creating indexes
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_email ON event_registrations(email);
CREATE INDEX IF NOT EXISTS idx_event_registrations_ticket_number ON event_registrations(ticket_number);


