import { NextResponse } from "next/server";
import { sendContactNotification, sendContactConfirmation } from "@/lib/email";

export async function POST(request: Request) {
  try {
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
    // notify admin
    sendContactNotification({ name, email, message }).catch((err) => {
      console.error('Contact notification failed:', err);
    });
    
    // send confirmation to user
    sendContactConfirmation({ name, email }).catch((err) => {
      console.error('Contact confirmation failed:', err);
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

