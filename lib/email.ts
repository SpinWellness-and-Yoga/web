import * as brevo from '@getbrevo/brevo';
import { logger } from './logger';
import { EMAIL_CONFIG } from './constants';
import { redisDel, redisGet, redisSet, redisSetNx } from './redis';

function safeBrevoMeta(result: any): Record<string, any> {
  const statusCode = result?.response?.statusCode;
  const headers = result?.response?.headers;
  const messageId = result?.body?.messageId || result?.body?.message_id;
  const requestId =
    headers?.['x-request-id'] ||
    headers?.['x-brevo-request-id'] ||
    headers?.['x-sib-request-id'] ||
    headers?.['x-amzn-requestid'];

  const meta: Record<string, any> = {};
  if (typeof statusCode === 'number') meta.status_code = statusCode;
  if (requestId) meta.request_id = String(requestId);
  if (messageId) meta.message_id = String(messageId);
  return meta;
}

function safeBrevoErrorMeta(error: any): Record<string, any> {
  const statusCode = error?.status || error?.statusCode || error?.response?.status;
  const message = error?.message ? String(error.message) : 'unknown error';
  const name = error?.name ? String(error.name) : 'error';
  const body = error?.response?.body || error?.body;
  const bodyType = body ? typeof body : undefined;

  const meta: Record<string, any> = { name, message };
  if (typeof statusCode === 'number') meta.status_code = statusCode;
  if (bodyType && bodyType !== 'string') meta.body_type = bodyType;
  if (typeof body === 'string') meta.body_length = body.length;
  return meta;
}

function getEnvVar(key: string, env?: any): string | undefined {
  // check passed env first (for cloudflare workers)
  if (env?.[key]) return env[key];
  if (env?.env?.[key]) return env.env[key];
  if (env?.vars?.[key]) return env.vars[key];
  
  // check process.env (for next.js)
  if (process.env[key]) {
    return process.env[key];
  }
  
  // check global env (for cloudflare)
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    if (g.env?.[key]) return g.env[key];
    if (g.__env__?.[key]) return g.__env__[key];
    if (g.__CLOUDFLARE_ENV__?.[key]) return g.__CLOUDFLARE_ENV__[key];
  }
  
  return undefined;
}

function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function getBrevoClient(env?: any): brevo.TransactionalEmailsApi | null {
  const brevoApiKey = getEnvVar('BREVO_API_KEY', env);
  
  if (!brevoApiKey) {
    logger.error('brevo api key not found');
    return null;
  }

  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);
  
  return apiInstance;
}

