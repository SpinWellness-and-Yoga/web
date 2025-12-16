import { logger } from './logger';

// centralized environment variable access with validation
export function getEnvVar(key: string, required: boolean = false): string | undefined {
  const value = process.env[key];
  
  if (required && !value) {
    logger.error(`required environment variable missing: ${key}`);
    throw new Error(`missing required environment variable: ${key}`);
  }
  
  return value;
}

export function validateEnvVars(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'BREVO_API_KEY',
  ];

  const missing: string[] = [];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    logger.error('missing required environment variables', undefined, { missing });
    throw new Error(`missing required environment variables: ${missing.join(', ')}`);
  }

  logger.info('environment variables validated');
}

// safe environment variable getter with defaults
export const env = {
  supabase: {
    url: () => getEnvVar('NEXT_PUBLIC_SUPABASE_URL', true)!,
    serviceKey: () => getEnvVar('SUPABASE_SERVICE_ROLE_KEY', true)!,
    anonKey: () => getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  },
  brevo: {
    apiKey: () => getEnvVar('BREVO_API_KEY', true)!,
  },
  admin: {
    email: () => getEnvVar('ADMIN_EMAIL') || 'admin@spinwellnessandyoga.com',
  },
  cron: {
    secret: () => getEnvVar('CRON_SECRET') || getEnvVar('VERCEL_CRON_SECRET'),
  },
  app: {
    nodeEnv: () => getEnvVar('NODE_ENV') || 'development',
    isDevelopment: () => env.app.nodeEnv() === 'development',
    isProduction: () => env.app.nodeEnv() === 'production',
  },
};

