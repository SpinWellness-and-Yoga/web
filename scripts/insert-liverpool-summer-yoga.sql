-- insert the liverpool summer yoga event as a hidden draft
-- run this in your supabase sql editor
-- the event stays off the public events page until is_active becomes true

INSERT INTO events (
  id,
  name,
  description,
  start_date,
  end_date,
  location,
  venue,
  capacity,
  price,
  is_active,
  locations
) VALUES (
  'liverpool-2026-09-26',
  'summer yoga - liverpool edition',
  'join us for a free yoga session in liverpool. this 2-hour morning session is open to all levels, from complete beginners to regular practitioners. event flow: 10:00-10:15am - welcome and settling in. 10:15-11:00am - 45-minute group yoga session focused on mindful movement and breath. 11:00-11:15am - 15-minute sound therapy session using sound bowls for deep relaxation. 11:15-11:45am - open conversation on wellbeing, followed by refreshments and socializing. 11:45am-12:00pm - clean-up and exit. limited to 20 attendees for an intimate and personalized experience. bring a mat if you have one. spare mats are available. the session is free of charge.',
  '2026-09-26T10:00:00+01:00',
  '2026-09-26T12:00:00+01:00',
  'liverpool',
  'newsham drive',
  20,
  0,
  false,
  '["Liverpool"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- to publish the event later, run:
-- UPDATE events SET is_active = true, updated_at = NOW() WHERE id = 'liverpool-2026-09-26';
