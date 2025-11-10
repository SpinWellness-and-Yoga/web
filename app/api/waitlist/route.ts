import { NextResponse } from "next/server";
import { addEntry, getAllEntries, type WaitlistEntry } from "@/lib/waitlist-storage";

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

    const id = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const entry: WaitlistEntry = {
      id,
      full_name: name,
      email,
      company,
      team_size: teamSize,
      priority,
    };

    try {
      await addEntry(entry);
    } catch (error: any) {
      if (error.message === 'Email already on waitlist') {
        return NextResponse.json(
          { success: false, error: "Email already on waitlist" },
          { status: 409 }
        );
      }
      throw error;
    }

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
    const entries = await getAllEntries();

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