async function sendEmailWithRetry(
  apiInstance: brevo.TransactionalEmailsApi,
  payload: brevo.SendSmtpEmail,
  emailType: string
): Promise<void> {
  // prevent duplicate deliveries when the provider responds with transient 5xx/timeouts.
  // if we can't be sure the first attempt didn't send, we avoid retrying and dedupe subsequent calls by key.
  const dedupeKeyRaw = (() => {
    const toEmail = payload.to?.[0]?.email?.trim().toLowerCase();
    const subject = payload.subject?.trim();
    if (!toEmail || !subject) return '';
    return `email:dedupe:${emailType}:${toEmail}:${subject}`;
  })();

  const inMemoryDedupe = (globalThis as any).__swayEmailDedupe as Map<string, number> | undefined;
  const dedupeMap: Map<string, number> = inMemoryDedupe ?? new Map<string, number>();
  (globalThis as any).__swayEmailDedupe = dedupeMap;

  const now = Date.now();
  for (const [k, exp] of dedupeMap.entries()) {
    if (now > exp) dedupeMap.delete(k);
  }

  const pendingTtlSeconds = 90;
  const sentTtlSeconds = 60 * 60 * 24 * 7;
  const pendingKey = dedupeKeyRaw ? `${dedupeKeyRaw}:pending` : '';
  const sentKey = dedupeKeyRaw ? `${dedupeKeyRaw}:sent` : '';

  if (sentKey) {
    const alreadySent = await redisGet(sentKey);
    if (alreadySent) {
      logger.info('email deduped (already sent)');
      return;
    }
    const memSent = dedupeMap.get(sentKey);
    if (memSent && now < memSent) {
      logger.info('email deduped (already sent)');
      return;
    }
  }

  if (pendingKey) {
    const pending = await redisGet(pendingKey);
    if (pending) {
      logger.info('email deduped (pending)');
      return;
    }
    const memPending = dedupeMap.get(pendingKey);
    if (memPending && now < memPending) {
      logger.info('email deduped (pending)');
      return;
    }

    const locked = await redisSetNx(pendingKey, '1', pendingTtlSeconds);
    if (!locked) {
      // if redis is disabled/unavailable, fall back to a short in-memory lock.
      dedupeMap.set(pendingKey, now + pendingTtlSeconds * 1000);
    }
  }

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= EMAIL_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      logger.info('brevo send attempt', { email_type: emailType, attempt });
      const result = await Promise.race([
        apiInstance.sendTransacEmail(payload),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('email send timeout')), EMAIL_CONFIG.SEND_TIMEOUT_MS)
        )
      ]) as any;

      logger.info('brevo send response', { email_type: emailType, attempt, ...safeBrevoMeta(result) });
      
      if (result?.response?.statusCode >= 200 && result?.response?.statusCode < 300) {
        logger.info(`${emailType} email sent successfully`);
        if (pendingKey) await redisDel([pendingKey]);
        if (sentKey) {
          await redisSet(sentKey, '1', sentTtlSeconds);
          dedupeMap.set(sentKey, Date.now() + sentTtlSeconds * 1000);
        }
        return;
      }
      
      throw new Error(`email send failed with status ${result?.response?.statusCode}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn('brevo send failed', { email_type: emailType, attempt, ...safeBrevoErrorMeta(error) });

      // if the request timed out, we can't know whether the provider will still deliver.
      // to avoid duplicates, stop retrying and keep a short "pending" lock.
      if (lastError.message.includes('timeout')) {
        logger.warn(`${emailType} email timed out, skipping retry to prevent duplicates`);
        return;
      }
      
      if (attempt < EMAIL_CONFIG.RETRY_ATTEMPTS) {
        logger.warn(`${emailType} email send failed, retrying attempt ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, EMAIL_CONFIG.RETRY_DELAY_MS * attempt));
      } else {
        logger.error(`${emailType} email failed after ${EMAIL_CONFIG.RETRY_ATTEMPTS} attempts`);
      }
    }
  }

  // if we failed definitively, clear the pending lock so a future attempt can try again.
  if (pendingKey) await redisDel([pendingKey]);
}

