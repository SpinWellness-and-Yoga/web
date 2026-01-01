import * as brevo from '@getbrevo/brevo';
import { logger } from './logger';
import { EMAIL_CONFIG } from './constants';
import { getMapsUrl } from './utils';

function getEnvVar(key: string, env?: any): string | undefined {
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
  
  if (env?.[key]) return env[key];
  if (env?.env?.[key]) return env.env[key];
  if (env?.vars?.[key]) return env.vars[key];
  
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    if (g.env?.[key]) return g.env[key];
    if (g.__env__?.[key]) return g.__env__[key];
    if (g.__CLOUDFLARE_ENV__?.[key]) return g.__CLOUDFLARE_ENV__[key];
  }
  
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
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

function createBrevoApiInstance(apiKey: string): brevo.TransactionalEmailsApi {
  const apiInstance = new brevo.TransactionalEmailsApi();

  try {
    // Try standard setApiKey method first
    // @ts-ignore - setApiKey might not be in type definition but exists in runtime
    apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, apiKey);
    console.log('Brevo API key set via setApiKey');
  } catch (e) {
    console.log('Brevo setApiKey failed, trying fallback');
    // Fallback to manual property setting if setApiKey doesn't exist (older versions)
    const instanceAny = apiInstance as any;
    if (instanceAny.authentications) {
      if (instanceAny.authentications['api-key']) {
        instanceAny.authentications['api-key'].apiKey = apiKey;
      } else {
        instanceAny.authentications['api-key'] = { apiKey };
      }
    } else {
      instanceAny.apiKey = apiKey;
    }
    console.log('Brevo API key set via fallback');
  }

  return apiInstance;
}

async function sendEmailWithRetry(
  apiInstance: brevo.TransactionalEmailsApi,
  payload: brevo.SendSmtpEmail,
  emailType: string
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= EMAIL_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await Promise.race([
        apiInstance.sendTransacEmail(payload),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('email send timeout')), EMAIL_CONFIG.SEND_TIMEOUT_MS)
        )
      ]) as any;
      
      const messageId = result?.body?.messageId || result?.messageId;
      if (messageId) {
        logger.info(`${emailType} email sent`, { 
          emailId: messageId,
          to: Array.isArray(payload.to) ? payload.to.map((t: any) => t.email || t).join(', ') : payload.to,
          attempt,
        });
        return;
      }
      
      throw new Error('unexpected email response format');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < EMAIL_CONFIG.RETRY_ATTEMPTS) {
        logger.warn(`${emailType} email send failed, retrying`, { 
          attempt, 
          error: lastError.message,
        });
        await new Promise(resolve => setTimeout(resolve, EMAIL_CONFIG.RETRY_DELAY_MS * attempt));
      }
    }
  }

  logger.error(`${emailType} email failed after retries`, lastError, { 
    attempts: EMAIL_CONFIG.RETRY_ATTEMPTS,
    to: Array.isArray(payload.to) ? payload.to.map((t: any) => t.email || t).join(', ') : payload.to,
  });
}

