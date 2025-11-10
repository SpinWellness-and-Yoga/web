import { NextResponse } from "next/server";
import { getD1Database } from "@/lib/d1";

// cloudflare workers runtime - env is available globally
declare global {
  var DATABASE: D1Database | undefined;
  var DB: D1Database | undefined;
  var env: { DATABASE?: D1Database; DB?: D1Database } | undefined;
}

interface WaitlistEntry {
  id: string;
  full_name: string;
  email: string;
  company: string;
  team_size?: string;
  priority?: string;
}

export async function POST(request: Request) {
  try {
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

    const db = getD1Database(request);
    if (!db) {
      // debug logging to help diagnose
      if (typeof globalThis !== 'undefined') {
        const g = globalThis as any;
        console.error("Database not found. Checking globalThis...");
        console.error("globalThis.env exists:", !!g.env);
        if (g.env) console.error("globalThis.env keys:", Object.keys(g.env));
      }
      return NextResponse.json(
        { success: false, error: "Database not available. Check server logs for debug info." },
        { status: 500 }
      );
    }

    const existing = await db
      .prepare("SELECT id FROM waitlist WHERE LOWER(email) = LOWER(?)")
      .bind(email)
      .first();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already on waitlist" },
        { status: 409 }
      );
    }

    const id = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await db
      .prepare(
        "INSERT INTO waitlist (id, full_name, email, company, team_size, priority) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .bind(id, name, email, company, teamSize || null, priority || null)
      .run();

    const entry: WaitlistEntry = {
      id,
      full_name: name,
      email,
      company,
      team_size: teamSize,
      priority,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Added to waitlist successfully",
        entry: {
          id: entry.id,
          full_name: entry.full_name,
          company: entry.company,
          team_size: entry.team_size,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const db = getD1Database(request);
    if (!db) {
      // debug logging
      if (typeof globalThis !== 'undefined') {
        const g = globalThis as any;
        console.error("Database not found. Checking globalThis...");
        console.error("globalThis.env exists:", !!g.env);
        if (g.env) console.error("globalThis.env keys:", Object.keys(g.env));
      }
      return NextResponse.json(
        { success: false, error: "Database not available. Check server logs for debug info." },
        { status: 500 }
      );
    }

    const result = await db
      .prepare("SELECT id, full_name, email, company, team_size, priority FROM waitlist ORDER BY id DESC")
      .all();

    const entries: WaitlistEntry[] = (result.results || []).map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      company: row.company,
      team_size: row.team_size || undefined,
      priority: row.priority || undefined,
    }));

    return NextResponse.json({
      success: true,
      total: entries.length,
      entries,
    });
  } catch (error) {
    console.error("Waitlist GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