export function renderEventRegistrationConfirmationEmail(entry: {
  event_name: string;
  event_date: string;
  event_time: string;
  event_location: string;
  event_address?: string;
  event_start_iso?: string;
  event_end_iso?: string;
  name: string;
  email: string;
  ticket_number: string;
  location_preference: string;
}): { subject: string; html: string } {
  const logoUrl = 'https://www.spinwellnessandyoga.com/logos/SWAY-logomark-PNG.png';
  const siteBaseUrl = 'https://www.spinwellnessandyoga.com';
  const address = entry.event_address?.trim() || '';
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : '';

  const toTitleCase = (input: string) =>
    input
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const eventNameTitle = toTitleCase(entry.event_name);

  const toGoogleCalendarDate = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return [
      date.getUTCFullYear(),
      pad(date.getUTCMonth() + 1),
      pad(date.getUTCDate()),
      'T',
      pad(date.getUTCHours()),
      pad(date.getUTCMinutes()),
      pad(date.getUTCSeconds()),
      'Z',
    ].join('');
  };

  const getGoogleCalendarUrl = () => {
    if (!entry.event_start_iso) return '';
    const start = toGoogleCalendarDate(entry.event_start_iso);
    const end = entry.event_end_iso ? toGoogleCalendarDate(entry.event_end_iso) : '';
    if (!start || !end) return '';

    const details = `Ticket Number: ${entry.ticket_number}`;
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: eventNameTitle,
      dates: `${start}/${end}`,
      details,
      location: entry.event_address || entry.event_location,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const getIcsUrl = () => {
    if (!entry.event_start_iso || !entry.event_end_iso) return '';
    const params = new URLSearchParams({
      title: eventNameTitle,
      start: entry.event_start_iso,
      end: entry.event_end_iso,
      location: entry.event_address || entry.event_location,
      description: `Ticket Number: ${entry.ticket_number}`,
    });
    return `${siteBaseUrl}/api/calendar/ics?${params.toString()}`;
  };

  const googleCalendarUrl = getGoogleCalendarUrl();
  const icsUrl = getIcsUrl();

  const emailBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #151b47; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 8px; padding-top: 0;">
        <img src="${logoUrl}" alt="Spinwellness & Yoga" style="width: 260px; max-width: 260px; height: auto; display: block; margin: 0 auto 2px; border: 0; outline: none; text-decoration: none;" />
        <h1 style="color: #151b47; font-size: 16px; margin: 0; padding: 0; line-height: 1.15; font-weight: 400; font-family: 'Vermost', 'Trebuchet MS', 'Segoe UI', Arial, sans-serif;">You're Registered!!</h1>
      </div>
      
      <div style="background: #fef9f5; padding: 30px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f16f64;">
        <p style="margin: 0 0 15px; font-size: 16px;">Hi ${escapeHtml(entry.name)},</p>
        <p style="margin: 0 0 15px; font-size: 16px;">Thank you for registering for <strong>${escapeHtml(eventNameTitle)}</strong>! We're excited to have you join us.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #f16f64;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Ticket Number</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f16f64; letter-spacing: 2px;">${escapeHtml(entry.ticket_number)}</p>
        </div>
        <p style="margin: 15px 0; font-size: 16px;">Please save this email and bring your ticket number with you to the event.</p>
        <p style="margin: 0 0 15px; font-size: 16px;">We look forward to seeing you there!</p>
      </div>

      <div style="background: linear-gradient(135deg, #f16f64 0%, #e85a50 100%); padding: 26px; border-radius: 12px; margin-bottom: 30px; color: white; text-align: left;">
        <h2 style="color: white; margin: 0 0 14px; font-size: 20px;">Event Details</h2>
        <p style="color: rgba(255, 255, 255, 0.95); margin: 6px 0; font-size: 16px;"><strong>Date:</strong> ${escapeHtml(entry.event_date)}</p>
        <p style="color: rgba(255, 255, 255, 0.95); margin: 6px 0; font-size: 16px;"><strong>Time:</strong> ${escapeHtml(entry.event_time)}</p>
        <p style="color: rgba(255, 255, 255, 0.95); margin: 6px 0; font-size: 16px;"><strong>Location:</strong> ${escapeHtml(entry.event_location)}</p>
        ${address ? `<p style="color: rgba(255, 255, 255, 0.95); margin: 6px 0; font-size: 16px;"><strong>Address:</strong> <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: underline;">${escapeHtml(address)}</a></p>` : ''}
      </div>

      <div style="margin-bottom: 18px; text-align: left;">
        <p style="margin: 0; font-size: 14px; color: #666;">For enquiries, email <a href="mailto:admin@spinwellnessandyoga.com" style="color: #f16f64; text-decoration: underline;">admin@spinwellnessandyoga.com</a>.</p>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 14px; margin: 0;">spinwellness & yoga | transform employee wellness</p>
      </div>
    </div>
  `;

  return {
    subject: `Registration Confirmed: ${eventNameTitle}`,
    html: emailBody,
  };
}

export async function sendWaitlistNotification(entry: {
  full_name: string;
  email: string;
  company: string;
  team_size?: string;
  priority?: string;
}, env?: any): Promise<void> {
  const apiInstance = getBrevoClient(env);
  const adminEmail = getEnvVar('ADMIN_EMAIL', env) || 'admin@spinwellnessandyoga.com';

  if (!apiInstance) {
    return;
  }

  const emailBody = `
    <h2>New Waitlist Entry</h2>
    <p><strong>Name:</strong> ${escapeHtml(entry.full_name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(entry.email)}</p>
    <p><strong>Company:</strong> ${escapeHtml(entry.company)}</p>
    ${entry.team_size ? `<p><strong>Team Size:</strong> ${escapeHtml(entry.team_size)}</p>` : ''}
    ${entry.priority ? `<p><strong>Priority:</strong> ${escapeHtml(entry.priority)}</p>` : ''}
    <hr>
    <p style="color: #666; font-size: 0.9em;">automated notification from spinwellness waitlist</p>
  `;

  const senderEmail = getEnvVar('BREVO_SENDER_EMAIL', env) || 'admin@spinwellnessandyoga.com';
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { name: 'Spinwellness Waitlist', email: senderEmail };
  sendSmtpEmail.to = [{ email: adminEmail }];
  sendSmtpEmail.subject = `new waitlist entry: ${entry.company}`;
  sendSmtpEmail.htmlContent = emailBody;

  await sendEmailWithRetry(apiInstance, sendSmtpEmail, 'waitlist-notification');
}

export async function sendWaitlistConfirmation(entry: {
  full_name: string;
  email: string;
  company: string;
}, env?: any): Promise<void> {
  const apiInstance = getBrevoClient(env);

  if (!apiInstance) {
    logger.error('waitlist confirmation: brevo api key not found');
    return;
  }

  const logoUrl = 'https://www.spinwellnessandyoga.com/logos/SWAY-Primary-logo-(iteration).png';

  const emailBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #151b47; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoUrl}" alt="Spinwellness & Yoga" style="max-width: 400px; width: 100%; height: auto; display: block; margin: 0 auto 20px;" />
        <h1 style="color: #151b47; font-size: 28px; margin: 0 0 10px;">Welcome to the Waitlist!</h1>
      </div>
      
      <div style="background: #fef9f5; padding: 30px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f16f64;">
        <p style="margin: 0 0 15px; font-size: 16px;">Hi ${entry.full_name},</p>
        <p style="margin: 0 0 15px; font-size: 16px;">Thank you for joining the Spinwellness & Yoga waitlist! We&apos;re excited to have ${entry.company} on this journey with us.</p>
        <p style="margin: 0; font-size: 16px;">We&apos;ll be in touch soon with updates and early access opportunities.</p>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 14px; margin: 0;">Spinwellness & Yoga | Transform Employee Wellness</p>
      </div>
    </div>
  `;

  const senderEmail = getEnvVar('BREVO_SENDER_EMAIL', env) || 'admin@spinwellnessandyoga.com';

  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: 'Spinwellness & Yoga', email: senderEmail };
    sendSmtpEmail.to = [{ email: entry.email }];
    sendSmtpEmail.subject = 'Welcome to the Spinwellness Waitlist!';
    sendSmtpEmail.htmlContent = emailBody;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.info('waitlist confirmation email sent successfully');
  } catch (error) {
    logger.error('waitlist confirmation email failed');
  }
}

