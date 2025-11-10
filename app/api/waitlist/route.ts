import { NextResponse } from "next/server";
import { sendWaitlistNotification, sendWaitlistConfirmation } from "@/lib/email";

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

    const entry = {
      full_name: name,
      email,
      company,
      team_size: teamSize,
      priority,
    };

    // send emails (non-blocking)
    // notify admin
    sendWaitlistNotification(entry).catch((err) => {
      console.error('Email notification failed:', err);
    });
    
    // send confirmation to user
    sendWaitlistConfirmation({
      full_name: entry.full_name,
      email: entry.email,
      company: entry.company,
    }).catch((err) => {
      console.error('Confirmation email failed:', err);
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
