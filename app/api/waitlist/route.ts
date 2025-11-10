import { NextResponse } from "next/server";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  company: string;
  teamSize?: string;
  priority?: string;
  createdAt: Date;
}

const waitlistStore: WaitlistEntry[] = [];

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

    const emailExists = waitlistStore.some((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return NextResponse.json(
        { success: false, error: "Email already on waitlist" },
        { status: 409 }
      );
    }

    const entry: WaitlistEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      email,
      company,
      teamSize,
      priority,
      createdAt: new Date(),
    };

    waitlistStore.push(entry);

    return NextResponse.json(
      {
        success: true,
        message: "Added to waitlist successfully",
        entry: {
          id: entry.id,
          name: entry.name,
          company: entry.company,
          teamSize: entry.teamSize,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    total: waitlistStore.length,
    entries: waitlistStore,
  });
}