export async function sendContactNotification(entry: {
  name: string;
  email: string;
  message: string;
}, env?: any): Promise<void> {
  const apiInstance = getBrevoClient(env);
  const adminEmail = getEnvVar('ADMIN_EMAIL', env);

  if (!adminEmail || !adminEmail.includes('@')) {
    logger.error('contact notification: invalid admin email');
    return;
  }

  if (!apiInstance) {
    logger.error('contact notification: brevo api key not found');
    return;
  }

  const emailBody = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${entry.name}</p>
    <p><strong>Email:</strong> ${entry.email}</p>
    <p><strong>Message:</strong></p>
    <p style="white-space: pre-wrap;">${entry.message}</p>
    <hr>
    <p style="color: #666; font-size: 0.9em;">This is an automated notification from the Spinwellness contact form.</p>
  `;

  const senderEmail = getEnvVar('BREVO_SENDER_EMAIL', env) || 'admin@spinwellnessandyoga.com';
  
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: 'Spinwellness Contact Form', email: senderEmail };
    sendSmtpEmail.to = [{ email: adminEmail }];
    sendSmtpEmail.subject = `New Contact: ${entry.name}`;
    sendSmtpEmail.htmlContent = emailBody;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.info('contact notification email sent successfully');
  } catch (error) {
    logger.error('contact notification email failed');
  }
}

export async function sendContactConfirmation(entry: {
  name: string;
  email: string;
}, env?: any): Promise<void> {
  const apiInstance = getBrevoClient(env);

  if (!apiInstance) {
    logger.error('contact confirmation: brevo api key not found');
    return;
  }

  const logoUrl = 'https://spinwellnessandyoga.com/logos/SWAY-Primary-logo-(iteration).png';

  const emailBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #151b47; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoUrl}" alt="Spinwellness & Yoga" style="max-width: 400px; width: 100%; height: auto; display: block; margin: 0 auto 20px;" />
        <h1 style="color: #151b47; font-size: 28px; margin: 0 0 10px;">Thank you for reaching out!</h1>
      </div>
      
      <div style="background: #fef9f5; padding: 30px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f16f64;">
        <p style="margin: 0 0 15px; font-size: 16px;">Hi ${entry.name},</p>
        <p style="margin: 0 0 15px; font-size: 16px;">Thank you for contacting Spinwellness & Yoga. We&apos;ve received your message and will get back to you soon.</p>
        <p style="margin: 0; font-size: 16px;">We appreciate your interest in transforming employee wellness.</p>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 14px; margin: 0;">Spinwellness & Yoga | Transform Employee Wellness</p>
      </div>
    </div>
  `;

  const senderEmail = getEnvVar('BREVO_SENDER_EMAIL', env) || 'admin@spinwellnessandyoga.com';
  
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: 'Spinwellness & Yoga', email: senderEmail };
    sendSmtpEmail.to = [{ email: entry.email }];
    sendSmtpEmail.subject = 'Thank you for contacting Spinwellness & Yoga';
    sendSmtpEmail.htmlContent = emailBody;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.info('contact confirmation email sent successfully');
  } catch (error) {
    logger.error('contact confirmation email failed');
  }
}

