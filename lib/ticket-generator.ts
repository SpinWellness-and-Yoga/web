import crypto from 'crypto';

export function generateSecureTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  const checksum = crypto
    .createHash('sha256')
    .update(`${timestamp}-${randomBytes}`)
    .digest('hex')
    .substring(0, 4)
    .toUpperCase();
  
  return `SWAY-${timestamp}-${randomBytes.substring(0, 4)}-${checksum}`;
}

export function generateIdempotencyKey(eventId: string, email: string): string {
  return crypto
    .createHash('sha256')
    .update(`${eventId}:${email.toLowerCase()}`)
    .digest('hex');
}

