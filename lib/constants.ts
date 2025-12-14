// validation constants
export const VALID_GENDERS = ['female', 'male', 'non-binary', 'prefer-not-to-say'] as const;
export const VALID_LOCATIONS = ['lagos', 'ibadan'] as const;

export const VALIDATION_LIMITS = {
  NAME_MAX: 200,
  EMAIL_MAX: 255,
  PHONE_MIN: 10,
  PHONE_MAX: 15,
  PROFESSION_MAX: 200,
  NOTES_MAX: 200,
} as const;

// rate limiting
export const RATE_LIMITS = {
  REGISTRATION_PER_IP_PER_HOUR: 5,
  REGISTRATION_PER_EMAIL_PER_DAY: 3,
  API_REQUESTS_PER_MINUTE: 60,
} as const;

// email configuration
export const EMAIL_CONFIG = {
  SEND_TIMEOUT_MS: 10000,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY_MS: 1000,
} as const;

// cache configuration
export const CACHE_CONFIG = {
  EVENTS_LIST_TTL: 300, // 5 minutes
  EVENT_DETAIL_TTL: 180, // 3 minutes
  REVALIDATE_ON_STALE: true,
} as const;

export type Gender = typeof VALID_GENDERS[number];
export type Location = typeof VALID_LOCATIONS[number];

