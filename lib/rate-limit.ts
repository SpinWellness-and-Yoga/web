import { RATE_LIMITS } from './constants';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipLimits = new Map<string, RateLimitEntry>();
const emailLimits = new Map<string, RateLimitEntry>();

function cleanupExpired(store: Map<string, RateLimitEntry>) {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

// cleanup every 5 minutes
setInterval(() => {
  cleanupExpired(ipLimits);
  cleanupExpired(emailLimits);
}, 300000);

export function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const store = identifier.includes('@') ? emailLimits : ipLimits;
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count++;
  return true;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  
  return cfIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function getRegistrationLimits(): { perIpPerHour: number; perEmailPerDay: number } {
  const relaxed = (process.env.RATE_LIMIT_RELAXED || '').trim().toLowerCase() === 'true';
  const perIpDefault = relaxed ? 250 : RATE_LIMITS.REGISTRATION_PER_IP_PER_HOUR;
  const perEmailDefault = relaxed ? 120 : RATE_LIMITS.REGISTRATION_PER_EMAIL_PER_DAY;

  const perIpPerHour = parsePositiveInt(process.env.REGISTRATION_PER_IP_PER_HOUR) ?? perIpDefault;
  const perEmailPerDay = parsePositiveInt(process.env.REGISTRATION_PER_EMAIL_PER_DAY) ?? perEmailDefault;

  return { perIpPerHour, perEmailPerDay };
}

export function checkRegistrationRateLimit(ip: string, email: string): { allowed: boolean; reason?: string } {
  const limits = getRegistrationLimits();
  const ipAllowed = checkRateLimit(ip, limits.perIpPerHour, 3600000);
  if (!ipAllowed) {
    return { allowed: false, reason: 'too many registrations from this ip. please try again later' };
  }

  const emailAllowed = checkRateLimit(email, limits.perEmailPerDay, 86400000);
  if (!emailAllowed) {
    return { allowed: false, reason: 'too many registrations from this email. please try again later' };
  }

  return { allowed: true };
}

