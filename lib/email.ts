import {Resend} from 'resend';

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
    console.error('[sendWaitlistNotification] RESEND_API_KEY not found');
    return;
  }

  const emailBody = `
    <h2>New Waitlist Entry</h2>
    <p><strong>Name:</strong> ${entry.full_name}</p>
    <p><strong>Email:</strong> ${entry.email}</p>
    <p><strong>Company:</strong> ${entry.company}</p>
    ${entry.team_size ? `<p><strong>Team Size:</strong> ${entry.team_size}</p>` : ''}
    ${entry.priority ? `<p><strong>Priority:</strong> ${entry.priority}</p>` : ''}
    <hr>
    <p style="color: #666; font-size: 0.9em;">This is an automated notification from the Spinwellness waitlist.</p>
  `;

  const emailPayload = {
    from: 'Spinwellness Waitlist <admin@spinwellnessandyoga.com>',
    to: [adminEmail],
    subject: `New Waitlist Entry: ${entry.company}`,
    html: emailBody,
  };

  try {
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send(emailPayload);
    if (result.error) {
      console.error('[sendWaitlistNotification] Resend API error:', result.error);
    }
  } catch (error) {
    console.error('[sendWaitlistNotification] Exception caught:', error);
  }
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
        <img src="${logoUrl}" alt="Spinwellness & Yoga" style="max-width: 350px; width: 100%; height: auto; margin-bottom: 20px;" />
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
  const adminEmail = getEnvVar('ADMIN_EMAIL', env) || 'admin@spinwellnessandyoga.com';

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
        <img src="${logoUrl}" alt="Spinwellness & Yoga" style="max-width: 350px; width: 100%; height: auto; margin-bottom: 20px;" />
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

  if (!resendApiKey) {
    console.error('[sendEventRegistrationNotification] RESEND_API_KEY not found');
    return;
  }

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
    <h2>New Event Registration</h2>
    <h3>${escapeHtml(entry.event_name)}</h3>
    <p><strong>Event Date:</strong> ${escapeHtml(entry.event_date)}</p>
    <p><strong>Event Location:</strong> ${escapeHtml(entry.event_location)}</p>
    <hr>
    <h3>Registration Details</h3>
    <p><strong>Name:</strong> ${escapeHtml(entry.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(entry.email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(entry.phone_number)}</p>
    <p><strong>Gender:</strong> ${escapeHtml(entry.gender)}</p>
    <p><strong>Profession:</strong> ${escapeHtml(entry.profession)}</p>
    <p><strong>Location Preference:</strong> ${escapeHtml(entry.location_preference)}</p>
    <p><strong>Needs Directions:</strong> ${entry.needs_directions ? 'Yes' : 'No'}</p>
    <p><strong>Ticket Number:</strong> ${escapeHtml(entry.ticket_number)}</p>
    ${entry.notes ? `<p><strong>Notes:</strong> ${escapeHtml(entry.notes)}</p>` : ''}
    <hr>
    <p style="color: #666; font-size: 0.9em;">This is an automated notification from the Spinwellness event registration system.</p>
  `;

  const emailPayload = {
    from: 'Spinwellness Events <admin@spinwellnessandyoga.com>',
    to: [adminEmail],
    subject: `New Registration: ${entry.event_name} - ${entry.name}`,
    html: emailBody,
  };

  try {
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send(emailPayload);
    if (result.error) {
      console.log('[sendEventRegistrationNotification] Email sending failed (non-blocking):', result.error.message || 'domain not verified');
    } else {
      console.log('[sendEventRegistrationNotification] Notification email sent successfully');
    }
  } catch (error) {
    console.log('[sendEventRegistrationNotification] Email sending failed (non-blocking):', error instanceof Error ? error.message : 'unknown error');
  }
}

export async function sendEventRegistrationConfirmation(entry: {
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
    console.error('[sendEventRegistrationConfirmation] RESEND_API_KEY not found');
    return;
  }

  const logoUrl = 'https://spinwellnessandyoga.com/logos/SWAY-Primary-logo-(iteration).png';

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
        <img src="${logoUrl}" alt="Spinwellness & Yoga" style="max-width: 350px; width: 100%; height: auto; margin-bottom: 20px;" />
        <h1 style="color: #151b47; font-size: 28px; margin: 0 0 10px;">You&apos;re Registered!</h1>
      </div>
      
      <div style="background: linear-gradient(135deg, #f16f64 0%, #e85a50 100%); padding: 30px; border-radius: 12px; margin-bottom: 30px; color: white; text-align: center;">
        <h2 style="color: white; margin: 0 0 15px; font-size: 24px;">${escapeHtml(entry.event_name)}</h2>
        <p style="color: rgba(255, 255, 255, 0.95); margin: 5px 0; font-size: 16px;"><strong>Date:</strong> ${escapeHtml(entry.event_date)}</p>
        <p style="color: rgba(255, 255, 255, 0.95); margin: 5px 0; font-size: 16px;"><strong>Location:</strong> ${escapeHtml(entry.event_location)}</p>
        ${entry.event_venue ? `<p style="color: rgba(255, 255, 255, 0.95); margin: 5px 0; font-size: 16px;"><strong>Venue:</strong> ${escapeHtml(entry.event_venue)}</p>` : ''}
      </div>
      
      <div style="background: #fef9f5; padding: 30px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #f16f64;">
        <p style="margin: 0 0 15px; font-size: 16px;">Hi ${escapeHtml(entry.name)},</p>
        <p style="margin: 0 0 15px; font-size: 16px;">Thank you for registering for <strong>${escapeHtml(entry.event_name)}</strong>! We&apos;re excited to have you join us.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #f16f64;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Ticket Number</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f16f64; letter-spacing: 2px;">${escapeHtml(entry.ticket_number)}</p>
        </div>
        <p style="margin: 15px 0; font-size: 16px;">Please save this email and bring your ticket number with you to the event.</p>
        <p style="margin: 0; font-size: 16px;">We look forward to seeing you there!</p>
      </div>
      
      <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; font-size: 14px; margin: 0;">Spinwellness & Yoga | Transform Employee Wellness</p>
      </div>
    </div>
  `;

  const emailPayload = {
    from: 'Spinwellness & Yoga <admin@spinwellnessandyoga.com>',
    to: [entry.email],
    subject: `Registration Confirmed: ${entry.event_name}`,
    html: emailBody,
  };

  try {
    const resend = new Resend(resendApiKey);
    const result = await resend.emails.send(emailPayload);
    if (result.error) {
      console.log('[sendEventRegistrationConfirmation] Email sending failed (non-blocking):', result.error.message || 'domain not verified');
    } else {
      console.log('[sendEventRegistrationConfirmation] Confirmation email sent successfully');
    }
  } catch (error) {
    console.log('[sendEventRegistrationConfirmation] Email sending failed (non-blocking):', error instanceof Error ? error.message : 'unknown error');
  }
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

  const logoUrl = 'https://spinwellnessandyoga.com/logos/SWAY-Primary-logo-(iteration).png';

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
        <img src="${logoUrl}" alt="Spinwellness & Yoga" style="max-width: 350px; width: 100%; height: auto; margin-bottom: 20px;" />
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