export function renderEventRegistrationConfirmationEmail(entry: {
  event_name: string;
  event_date: string;
  event_time?: string;
  event_location: string;
  event_venue?: string;
  event_address?: string;
  event_start_iso?: string;
  event_end_iso?: string;
  name: string;
  email: string;
  ticket_number: string;
  location_preference: string;
}): { subject: string; html: string } {
  const logoUrl = 'https://spinwellnessandyoga.com/logos/SWAY-Primary-logo-(iteration).png';
  const siteBaseUrl = 'https://spinwellnessandyoga.com';
  const mapsUrl = entry.event_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.event_address)}`
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
      <div style="text-align: center; margin-bottom: 10px;">
        <img src="${logoUrl}" alt="Spinwellness & Yoga" style="max-width: 400px; width: 100%; height: auto; display: block; margin: 0 auto 6px;" />
        <h1 style="color: #151b47; font-size: 28px; margin: 0;">You're Registered!!</h1>
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
        ${entry.event_time ? `<p style="color: rgba(255, 255, 255, 0.95); margin: 6px 0; font-size: 16px;"><strong>Time:</strong> ${escapeHtml(entry.event_time)}</p>` : ''}
        <p style="color: rgba(255, 255, 255, 0.95); margin: 6px 0; font-size: 16px;"><strong>Location:</strong> ${escapeHtml(entry.event_location)}</p>
        ${entry.event_venue ? `<p style="color: rgba(255, 255, 255, 0.95); margin: 6px 0; font-size: 16px;"><strong>Venue:</strong> ${escapeHtml(entry.event_venue)}</p>` : ''}
        ${entry.event_address ? `<p style="color: rgba(255, 255, 255, 0.95); margin: 6px 0; font-size: 16px;"><strong>Address:</strong> <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: underline;">${escapeHtml(entry.event_address)}</a></p>` : ''}
      </div>

      ${(googleCalendarUrl || icsUrl) ? `
      <div style="margin-bottom: 30px; text-align: left;">
        <div style="display: inline-flex; gap: 12px; flex-wrap: wrap;">
          ${googleCalendarUrl ? `<a href="${googleCalendarUrl}" style="display: inline-block; background: #151b47; color: #ffffff; text-decoration: none; padding: 12px 16px; border-radius: 10px; font-weight: 600; font-size: 14px;">Add to Google Calendar</a>` : ''}
          ${icsUrl ? `<a href="${icsUrl}" style="display: inline-block; background: #ffffff; color: #151b47; text-decoration: none; padding: 12px 16px; border-radius: 10px; font-weight: 600; font-size: 14px; border: 2px solid #151b47;">Download .ics</a>` : ''}
        </div>
      </div>
      ` : ''}

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
  const brevoApiKey = getEnvVar('BREVO_API_KEY', env);
  const adminEmail = getEnvVar('ADMIN_EMAIL', env) || 'admin@spinwellnessandyoga.com';

  if (!brevoApiKey) {
    logger.error('brevo api key not found for waitlist notification');
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

  const apiInstance = createBrevoApiInstance(brevoApiKey);

  const emailPayload: brevo.SendSmtpEmail = {
    sender: { name: 'Spinwellness Waitlist', email: 'admin@spinwellnessandyoga.com' },
    to: [{ email: adminEmail }],
    subject: `new waitlist entry: ${entry.company}`,
    htmlContent: emailBody,
  };
    
  await sendEmailWithRetry(apiInstance, emailPayload, 'waitlist-notification');
}

export async function sendWaitlistConfirmation(entry: {
  full_name: string;
  email: string;
  company: string;
}, env?: any): Promise<void> {
  const brevoApiKey = getEnvVar('BREVO_API_KEY', env);

  if (!brevoApiKey) {
    console.error('[sendWaitlistConfirmation] BREVO_API_KEY not found');
    return;
  }

  const logoUrl = 'https://spinwellnessandyoga.com/logos/SWAY-Primary-logo-(iteration).png';

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

  const apiInstance = createBrevoApiInstance(brevoApiKey);

  const emailPayload: brevo.SendSmtpEmail = {
    sender: { name: 'Spinwellness & Yoga', email: 'admin@spinwellnessandyoga.com' },
    to: [{ email: entry.email }],
    subject: 'Welcome to the Spinwellness Waitlist!',
    htmlContent: emailBody,
  };

  try {
    const result = await apiInstance.sendTransacEmail(emailPayload);
    const messageId = (result as any)?.body?.messageId || (result as any)?.messageId;
    if (!messageId) {
      console.error('[sendWaitlistConfirmation] Brevo API error: no messageId returned');
    }
  } catch (error) {
    console.error('[sendWaitlistConfirmation] Exception caught:', error);
  }
}

