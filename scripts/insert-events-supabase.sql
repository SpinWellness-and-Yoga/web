-- insert events into supabase
-- run this in your supabase sql editor after creating tables

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
) VALUES 
(
  'lagos-2026-01-03',
  'recommit to your wellbeing - lagos edition',
  'join us for an intimate and exclusive wellness event in lagos. this 2-hour session is designed for young professionals looking to recommit to their wellbeing through a blend of physical practice, mindful engagement, and community building. event flow: 4:15-5:00pm - 45-minute group yoga session focused on mindful movement and breath. 5:00-5:15pm - 15-minute sound therapy session using sound bowls for deep relaxation. 5:15-5:45pm - open conversation on recommitting to your wellbeing, followed by refreshments and socializing. 5:45-6:00pm - clean-up and exit. limited to 20 attendees for an intimate and personalized experience. perfect for those looking to start their wellness journey or deepen an existing practice. this event provides practical tools and knowledge to manage stress and improve mental well-being in a safe, supportive, and welcoming environment.',
  '2026-01-03T16:00:00+01:00',
  '2026-01-03T18:00:00+01:00',
  'lagos',
  'studio venue',
  20,
  0,
  true,
  '["Lagos"]'::jsonb
),
(
  'ibadan-2026-01-10',
  'recommit to your wellbeing - ibadan edition',
  'join us for an intimate and exclusive wellness event in ibadan. this 2-hour session is designed for young professionals looking to recommit to their wellbeing through a blend of physical practice, mindful engagement, and community building. event flow: 4:15-5:00pm - 45-minute group yoga session focused on mindful movement and breath. 5:00-5:15pm - 15-minute sound therapy session using sound bowls for deep relaxation. 5:15-5:45pm - open conversation on recommitting to your wellbeing, followed by refreshments and socializing. 5:45-6:00pm - clean-up and exit. limited to 20 attendees for an intimate and personalized experience. perfect for those looking to start their wellness journey or deepen an existing practice. this event provides practical tools and knowledge to manage stress and improve mental well-being in a safe, supportive, and welcoming environment.',
  '2026-01-10T16:00:00+01:00',
  '2026-01-10T18:00:00+01:00',
  'ibadan',
  'studio venue',
  20,
  0,
  true,
  '["Ibadan"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;


