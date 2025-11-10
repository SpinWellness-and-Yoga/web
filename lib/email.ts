function getEnvVar(key: string, env?: any): string | undefined {
  console.log(`[getEnvVar] Looking for ${key}, env provided:`, !!env);
  
  // cloudflare workers - env passed from request context
  if (env) {
    console.log(`[getEnvVar] Env object keys:`, Object.keys(env));
    if (env[key]) {
      console.log(`[getEnvVar] Found ${key} in env[key]`);
      return env[key];
    }
    if (env.env?.[key]) {
      console.log(`[getEnvVar] Found ${key} in env.env[key]`);
      return env.env[key];
    }
    // check for nested structures
    if (env.vars?.[key]) {
      console.log(`[getEnvVar] Found ${key} in env.vars[key]`);
      return env.vars[key];
    }
  }
  
  // node.js / local development
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key];
    if (value) {
      console.log(`[getEnvVar] Found ${key} in process.env`);
      return value;
    }
  }
  
  // cloudflare workers global - check multiple locations
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    
    // standard cloudflare workers env location
    if (g.env?.[key]) {
      console.log(`[getEnvVar] Found ${key} in globalThis.env`);
      return g.env[key];
    }
    
    // direct global access
    if (g[key]) {
      console.log(`[getEnvVar] Found ${key} in globalThis[key]`);
      return g[key];
    }
    
    // check for cloudflare-specific locations
    if (g.__env__?.[key]) {
      console.log(`[getEnvVar] Found ${key} in globalThis.__env__`);
      return g.__env__[key];
    }
  }
  
  console.log(`[getEnvVar] ${key} not found in any location`);
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
  const adminEmail = getEnvVar('ADMIN_EMAIL', env) || 'admin@spinwellness.org';

  console.log('[sendWaitlistNotification] Starting...');
  console.log('[sendWaitlistNotification] Resend API Key present:', !!resendApiKey);
  console.log('[sendWaitlistNotification] Admin Email:', adminEmail);
  console.log('[sendWaitlistNotification] Entry:', JSON.stringify(entry, null, 2));

  if (!resendApiKey) {
    console.error('[sendWaitlistNotification] RESEND_API_KEY not set, skipping email notification');
    console.error('[sendWaitlistNotification] Env object keys:', env ? Object.keys(env) : 'no env');
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
    from: 'Spinwellness Waitlist <noreply@spinwellness.org>',
    to: [adminEmail],
    subject: `New Waitlist Entry: ${entry.full_name} from ${entry.company}`,
    html: emailBody,
  };

  console.log('[sendWaitlistNotification] Sending email to Resend API...');
  console.log('[sendWaitlistNotification] Payload:', JSON.stringify({ ...emailPayload, html: '[HTML content]' }, null, 2));

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    console.log('[sendWaitlistNotification] Response status:', response.status);
    console.log('[sendWaitlistNotification] Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('[sendWaitlistNotification] Response body:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { raw: responseText };
      }
      console.error('[sendWaitlistNotification] Resend API error:', errorData);
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    let successData;
    try {
      successData = JSON.parse(responseText);
    } catch {
      successData = { raw: responseText };
    }
    console.log('[sendWaitlistNotification] Email sent successfully:', successData);
  } catch (error) {
    console.error('[sendWaitlistNotification] Failed to send email notification:', error);
    console.error('[sendWaitlistNotification] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // don't throw - email failure shouldn't break form submission
  }
}

