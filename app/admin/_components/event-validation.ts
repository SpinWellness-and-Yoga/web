export function capacityError(capacity: number, registrations: number): string | null {
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 100000) return 'Enter a whole capacity from 0 to 100000.';
  if (capacity !== 0 && capacity < registrations) return 'Capacity must cover existing registrations. Use 0 for unlimited places.';
  return null;
}
