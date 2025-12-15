import { VALID_GENDERS, VALID_LOCATIONS, VALIDATION_LIMITS } from './constants';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d+$/;

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface RegistrationInput {
  name: string;
  email: string;
  phone_number: string;
  gender: string;
  profession: string;
  location_preference: string;
  notes?: string;
}

export function sanitizeString(input: unknown, maxLength: number): string {
  if (!input) return '';
  return String(input).trim().substring(0, maxLength);
}

export function sanitizePhone(input: unknown): string {
  if (!input) return '';
  return String(input).replace(/\D/g, '');
}

export function sanitizeEmail(input: unknown): string {
  if (!input) return '';
  return String(input).trim().toLowerCase().substring(0, VALIDATION_LIMITS.EMAIL_MAX);
}

export function validateRegistration(data: Partial<RegistrationInput>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name || sanitizeString(data.name, VALIDATION_LIMITS.NAME_MAX).length === 0) {
    errors.name = 'name is required';
  }

  const email = sanitizeEmail(data.email);
  if (!email || !EMAIL_REGEX.test(email)) {
    errors.email = 'invalid email format';
  }

  const phone = sanitizePhone(data.phone_number);
  if (!phone || !PHONE_REGEX.test(phone)) {
    errors.phone_number = 'phone number must contain only digits';
  } else if (phone.length < VALIDATION_LIMITS.PHONE_MIN || phone.length > VALIDATION_LIMITS.PHONE_MAX) {
    errors.phone_number = `phone number must be between ${VALIDATION_LIMITS.PHONE_MIN} and ${VALIDATION_LIMITS.PHONE_MAX} digits`;
  }

  if (!data.gender || !VALID_GENDERS.includes(data.gender as any)) {
    errors.gender = 'invalid gender selection';
  }

  if (!data.profession || sanitizeString(data.profession, VALIDATION_LIMITS.PROFESSION_MAX).length === 0) {
    errors.profession = 'profession is required';
  }

  if (!data.location_preference || !VALID_LOCATIONS.includes(data.location_preference as any)) {
    errors.location_preference = 'invalid location preference';
  }

  if (data.notes && sanitizeString(data.notes, VALIDATION_LIMITS.NOTES_MAX + 1).length > VALIDATION_LIMITS.NOTES_MAX) {
    errors.notes = `notes cannot exceed ${VALIDATION_LIMITS.NOTES_MAX} characters`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function sanitizeRegistrationInput(data: Partial<RegistrationInput>): RegistrationInput {
  return {
    name: sanitizeString(data.name, VALIDATION_LIMITS.NAME_MAX),
    email: sanitizeEmail(data.email),
    phone_number: sanitizePhone(data.phone_number),
    gender: sanitizeString(data.gender, 50),
    profession: sanitizeString(data.profession, VALIDATION_LIMITS.PROFESSION_MAX),
    location_preference: sanitizeString(data.location_preference, 50).toLowerCase(),
    notes: data.notes ? sanitizeString(data.notes, VALIDATION_LIMITS.NOTES_MAX) : undefined,
  };
}

