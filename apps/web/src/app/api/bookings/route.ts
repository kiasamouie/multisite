import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendBookingEmails } from "@repo/lib/resend/booking-emails";
import { hasFlag } from "@repo/lib/flags/check";
import { rateLimit } from "@repo/lib/ratelimit";
import { createAdminClient } from "@repo/lib/supabase/admin";

// Middleware injects `x-tenant-domain` on every public API request based on
// the request host (e.g. kaimusic.localhost). No fallback needed.
function getTenantDomain(request: NextRequest): string | null {
  const raw = request.headers.get("x-tenant-domain");
  return raw ? raw.toLowerCase().replace(/:\d+$/, "") : null;
}

const BookingSchema = z.object({
  customer_name: z.string().min(1).max(200).trim(),
  customer_email: z.string().email().max(320),
  customer_phone: z.string().max(50).optional(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  booking_time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  party_size: z.number().int().min(1).max(100).default(1),
  service_label: z.string().max(200).optional(),
  special_notes: z.string().max(1000).optional(),
});

// ── GET /api/bookings?date=YYYY-MM-DD ─────────────────────────────────────
// Returns the list of already-booked times for a tenant+date so the
// BookingBlock can filter out unavailable slots in real time.
export async function GET(request: NextRequest) {
  const domain = getTenantDomain(request);
  if (!domain) {
    return NextResponse.json({ bookedTimes: [] });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Missing or invalid date" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", domain)
    .single();

  if (!tenant) {
    // Unknown tenant — return empty so the form still shows all slots
    return NextResponse.json({ bookedTimes: [] });
  }

  // Only pending + confirmed bookings block a slot
  const { data: bookings } = await supabase
    .from("bookings")
    .select("booking_time")
    .eq("tenant_id", tenant.id)
    .eq("booking_date", date)
    .in("status", ["pending", "confirmed"]);

  const bookedTimes = (bookings ?? []).map((b) =>
    // Normalise HH:MM:SS → HH:MM
    (b.booking_time as string).slice(0, 5)
  );

  return NextResponse.json({ bookedTimes });
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = await rateLimit(`booking:${ip}`, 10, 60_000);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = BookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid booking data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const domain = getTenantDomain(request);
    if (!domain) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const supabase = createAdminClient();
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, name, slug, from_email")
      .eq("domain", domain)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Check feature flag — only Growth+ tenants have booking_system
    const allowed = await hasFlag(tenant.id, "booking_system");
    if (!allowed) {
      return NextResponse.json(
        { error: "Booking system is not available on your current plan" },
        { status: 403 }
      );
    }

    // Insert booking
    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        tenant_id: tenant.id,
        customer_name: parsed.data.customer_name,
        customer_email: parsed.data.customer_email,
        customer_phone: parsed.data.customer_phone ?? null,
        booking_date: parsed.data.booking_date,
        booking_time: parsed.data.booking_time,
        party_size: parsed.data.party_size,
        service_label: parsed.data.service_label ?? null,
        special_notes: parsed.data.special_notes ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !booking) {
      console.error("[bookings] Insert error:", insertError);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    // Fire-and-forget notification emails — never block the response
    sendBookingEmails({
      tenant,
      booking: parsed.data,
      supabase,
    }).catch((err) => console.error("[bookings] Email error:", err));

    return NextResponse.json({ success: true, bookingId: booking.id }, { status: 201 });
  } catch (error) {
    console.error("[bookings] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


