import { NextResponse } from "next/server";
import { sendWaitlistNotification, sendWaitlistConfirmation } from "@/lib/email";

function getEnvFromRequest(request: Request): any {
  const req = request as any;
  
  console.log('[getEnvFromRequest] Checking request object for env...');
  console.log('[getEnvFromRequest] Request keys:', Object.keys(req).filter(k => !k.startsWith('_')));
  
  // opennext cloudflare passes env through various locations
  if (req.env) {
    console.log('[getEnvFromRequest] Found env in req.env');
    return req.env;
  }
  if (req.ctx?.env) {
    console.log('[getEnvFromRequest] Found env in req.ctx.env');
    return req.ctx.env;
  }
  if (req.cloudflare?.env) {
    console.log('[getEnvFromRequest] Found env in req.cloudflare.env');
    return req.cloudflare.env;
  }
  if (req.runtime?.env) {
    console.log('[getEnvFromRequest] Found env in req.runtime.env');
    return req.runtime.env;
  }
  
  // cloudflare workers global - check multiple locations
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    
    if (g.env) {
      console.log('[getEnvFromRequest] Found env in globalThis.env');
      return g.env;
    }
    
    if (g.__env__) {
      console.log('[getEnvFromRequest] Found env in globalThis.__env__');
      return g.__env__;
    }
    
    // check for cloudflare workers context
    if (g.__CLOUDFLARE_ENV__) {
      console.log('[getEnvFromRequest] Found env in globalThis.__CLOUDFLARE_ENV__');
      return g.__CLOUDFLARE_ENV__;
    }
  }
  
  console.log('[getEnvFromRequest] No env found in request or global scope');
  return undefined;
}

export async function POST(request: Request) {
  try {
    const env = getEnvFromRequest(request);
    console.log('[waitlist POST] Env object:', env ? { keys: Object.keys(env), hasResendKey: !!env.RESEND_API_KEY, hasAdminEmail: !!env.ADMIN_EMAIL } : 'no env');
    const contentType = request.headers.get("content-type") ?? "";

    let name = "";
    let email = "";
    let company = "";
    let teamSize: string | undefined;
    let priority: string | undefined;

    if (contentType.includes("application/json")) {
      const body = await request.json();
      name = body.name?.toString().trim() ?? "";
      email = body.email?.toString().trim() ?? "";
      company = body.company?.toString().trim() ?? "";
      teamSize = body.teamSize?.toString().trim() || undefined;
      priority = body.priority?.toString().trim() || undefined;
    } else {
      const form = await request.formData();
      name = (form.get("name") ?? "").toString().trim();
      email = (form.get("email") ?? "").toString().trim();
      company = (form.get("company") ?? "").toString().trim();
      teamSize = form.get("teamSize")?.toString().trim() || undefined;
      priority = form.get("priority")?.toString().trim() || undefined;
    }

    if (!name || !email || !company) {
      return NextResponse.json(
        { success: false, error: "Name, email, and company are required" },
        { status: 400 }
      );
    }

    const entry = {
      full_name: name,
      email,
      company,
      team_size: teamSize,
      priority,
    };

    // send emails (non-blocking)
    console.log('[waitlist POST] Starting email sends...');
    // notify admin
    sendWaitlistNotification(entry, env).catch((err) => {
      console.error('[waitlist POST] Email notification failed:', err);
    });
    
    // send confirmation to user
    sendWaitlistConfirmation({
      full_name: entry.full_name,
      email: entry.email,
      company: entry.company,
    }, env).catch((err) => {
      console.error('[waitlist POST] Confirmation email failed:', err);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Added to waitlist successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