export async function sendEventRegistrationNotification(entry: {
  event_name: string;
  event_date: string;
  event_location: string;
  name: string;
  email: string;
  phone_number: string;
  gender: string;
  profession: string;
  location_preference: string;
  needs_directions: boolean;
  notes?: string;
  ticket_number: string;
}, env?: any): Promise<void> {
  const apiInstance = getBrevoClient(env);
  const adminEmail = getEnvVar('ADMIN_EMAIL', env) || 'admin@spinwellnessandyoga.com';

  if (!adminEmail || !adminEmail.includes('@')) {
    logger.error('invalid admin email', { adminEmail });
    return;
  }

  if (!apiInstance) {
    return;
  }

  const emailBody = `
    <h2>new event registration</h2>
    <h3>${escapeHtml(entry.event_name)}</h3>
    <p><strong>event date:</strong> ${escapeHtml(entry.event_date)}</p>
    <p><strong>event location:</strong> ${escapeHtml(entry.event_location)}</p>
    <hr>
    <h3>registration details</h3>
    <p><strong>name:</strong> ${escapeHtml(entry.name)}</p>
    <p><strong>email:</strong> ${escapeHtml(entry.email)}</p>
    <p><strong>phone:</strong> ${escapeHtml(entry.phone_number)}</p>
    <p><strong>gender:</strong> ${escapeHtml(entry.gender)}</p>
    <p><strong>profession:</strong> ${escapeHtml(entry.profession)}</p>
    <p><strong>location preference:</strong> ${escapeHtml(entry.location_preference)}</p>
    <p><strong>needs directions:</strong> ${entry.needs_directions ? 'yes' : 'no'}</p>
    <p><strong>ticket number:</strong> ${escapeHtml(entry.ticket_number)}</p>
    ${entry.notes ? `<p><strong>notes:</strong> ${escapeHtml(entry.notes)}</p>` : ''}
    <hr>
    <p style="color: #666; font-size: 0.9em;">automated notification from spinwellness event registration</p>
  `;

  const senderEmail = getEnvVar('BREVO_SENDER_EMAIL', env) || 'admin@spinwellnessandyoga.com';
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { name: 'Spinwellness Events', email: senderEmail };
  sendSmtpEmail.to = [{ email: adminEmail }];
  sendSmtpEmail.subject = `new registration: ${entry.event_name} - ${entry.name}`;
  sendSmtpEmail.htmlContent = emailBody;

  await sendEmailWithRetry(apiInstance, sendSmtpEmail, 'registration-notification');
}