export async function sendContactNotification(entry: {
  name: string;
  email: string;
  message: string;
}, env?: any): Promise<void> {
  const brevoApiKey = getEnvVar('BREVO_API_KEY', env);
  const adminEmail = getEnvVar('ADMIN_EMAIL', env);

  if (!adminEmail || !adminEmail.includes('@')) {
    console.error('[sendContactNotification] Invalid ADMIN_EMAIL:', adminEmail);
    return;
  }

  if (!brevoApiKey) {
    console.error('[sendContactNotification] BREVO_API_KEY not found');
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

  const apiInstance = createBrevoApiInstance(brevoApiKey);

  const emailPayload: brevo.SendSmtpEmail = {
    sender: { name: 'Spinwellness Contact Form', email: 'admin@spinwellnessandyoga.com' },
    to: [{ email: adminEmail }],
    subject: `New Contact: ${entry.name}`,
    htmlContent: emailBody,
  };

  try {
    const result = await apiInstance.sendTransacEmail(emailPayload);
    const messageId = (result as any)?.body?.messageId || (result as any)?.messageId;
    if (!messageId) {
      console.error('[sendContactNotification] Brevo API error: no messageId returned');
    }
  } catch (error) {
    console.error('[sendContactNotification] Exception caught:', error);
  }
}

export async function sendContactConfirmation(entry: {
  name: string;
  email: string;
}, env?: any): Promise<void> {
  const brevoApiKey = getEnvVar('BREVO_API_KEY', env);

  if (!brevoApiKey) {
    console.error('[sendContactConfirmation] BREVO_API_KEY not found');
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

  const apiInstance = createBrevoApiInstance(brevoApiKey);

  const emailPayload: brevo.SendSmtpEmail = {
    sender: { name: 'Spinwellness & Yoga', email: 'admin@spinwellnessandyoga.com' },
    to: [{ email: entry.email }],
    subject: 'Thank you for contacting Spinwellness & Yoga',
    htmlContent: emailBody,
  };

  try {
    const result = await apiInstance.sendTransacEmail(emailPayload);
    const messageId = (result as any)?.body?.messageId || (result as any)?.messageId;
    if (!messageId) {
      console.error('[sendContactConfirmation] Brevo API error: no messageId returned');
    }
  } catch (error) {
    console.error('[sendContactConfirmation] Exception caught:', error);
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
  const brevoApiKey = getEnvVar('BREVO_API_KEY', env);
  const adminEmail = getEnvVar('ADMIN_EMAIL', env) || 'admin@spinwellnessandyoga.com';

  if (!adminEmail || !adminEmail.includes('@')) {
    logger.error('invalid admin email', { adminEmail });
    return;
  }

  if (!brevoApiKey) {
    logger.error('brevo api key not found for registration notification');
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

  const apiInstance = createBrevoApiInstance(brevoApiKey);

  const emailPayload: brevo.SendSmtpEmail = {
    sender: { name: 'Spinwellness Events', email: 'admin@spinwellnessandyoga.com' },
    to: [{ email: adminEmail }],
    subject: `new registration: ${entry.event_name} - ${entry.name}`,
    htmlContent: emailBody,
  };

  await sendEmailWithRetry(apiInstance, emailPayload, 'registration-notification');
}

export async function sendEventRegistrationConfirmation(entry: {
  event_name: string;
  event_date: string;
  event_time?: string;
  event_location: string;
  event_venue?: string;
  event_address?: string;
  name: string;
  email: string;
  ticket_number: string;
  location_preference: string;
}, env?: any): Promise<void> {
  const brevoApiKey = getEnvVar('BREVO_API_KEY', env);

  if (!brevoApiKey) {
    logger.error('brevo api key not found for registration confirmation');
    return;
  }

  const rendered = renderEventRegistrationConfirmationEmail(entry);

  const apiInstance = createBrevoApiInstance(brevoApiKey);

  const emailPayload: brevo.SendSmtpEmail = {
    sender: { name: 'Spinwellness & Yoga', email: 'admin@spinwellnessandyoga.com' },
    to: [{ email: entry.email }],
    subject: rendered.subject,
    htmlContent: rendered.html,
  };

  await sendEmailWithRetry(apiInstance, emailPayload, 'registration-confirmation');
}

export function renderEventReminderEmail(entry: {
  event_name: string;
  event_date: string;
  event_time: string;
  event_location: string;
  event_address: string;
  event_id: string;
  name: string;
  email: string;
  ticket_number: string;
  location_preference: string;
}): { subject: string; html: string } {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spinwellnessandyoga.com';
  const unregisterUrl = `${baseUrl}/cancel?ticket=${encodeURIComponent(entry.ticket_number)}`;
  const faqUrl = `${baseUrl}/faqs/events/${entry.event_id}`;
  const mapsUrl = getMapsUrl(entry.event_address);

  const emailBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #151b47; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #fef9f5; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
        <p style="margin: 0 0 15px; font-size: 16px; color: #151b47;">Hi ${escapeHtml(entry.name)},</p>
        <p style="margin: 0 0 20px; font-size: 16px; color: #151b47;">We are just two days away from our <strong>"${escapeHtml(entry.event_name)}"</strong> event and we couldn't be more excited!</p>
        
        <p style="margin: 0 0 15px; font-size: 16px; color: #151b47;">As we finalize our preparations, we want to do a quick check-in with you: <strong>Are you still able to join us?</strong></p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f16f64;">
          <p style="margin: 0 0 10px; font-size: 16px; color: #151b47;"><strong>If YES:</strong> You don't need to do a thing. We've got your mat and your goody bag ready. We can't wait to see you.</p>
          <p style="margin: 10px 0 0; font-size: 16px; color: #151b47;"><strong>If NO:</strong> We'll miss you, but we completely understand that life happens. If you can no longer make it, please <a href="${unregisterUrl}" style="color: #f16f64; text-decoration: underline;">unregister here</a> so we can release your ticket.</p>
      </div>
      
        <p style="margin: 20px 0 0; font-size: 16px; color: #151b47;">Every one of our 20 spots is incredibly precious. By releasing your ticket now, you're allowing someone else join the session and commit to their wellness journey.</p>
        
        <p style="margin: 20px 0 0; font-size: 16px; color: #151b47;">Thank you for being so thoughtful.</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
        <h2 style="color: #151b47; font-size: 20px; margin: 0 0 20px; font-weight: 600;">Event Details</h2>
        <p style="margin: 0 0 10px; font-size: 16px; color: #151b47;"><strong>Date:</strong> ${escapeHtml(entry.event_date)} at ${escapeHtml(entry.event_time)}</p>
        <p style="margin: 0 0 10px; font-size: 16px; color: #151b47;"><strong>Location:</strong> ${escapeHtml(entry.event_location)}</p>
        <p style="margin: 0 0 20px; font-size: 16px; color: #151b47;"><strong>Address:</strong> <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color: #f16f64; text-decoration: underline;">${escapeHtml(entry.event_address)}</a></p>
        <p style="margin: 0; font-size: 16px;">
          <a href="${faqUrl}" style="color: #f16f64; text-decoration: underline;">view faqs for this event</a>
        </p>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 14px; margin: 0 0 10px;">Best regards,<br>The Spin Wellness Team</p>
        <p style="color: #999; font-size: 12px; margin: 0;">
          <a href="${baseUrl}/unsubscribe?email=${encodeURIComponent(entry.email)}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    </div>
  `;

  return {
    subject: `We're just 2 days away from ${entry.event_name}!`,
    html: emailBody,
  };
}

export async function sendEventReminder(entry: {
  event_name: string;
  event_date: string;
  event_time: string;
  event_location: string;
  event_address: string;
  event_id: string;
  name: string;
  email: string;
  ticket_number: string;
  location_preference: string;
}, env?: any): Promise<void> {
  const brevoApiKey = getEnvVar('BREVO_API_KEY', env);

  if (!brevoApiKey) {
    console.error('[sendEventReminder] BREVO_API_KEY not found');
    throw new Error('BREVO_API_KEY not found');
  }

  if (!brevoApiKey.startsWith('xkeysib-')) {
    console.error('[sendEventReminder] BREVO_API_KEY format invalid');
    throw new Error('BREVO_API_KEY format invalid');
  }

  const rendered = renderEventReminderEmail(entry);

  const apiInstance = createBrevoApiInstance(brevoApiKey);

  const emailPayload: brevo.SendSmtpEmail = {
    sender: { name: 'Spinwellness & Yoga', email: 'admin@spinwellnessandyoga.com' },
    to: [{ email: entry.email }],
    subject: rendered.subject,
    htmlContent: rendered.html,
  };

  try {
    const result = await apiInstance.sendTransacEmail(emailPayload);
    const messageId = (result as any)?.body?.messageId || (result as any)?.messageId;
    if (!messageId) {
      console.log('[sendEventReminder] Email sending failed: no messageId returned');
      throw new Error('no messageId returned from brevo api');
    } else {
      console.log('[sendEventReminder] Reminder email sent successfully');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('[sendEventReminder] Email sending failed:', errorMessage);
    console.error('[sendEventReminder] Error details:', errorDetails);
    throw error;
  }
}
