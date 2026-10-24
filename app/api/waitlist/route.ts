import { NextResponse } from "next/server";
import { sendWaitlistNotification, sendWaitlistConfirmation } from "../../../lib/email";
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

export async function POST(request: Request) {
  try {
    const env = getEnvFromRequest(request) || process.env;
    
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
        { success: false, error: "name, email, and company are required" },
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

    // await email sends so serverless/worker runtimes don't terminate early
    const emailTimeoutMs = 8000;
    const emailTasks = [
      sendWaitlistNotification(entry, env),
      sendWaitlistConfirmation(
        {
          full_name: entry.full_name,
          email: entry.email,
          company: entry.company,
        },
        env
      ),
    ];
    const settled = await Promise.race([
      Promise.allSettled(emailTasks),
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), emailTimeoutMs)),
    ]);

    if (settled === 'timeout') {
      logger.warn('waitlist email send timed out', { timeout_ms: emailTimeoutMs });
    } else {
      const failed = settled.filter((r) => r.status === 'rejected').length;
      if (failed > 0) logger.warn('waitlist email send had failures', { failed, total: settled.length });
    }

    return NextResponse.json(
      {
        success: true,
        message: "added to waitlist successfully",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ success: false, error: "internal server error" }, { status: 500 });
  }
}
