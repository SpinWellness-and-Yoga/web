import { NextResponse } from "next/server";
import { sendContactNotification, sendContactConfirmation } from "../../../lib/email";
import { logger } from "../../../lib/logger";

function getEnvFromRequest(request: Request): any {
  const req = request as any;
  
  if (req.env) return req.env;
  if (req.ctx?.env) return req.ctx.env;
  if (req.cloudflare?.env) return req.cloudflare.env;
  if (req.runtime?.env) return req.runtime.env;
  
  if (typeof globalThis !== 'undefined') {
    const g = globalThis as any;
    if (g.env) return g.env;
    if (g.__env__) return g.__env__;
    if (g.__CLOUDFLARE_ENV__) return g.__CLOUDFLARE_ENV__;
  }
  
  return undefined;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const env = getEnvFromRequest(request) || process.env;
    const body = await request.json();
    const name = body.name?.toString().trim() ?? "";
    const email = body.email?.toString().trim() ?? "";
    const message = body.message?.toString().trim() ?? "";

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "name, email, and message are required" },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, error: "invalid email format" },
        { status: 400 }
      );
    }

    // await email sends so serverless/worker runtimes don't terminate early
    const emailTimeoutMs = 8000;
    const emailTasks = [
      sendContactNotification({ name, email, message }, env),
      sendContactConfirmation({ name, email }, env),
    ];
    const settled = await Promise.race([
      Promise.allSettled(emailTasks),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), emailTimeoutMs)),
    ]);

    if (settled === 'timeout') {
      logger.warn('contact email send timed out', { timeout_ms: emailTimeoutMs });
    } else {
      const failed = settled.filter((r) => r.status === 'rejected').length;
      if (failed > 0) logger.warn('contact email send had failures', { failed, total: settled.length });
    }

    return NextResponse.json(
      {
        success: true,
        message: "message sent successfully",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ success: false, error: "internal server error" }, { status: 500 });
  }
}
