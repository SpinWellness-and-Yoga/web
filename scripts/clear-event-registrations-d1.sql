-- clear all event registrations from D1 database
-- run with: wrangler d1 execute spinwellness_web --local --file=scripts/clear-event-registrations-d1.sql
-- or for remote: wrangler d1 execute spinwellness_web --remote --file=scripts/clear-event-registrations-d1.sql
-- WARNING: this will permanently delete all registration records

-- delete all event registrations
DELETE FROM event_registrations;

-- verify deletion (should return 0)
SELECT COUNT(*) as remaining_registrations FROM event_registrations;

