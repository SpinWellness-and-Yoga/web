-- clear all event registrations
-- run this in your supabase sql editor
-- WARNING: this will permanently delete all registration records

-- delete all event registrations
DELETE FROM event_registrations;

-- verify deletion (should return 0)
SELECT COUNT(*) as remaining_registrations FROM event_registrations;

