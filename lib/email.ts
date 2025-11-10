import {Resend} from 'resend';

function getEnvVar(key: string, env?: any): string | undefined {
  // with nodejs_compat, process.env should work in cloudflare workers
  // try process.env first (works in both local and cloudflare with nodejs_compat)
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
  
  // try env parameter (from request context - cloudflare workers standard)
  if (env?.[key]) return env[key];
  if (env?.env?.[key]) return env.env[key];
  if (env?.vars?.[key]) return env.vars[key];
  
  // cloudflare workers global scope - dashboard vars might be here
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    
    // check env object
    if (g.env?.[key]) return g.env[key];
    
    // direct global access
    if (g[key]) return g[key];
    
    // alternative locations
    if (g.__env__?.[key]) return g.__env__[key];
    if (g.__CLOUDFLARE_ENV__?.[key]) return g.__CLOUDFLARE_ENV__[key];
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
  const adminEmail = getEnvVar('ADMIN_EMAIL', env) || 'admin@spinwellness.org';

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
    from: 'Spinwellness Waitlist <admin@spinwellness.org>',
    to: [adminEmail],
    subject: `New Waitlist Entry: ${entry.full_name} from ${entry.company}`,
    html: emailBody,
  };

  try {
    console.log('[sendWaitlistNotification] Attempting to send email to:', adminEmail);
    console.log('[sendWaitlistNotification] API key present:', !!resendApiKey);
    console.log('[sendWaitlistNotification] Creating Resend client...');
    
    const resend = new Resend(resendApiKey);
    console.log('[sendWaitlistNotification] Resend client created, calling send...');
    
    const result = await resend.emails.send(emailPayload);
    console.log('[sendWaitlistNotification] Resend call completed');
    console.log('[sendWaitlistNotification] Result:', JSON.stringify({ hasData: !!result.data, hasError: !!result.error }, null, 2));

    if (result.error) {
      console.error('[sendWaitlistNotification] Resend API error:', JSON.stringify(result.error, null, 2));
    } else {
      console.log('[sendWaitlistNotification] Email sent successfully:', JSON.stringify(result.data, null, 2));
    }
  } catch (error) {
    console.error('[sendWaitlistNotification] Exception caught:', error);
    console.error('[sendWaitlistNotification] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
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
    from: 'Ajoke Ibrahim <admin@spinwellness.org>',
    to: [entry.email],
    subject: 'Welcome to the Spinwellness Waitlist',
    html: emailBody,
  };

  try {
    console.log('[sendWaitlistConfirmation] Attempting to send email to:', entry.email);
    console.log('[sendWaitlistConfirmation] Creating Resend client...');
    
    const resend = new Resend(resendApiKey);
    console.log('[sendWaitlistConfirmation] Resend client created, calling send...');
    
    const result = await resend.emails.send(emailPayload);
    console.log('[sendWaitlistConfirmation] Resend call completed');
    console.log('[sendWaitlistConfirmation] Result:', JSON.stringify({ hasData: !!result.data, hasError: !!result.error }, null, 2));

    if (result.error) {
      console.error('[sendWaitlistConfirmation] Resend API error:', JSON.stringify(result.error, null, 2));
    } else {
      console.log('[sendWaitlistConfirmation] Email sent successfully:', JSON.stringify(result.data, null, 2));
    }
  } catch (error) {
    console.error('[sendWaitlistConfirmation] Exception caught:', error);
    console.error('[sendWaitlistConfirmation] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
  }
}

export async function sendContactNotification(entry: {
  name: string;
  email: string;
  message: string;
}, env?: any): Promise<void> {
  const resendApiKey = getEnvVar('RESEND_API_KEY', env);
  const adminEmail = getEnvVar('ADMIN_EMAIL', env) || 'admin@spinwellness.org';

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
    from: 'Spinwellness Contact Form <admin@spinwellness.org>',
    to: [adminEmail],
    subject: `New Contact: ${entry.name}`,
    html: emailBody,
  };

  try {
    console.log('[sendContactNotification] Attempting to send email to:', adminEmail);
    console.log('[sendContactNotification] Creating Resend client...');
    
    const resend = new Resend(resendApiKey);
    console.log('[sendContactNotification] Resend client created, calling send...');
    
    const result = await resend.emails.send(emailPayload);
    console.log('[sendContactNotification] Resend call completed');
    console.log('[sendContactNotification] Result:', JSON.stringify({ hasData: !!result.data, hasError: !!result.error }, null, 2));

    if (result.error) {
      console.error('[sendContactNotification] Resend API error:', JSON.stringify(result.error, null, 2));
    } else {
      console.log('[sendContactNotification] Email sent successfully:', JSON.stringify(result.data, null, 2));
    }
  } catch (error) {
    console.error('[sendContactNotification] Exception caught:', error);
    console.error('[sendContactNotification] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
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

  try {
    console.log('[sendContactConfirmation] Attempting to send email to:', entry.email);
    console.log('[sendContactConfirmation] Creating Resend client...');
    
    const resend = new Resend(resendApiKey);
    console.log('[sendContactConfirmation] Resend client created, calling send...');
    
    const result = await resend.emails.send(emailPayload);
    console.log('[sendContactConfirmation] Resend call completed');
    console.log('[sendContactConfirmation] Result:', JSON.stringify({ hasData: !!result.data, hasError: !!result.error }, null, 2));

    if (result.error) {
      console.error('[sendContactConfirmation] Resend API error:', JSON.stringify(result.error, null, 2));
    } else {
      console.log('[sendContactConfirmation] Email sent successfully:', JSON.stringify(result.data, null, 2));
    }
  } catch (error) {
    console.error('[sendContactConfirmation] Exception caught:', error);
    console.error('[sendContactConfirmation] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error,
    });
  }
}

