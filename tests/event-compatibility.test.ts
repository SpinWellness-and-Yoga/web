import assert from 'node:assert/strict';
import test from 'node:test';
import { renderEventRegistrationConfirmationEmail } from '../lib/email';
import { formatEventDescription } from '../lib/utils';

const registration = {
  event_name: 'Community yoga',
  event_date: '1 October 2026',
  event_location: 'Liverpool',
  name: 'Test attendee',
  email: 'attendee@example.test',
  ticket_number: 'TEST-001',
  location_preference: 'liverpool',
};

test('confirmation shows the event time and calendar dates', () => {
  const { html } = renderEventRegistrationConfirmationEmail({
    ...registration,
    event_time: '10:00 UTC',
    event_start_iso: '2026-10-01T10:00:00Z',
    event_end_iso: '2026-10-01T12:00:00Z',
  });
  assert.match(html, /10:00 UTC/);
  assert.match(html, /20261001T100000Z%2F20261001T120000Z/);
  assert.match(html, /start=2026-10-01T10%3A00%3A00Z/);
});

test('confirmation accepts old registrations without time or calendar dates', () => {
  const { html } = renderEventRegistrationConfirmationEmail(registration);
  assert.doesNotMatch(html, /<strong>Time:<\/strong>/);
  assert.doesNotMatch(html, /Add to Google Calendar/);
});

test('confirmation escapes event time from stored content', () => {
  const { html } = renderEventRegistrationConfirmationEmail({
    ...registration,
    event_time: '<script>example</script>',
  });
  assert.match(html, /&lt;script&gt;example&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('event descriptions keep original case and return paragraphs', () => {
  assert.deepEqual(formatEventDescription('Meet in Liverpool. Event Flow: Yoga. Limited To 20 people.'), [
    'Meet in Liverpool.', 'Event Flow: Yoga.', 'Limited To 20 people.',
  ]);
  assert.deepEqual(formatEventDescription('  '), []);
});
