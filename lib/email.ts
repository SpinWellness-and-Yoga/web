import { Resend } from 'resend';
import { logger } from './logger';
import { EMAIL_CONFIG } from './constants';

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

async function sendEmailWithRetry(
  resend: Resend,
  payload: any,
  emailType: string
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= EMAIL_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const result = await Promise.race([
        resend.emails.send(payload),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('email send timeout')), EMAIL_CONFIG.SEND_TIMEOUT_MS)
        )
      ]) as any;
      
      if (result?.error) {
        throw new Error(result.error.message || result.error.name || 'email send failed');
      }
      
      if (result?.data?.id) {
        logger.info(`${emailType} email sent`, { 
          emailId: result.data.id, 
          to: payload.to,
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
    to: payload.to,
  });
}

export function renderEventRegistrationConfirmationEmail(entry: {
  event_name: string;
  event_date: string;
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
  const resendApiKey = getEnvVar('RESEND_API_KEY', env);
  const adminEmail = getEnvVar('ADMIN_EMAIL', env) || 'admin@spinwellnessandyoga.com';

  if (!resendApiKey) {
    logger.error('resend api key not found for waitlist notification');
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

  const emailPayload = {
    from: 'Spinwellness Waitlist <admin@spinwellnessandyoga.com>',
    to: [adminEmail],
    subject: `new waitlist entry: ${entry.company}`,
    html: emailBody,
  };
    
    const resend = new Resend(resendApiKey);
  await sendEmailWithRetry(resend, emailPayload, 'waitlist-notification');
}

export async function sendWaitlistConfirmation(entry: {
  full_name: string;
  email: string;
  company: string;
}, env?: any): Promise<void> {
  const resendApiKey = getEnvVar('RESEND_API_KEY', env);

  if (!resendApiKey) {
    console.error('[sendWaitlistConfirmation] RESEND_API_KEY not found');
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

  const emailPayload = {
    from: 'Spinwellness & Yoga <admin@spinwellnessandyoga.com>',
    to: [entry.email],
    subject: 'Welcome to the Spinwellness Waitlist!',
    html: emailBody,
  };

  try {
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send(emailPayload);
    if (result.error) {
      console.error('[sendWaitlistConfirmation] Resend API error:', result.error);
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
  const resendApiKey = getEnvVar('RESEND_API_KEY', env);
  const adminEmail = getEnvVar('ADMIN_EMAIL', env);

  if (!adminEmail || !adminEmail.includes('@')) {
    console.error('[sendContactNotification] Invalid ADMIN_EMAIL:', adminEmail);
    return;
  }

  if (!resendApiKey) {
    console.error('[sendContactNotification] RESEND_API_KEY not found');
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

  const emailPayload = {
    from: 'Spinwellness Contact Form <admin@spinwellnessandyoga.com>',
    to: [adminEmail],
    subject: `New Contact: ${entry.name}`,
    html: emailBody,
  };

  try {
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send(emailPayload);
    if (result.error) {
      console.error('[sendContactNotification] Resend API error:', result.error);
    }
  } catch (error) {
    console.error('[sendContactNotification] Exception caught:', error);
  }
}

export async function sendContactConfirmation(entry: {
  name: string;
  email: string;
}, env?: any): Promise<void> {
  const resendApiKey = getEnvVar('RESEND_API_KEY', env);

  if (!resendApiKey) {
    console.error('[sendContactConfirmation] RESEND_API_KEY not found');
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

  const emailPayload = {
    from: 'Spinwellness & Yoga <admin@spinwellnessandyoga.com>',
    to: [entry.email],
    subject: 'Thank you for contacting Spinwellness & Yoga',
    html: emailBody,
  };

  try {
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send(emailPayload);
    if (result.error) {
      console.error('[sendContactConfirmation] Resend API error:', result.error);
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
  const resendApiKey = getEnvVar('RESEND_API_KEY', env);
  const adminEmail = getEnvVar('ADMIN_EMAIL', env) || 'admin@spinwellnessandyoga.com';

  if (!adminEmail || !adminEmail.includes('@')) {
    logger.error('invalid admin email', { adminEmail });
    return;
  }

  if (!resendApiKey) {
    logger.error('resend api key not found for registration notification');
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

  const emailPayload = {
    from: 'Spinwellness Events <admin@spinwellnessandyoga.com>',
    to: [adminEmail],
    subject: `new registration: ${entry.event_name} - ${entry.name}`,
    html: emailBody,
  };

  const resend = new Resend(resendApiKey);
  await sendEmailWithRetry(resend, emailPayload, 'registration-notification');
}

export async function sendEventRegistrationConfirmation(entry: {
  event_name: string;
  event_date: string;
  event_location: string;
  event_venue?: string;
  event_address?: string;
  name: string;
  email: string;
  ticket_number: string;
  location_preference: string;
}, env?: any): Promise<void> {
  const resendApiKey = getEnvVar('RESEND_API_KEY', env);

  if (!resendApiKey) {
    logger.error('resend api key not found for registration confirmation');
    return;
  }

  const rendered = renderEventRegistrationConfirmationEmail(entry);

  const emailPayload = {
    from: 'Spinwellness & Yoga <admin@spinwellnessandyoga.com>',
    to: [entry.email],
    subject: rendered.subject,
    html: rendered.html,
  };

  const resend = new Resend(resendApiKey);
  await sendEmailWithRetry(resend, emailPayload, 'registration-confirmation');
}

export async function sendEventReminder(entry: {
  event_name: string;
  event_date: string;
  event_location: string;
  event_venue?: string;
  name: string;
  email: string;
  ticket_number: string;
  location_preference: string;
}, env?: any): Promise<void> {
  const resendApiKey = getEnvVar('RESEND_API_KEY', env);

  if (!resendApiKey) {
    console.error('[sendEventReminder] RESEND_API_KEY not found');
    return;
  }

  const logoUrl = 'https://spinwellnessandyoga.com/logos/email-logo.png';

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
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoUrl}" alt="Spinwellness & Yoga" style="max-width: 400px; width: 100%; height: auto; display: block; margin: 0 auto 20px;" />
        <h1 style="color: #151b47; font-size: 28px; margin: 0 0 10px;">Event Reminder</h1>
      </div>
      
      <div style="background: linear-gradient(135deg, #f16f64 0%, #e85a50 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px; color: white; text-align: center;">
        <h2 style="color: white; margin: 0 0 15px; font-size: 24px;">${escapeHtml(entry.event_name)}</h2>
        <p style="color: rgba(255, 255, 255, 0.95); margin: 5px 0; font-size: 16px;"><strong>Date:</strong> ${escapeHtml(entry.event_date)}</p>
        <p style="color: rgba(255, 255, 255, 0.95); margin: 5px 0; font-size: 16px;"><strong>Location:</strong> ${escapeHtml(entry.event_location)}</p>
        ${entry.event_venue ? `<p style="color: rgba(255, 255, 255, 0.95); margin: 5px 0; font-size: 16px;"><strong>Venue:</strong> ${escapeHtml(entry.event_venue)}</p>` : ''}
      </div>
      
      <div style="background: #fef9f5; padding: 30px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f16f64;">
        <p style="margin: 0 0 15px; font-size: 16px;">Hi ${escapeHtml(entry.name)},</p>
        <p style="margin: 0 0 15px; font-size: 16px;">This is a friendly reminder that <strong>${escapeHtml(entry.event_name)}</strong> is happening in 2 days!</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #f16f64;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Ticket Number</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f16f64; letter-spacing: 2px;">${escapeHtml(entry.ticket_number)}</p>
        </div>
        <p style="margin: 15px 0; font-size: 16px;">Please remember to bring your ticket number with you. We can&apos;t wait to see you there!</p>
        ${entry.location_preference ? `<p style="margin: 0; font-size: 16px;"><strong>Location:</strong> ${escapeHtml(entry.location_preference)}</p>` : ''}
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 14px; margin: 0;">Spinwellness & Yoga | Transform Employee Wellness</p>
      </div>
    </div>
  `;

  const emailPayload = {
    from: 'Spinwellness & Yoga <admin@spinwellnessandyoga.com>',
    to: [entry.email],
    subject: `Reminder: ${entry.event_name} is in 2 days!`,
    html: emailBody,
  };

  try {
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send(emailPayload);
    if (result.error) {
      console.log('[sendEventReminder] Email sending failed:', result.error.message || 'domain not verified');
    } else {
      console.log('[sendEventReminder] Reminder email sent successfully');
    }
  } catch (error) {
    console.log('[sendEventReminder] Email sending failed:', error instanceof Error ? error.message : 'unknown error');
  }
}
