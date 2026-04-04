import { NextResponse, type NextRequest } from "next/server";
import { contactFormSchema } from "@repo/lib/validation/schemas";
import { sendEmail } from "@repo/lib/resend/client";
import { contactFormEmail } from "@repo/lib/resend/templates";
import { trackEvent } from "@repo/lib/events/track";
import { rateLimit } from "@repo/lib/ratelimit";
import { createAdminClient } from "@repo/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = await rateLimit(`contact:${ip}`, 5, 60_000);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = contactFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Resolve tenant from domain header
    const domain = request.headers.get("x-tenant-domain");
    if (!domain) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, from_email")
      .eq("domain", domain)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Send email
    const html = contactFormEmail({
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
      tenantName: tenant.name,
    });

    await sendEmail({
      to: tenant.from_email || process.env.RESEND_FROM_EMAIL || "noreply@yourplatform.com",
      subject: `Contact Form: ${parsed.data.name}`,
      html,
      replyTo: parsed.data.email,
    });

    // Track event
    await trackEvent(tenant.id, "form_submission", {
      form: "contact",
      name: parsed.data.name,
      email: parsed.data.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[contact] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
