import { NextResponse } from "next/server";
import { sendContactNotification, sendContactConfirmation } from "@/lib/email";

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
    console.log('[contact POST] Env object:', env ? { keys: Object.keys(env), hasResendKey: !!env.RESEND_API_KEY, hasAdminEmail: !!env.ADMIN_EMAIL } : 'no env');
    const body = await request.json();
    const name = body.name?.toString().trim() ?? "";
    const email = body.email?.toString().trim() ?? "";
    const message = body.message?.toString().trim() ?? "";

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // send emails (non-blocking)
    console.log('[contact POST] Starting email sends...');
    // notify admin
    sendContactNotification({ name, email, message }, env).catch((err) => {
      console.error('[contact POST] Contact notification failed:', err);
    });
    
    // send confirmation to user
    sendContactConfirmation({ name, email }, env).catch((err) => {
      console.error('[contact POST] Contact confirmation failed:', err);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Message sent successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