export async function sendEventRegistrationConfirmation(entry: {
  event_name: string;
  event_date: string;
  event_time: string;
  event_location: string;
  event_address?: string;
  event_start_iso?: string;
  event_end_iso?: string;
  name: string;
  email: string;
  ticket_number: string;
  location_preference: string;
}, env?: any): Promise<void> {
  const apiInstance = getBrevoClient(env);

  if (!apiInstance) {
    logger.error('brevo api key not found for registration confirmation');
    return;
  }

  const rendered = renderEventRegistrationConfirmationEmail(entry);

  const senderEmail = getEnvVar('BREVO_SENDER_EMAIL', env) || 'admin@spinwellnessandyoga.com';
  const sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail.sender = { name: 'Spinwellness & Yoga', email: senderEmail };
  sendSmtpEmail.to = [{ email: entry.email }];
  sendSmtpEmail.subject = rendered.subject;
  sendSmtpEmail.htmlContent = rendered.html;

  await sendEmailWithRetry(apiInstance, sendSmtpEmail, 'registration-confirmation');
}

export async function sendEventReminder(entry: {
  event_name: string;
  event_date: string;
  event_location: string;
  name: string;
  email: string;
  ticket_number: string;
  location_preference: string;
}, env?: any): Promise<void> {
  const apiInstance = getBrevoClient(env);

  if (!apiInstance) {
    logger.error('event reminder: brevo api key not found');
    return;
  }

  const logoUrl = 'https://www.spinwellnessandyoga.com/logos/SWAY-logomark-PNG.png';

  const escapeHtml = (text: string) => {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  const emailBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #151b47; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 18px;">
        <img src="${logoUrl}" alt="Spinwellness & Yoga" style="width: 260px; max-width: 260px; height: auto; display: block; margin: 0 auto 8px; border: 0; outline: none; text-decoration: none;" />
        <h1 style="color: #151b47; font-size: 28px; margin: 0 0 10px;">Event Reminder</h1>
      </div>
      
      <div style="background: linear-gradient(135deg, #f16f64 0%, #e85a50 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px; color: white; text-align: center;">
        <h2 style="color: white; margin: 0 0 15px; font-size: 24px;">${escapeHtml(entry.event_name)}</h2>
        <p style="color: rgba(255, 255, 255, 0.95); margin: 5px 0; font-size: 16px;"><strong>Date:</strong> ${escapeHtml(entry.event_date)}</p>
        <p style="color: rgba(255, 255, 255, 0.95); margin: 5px 0; font-size: 16px;"><strong>Location:</strong> ${escapeHtml(entry.event_location)}</p>
      </div>
      
      <div style="background: #fef9f5; padding: 30px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f16f64;">
        <p style="margin: 0 0 15px; font-size: 16px;">Hi ${escapeHtml(entry.name)},</p>
        <p style="margin: 0 0 15px; font-size: 16px;">This is a friendly reminder that <strong>${escapeHtml(entry.event_name)}</strong> is happening in 2 days!</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #f16f64;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Ticket Number</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f16f64; letter-spacing: 2px;">${escapeHtml(entry.ticket_number)}</p>
        </div>
        <p style="margin: 15px 0; font-size: 16px;">Please remember to bring your ticket number with you. We can&apos;t wait to see you there!</p>
        ${entry.location_preference ? `<p style="margin: 0 0 15px; font-size: 16px;"><strong>Location:</strong> ${escapeHtml(entry.location_preference)}</p>` : ''}
      </div>

      <div style="background: #fff9f5; padding: 24px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #f16f64;">
        <p style="margin: 0 0 12px; font-size: 15px; color: #322216;"><strong>can&apos;t make it?</strong></p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #666; line-height: 1.6;">if you&apos;re unable to attend, please cancel your ticket so someone else can take your spot.</p>
        <a href="https://spinwellnessandyoga.com/cancel" style="display: inline-block; padding: 10px 20px; background: #ffffff; color: #f16f64; text-decoration: none; border: 2px solid #f16f64; border-radius: 8px; font-weight: 600; font-size: 14px;">cancel ticket</a>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 14px; margin: 0;">Spinwellness & Yoga | Transform Employee Wellness</p>
      </div>
    </div>
  `;

  const senderEmail = getEnvVar('BREVO_SENDER_EMAIL', env) || 'admin@spinwellnessandyoga.com';
  
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { name: 'Spinwellness & Yoga', email: senderEmail };
    sendSmtpEmail.to = [{ email: entry.email }];
    sendSmtpEmail.subject = `Reminder: ${entry.event_name} is in 2 days!`;
    sendSmtpEmail.htmlContent = emailBody;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.info('event reminder email sent successfully');
  } catch (error) {
    logger.error('event reminder email failed');
  }
}