export async function sendWaitlistConfirmation(entry: {
  full_name: string;
  email: string;
  company: string;
}, env?: any): Promise<void> {
  const resendApiKey = getEnvVar('RESEND_API_KEY', env);

  console.log('[sendWaitlistConfirmation] Starting...');
  console.log('[sendWaitlistConfirmation] Resend API Key present:', !!resendApiKey);
  console.log('[sendWaitlistConfirmation] Entry:', JSON.stringify(entry, null, 2));

  if (!resendApiKey) {
    console.error('[sendWaitlistConfirmation] RESEND_API_KEY not set, skipping confirmation email');
    console.error('[sendWaitlistConfirmation] Env object keys:', env ? Object.keys(env) : 'no env');
    return;
  }

  const logoUrl = 'https://spinwellness.org/logos/SWAY-Alt-logo-PNG.png';

  const emailBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #151b47; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoUrl}" alt="Spinwellness & Yoga" style="max-width: 200px; height: auto; margin-bottom: 20px;" />
        <h1 style="color: #151b47; font-size: 28px; margin: 0 0 10px;">Thank you for joining our waitlist!</h1>
        <p style="color: #f16f64; font-size: 18px; margin: 0; font-style: italic;">...the OM of bliss</p>
      </div>
      
      <p style="font-size: 16px; color: #151b47;">Hi ${entry.full_name},</p>
      
      <p style="font-size: 16px; color: #151b47;">
        We're thrilled that you and <strong>${entry.company}</strong> are interested in transforming workplace wellness with us.
      </p>
      
      <p style="font-size: 16px; color: #151b47;">
        You're now on our waitlist and will be among the first to experience our corporate wellness programs:
      </p>
      
      <ul style="font-size: 16px; color: #151b47; padding-left: 20px;">
        <li>Comprehensive corporate wellness programs designed for modern teams</li>
        <li>Productivity optimization powered by sustainable energy, not burnout</li>
        <li>Employee wellbeing embedded in every workday</li>
        <li>Wellness culture transformation that helps teams thrive together</li>
      </ul>
      
      <p style="font-size: 16px; color: #151b47;">
        We'll be in touch soon with updates and early access opportunities. In the meantime, if you have any questions, please reach out to us through our <a href="https://spinwellness.org/contact" style="color: #f16f64; text-decoration: underline;">contact form</a>.
      </p>
      
      <p style="font-size: 16px; color: #151b47;">
        With gratitude,<br>
        <strong>Ajoke Ibrahim</strong><br>
        <span style="font-size: 14px; color: #666;">CEO, Spinwellness & Yoga</span>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      
      <p style="font-size: 12px; color: #666; margin: 0;">
        Spinwellness & Yoga — wellness, therapy, and culture design for modern teams.
      </p>
    </div>
  `;

  const emailPayload = {
    from: 'Ajoke Ibrahim <ajoke@spinwellness.org>',
    to: [entry.email],
    subject: 'Welcome to the Spinwellness Waitlist',
    html: emailBody,
  };

  console.log('[sendWaitlistConfirmation] Sending email to Resend API...');
  console.log('[sendWaitlistConfirmation] Payload:', JSON.stringify({ ...emailPayload, html: '[HTML content]' }, null, 2));

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    console.log('[sendWaitlistConfirmation] Response status:', response.status);
    console.log('[sendWaitlistConfirmation] Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('[sendWaitlistConfirmation] Response body:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { raw: responseText };
      }
      console.error('[sendWaitlistConfirmation] Resend API error:', errorData);
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    let successData;
    try {
      successData = JSON.parse(responseText);
    } catch {
      successData = { raw: responseText };
    }
    console.log('[sendWaitlistConfirmation] Email sent successfully:', successData);
  } catch (error) {
    console.error('[sendWaitlistConfirmation] Failed to send confirmation email:', error);
    console.error('[sendWaitlistConfirmation] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // don't throw - email failure shouldn't break form submission
  }
}

export async function sendContactNotification(entry: {
  name: string;
  email: string;
  message: string;
}, env?: any): Promise<void> {
  const resendApiKey = getEnvVar('RESEND_API_KEY', env);
  const adminEmail = getEnvVar('ADMIN_EMAIL', env) || 'admin@spinwellness.org';

  console.log('[sendContactNotification] Starting...');
  console.log('[sendContactNotification] Resend API Key present:', !!resendApiKey);
  console.log('[sendContactNotification] Admin Email:', adminEmail);
  console.log('[sendContactNotification] Entry:', JSON.stringify({ ...entry, message: entry.message.substring(0, 50) + '...' }, null, 2));

  if (!resendApiKey) {
    console.error('[sendContactNotification] RESEND_API_KEY not set, skipping contact notification');
    console.error('[sendContactNotification] Env object keys:', env ? Object.keys(env) : 'no env');
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
    from: 'Spinwellness Contact Form <noreply@spinwellness.org>',
    to: [adminEmail],
    subject: `New Contact: ${entry.name}`,
    html: emailBody,
  };

  console.log('[sendContactNotification] Sending email to Resend API...');
  console.log('[sendContactNotification] Payload:', JSON.stringify({ ...emailPayload, html: '[HTML content]' }, null, 2));

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    console.log('[sendContactNotification] Response status:', response.status);
    console.log('[sendContactNotification] Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('[sendContactNotification] Response body:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { raw: responseText };
      }
      console.error('[sendContactNotification] Resend API error:', errorData);
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    let successData;
    try {
      successData = JSON.parse(responseText);
    } catch {
      successData = { raw: responseText };
    }
    console.log('[sendContactNotification] Email sent successfully:', successData);
  } catch (error) {
    console.error('[sendContactNotification] Failed to send contact notification:', error);
    console.error('[sendContactNotification] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

export async function sendContactConfirmation(entry: {
  name: string;
  email: string;
}, env?: any): Promise<void> {
  const resendApiKey = getEnvVar('RESEND_API_KEY', env);

  console.log('[sendContactConfirmation] Starting...');
  console.log('[sendContactConfirmation] Resend API Key present:', !!resendApiKey);
  console.log('[sendContactConfirmation] Entry:', JSON.stringify(entry, null, 2));

  if (!resendApiKey) {
    console.error('[sendContactConfirmation] RESEND_API_KEY not set, skipping contact confirmation');
    console.error('[sendContactConfirmation] Env object keys:', env ? Object.keys(env) : 'no env');
    return;
  }

  const logoUrl = 'https://spinwellness.org/logos/SWAY-Alt-logo-PNG.png';

  const emailBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #151b47; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${logoUrl}" alt="Spinwellness & Yoga" style="max-width: 200px; height: auto; margin-bottom: 20px;" />
        <h1 style="color: #151b47; font-size: 28px; margin: 0 0 10px;">Thank you for reaching out!</h1>
        <p style="color: #f16f64; font-size: 18px; margin: 0; font-style: italic;">...the OM of bliss</p>
      </div>
      
      <p style="font-size: 16px; color: #151b47;">Hi ${entry.name},</p>
      
      <p style="font-size: 16px; color: #151b47;">
        We've received your message and will get back to you soon. Our team is excited to learn more about how we can support your workplace wellness goals.
      </p>
      
      <p style="font-size: 16px; color: #151b47;">
        In the meantime, feel free to explore our <a href="https://spinwellness.org" style="color: #f16f64; text-decoration: underline;">website</a> to learn more about our corporate wellness programs.
      </p>
      
      <p style="font-size: 16px; color: #151b47;">
        With gratitude,<br>
        <strong>Ajoke Ibrahim</strong><br>
        <span style="font-size: 14px; color: #666;">CEO, Spinwellness & Yoga</span>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
      
      <p style="font-size: 12px; color: #666; margin: 0;">
        Spinwellness & Yoga — wellness, therapy, and culture design for modern teams.
      </p>
    </div>
  `;

  const emailPayload = {
    from: 'Ajoke Ibrahim <ajoke@spinwellness.org>',
    to: [entry.email],
    subject: 'We received your message',
    html: emailBody,
  };

  console.log('[sendContactConfirmation] Sending email to Resend API...');
  console.log('[sendContactConfirmation] Payload:', JSON.stringify({ ...emailPayload, html: '[HTML content]' }, null, 2));

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    console.log('[sendContactConfirmation] Response status:', response.status);
    console.log('[sendContactConfirmation] Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('[sendContactConfirmation] Response body:', responseText);

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { raw: responseText };
      }
      console.error('[sendContactConfirmation] Resend API error:', errorData);
      throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    let successData;
    try {
      successData = JSON.parse(responseText);
    } catch {
      successData = { raw: responseText };
    }
    console.log('[sendContactConfirmation] Email sent successfully:', successData);
  } catch (error) {
    console.error('[sendContactConfirmation] Failed to send contact confirmation:', error);
    console.error('[sendContactConfirmation] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

