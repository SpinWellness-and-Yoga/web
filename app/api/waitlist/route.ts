import { NextResponse } from "next/server";
import { sendWaitlistNotification, sendWaitlistConfirmation } from "@/lib/email";

function getEnvFromRequest(request: Request): any {
  const req = request as any;
  
  // opennext cloudflare passes env through various locations
  if (req.env) return req.env;
  if (req.ctx?.env) return req.ctx.env;
  if (req.cloudflare?.env) return req.cloudflare.env;
  if (req.runtime?.env) return req.runtime.env;
  
  // cloudflare workers global - dashboard vars are available here
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    if (g.env) return g.env;
    if (g.__env__) return g.__env__;
    if (g.__CLOUDFLARE_ENV__) return g.__CLOUDFLARE_ENV__;
  }
  
  return undefined;
}

export async function POST(request: Request) {
  try {
    const env = getEnvFromRequest(request);
    
    // log what we found for debugging
    console.log('[waitlist POST] Env from request:', env ? { hasKeys: Object.keys(env).length > 0, keys: Object.keys(env) } : 'not found');
    
    // also check globalThis directly
    if (typeof globalThis !== 'undefined') {
      const g = globalThis as any;
      console.log('[waitlist POST] globalThis.env exists:', !!g.env);
      console.log('[waitlist POST] globalThis.env keys:', g.env ? Object.keys(g.env) : 'none');
      console.log('[waitlist POST] RESEND_API_KEY in globalThis.env:', !!g.env?.RESEND_API_KEY);
    }
    
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

    // send emails - await to ensure they complete and we can see logs
    console.log('[waitlist POST] Starting email sends...');
    
    try {
      await sendWaitlistNotification(entry, env);
      console.log('[waitlist POST] Notification email completed');
    } catch (err) {
      console.error('[waitlist POST] Email notification failed:', err);
    }
    
    try {
      await sendWaitlistConfirmation({
        full_name: entry.full_name,
        email: entry.email,
        company: entry.company,
      }, env);
      console.log('[waitlist POST] Confirmation email completed');
    } catch (err) {
      console.error('[waitlist POST] Confirmation email failed:', err);
    }
    
    console.log('[waitlist POST] All email operations finished');

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
