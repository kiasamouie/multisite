import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { isPlatformAdmin } from "@repo/lib/tenant/platform";
import { resolveTenantsByUserId } from "@repo/lib/tenant/resolver";
import { sendBookingEmails } from "@repo/lib/resend/booking-emails";

const UpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed", "noshow"]).optional(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  booking_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getAuthContext() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const platformAdmin = await isPlatformAdmin(user.id);
  let allowedTenantIds: number[] | null = null;

  if (!platformAdmin) {
    const tenants = await resolveTenantsByUserId(user.id);
    allowedTenantIds = tenants?.map((t) => t.id) ?? [];
  }

  return { user, platformAdmin, allowedTenantIds };
}

// ── GET /api/admin/bookings ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const search = searchParams.get("search");

  // If tenant admin, they may only request their own tenant
  if (!auth.platformAdmin && tenantId) {
    const tid = parseInt(tenantId);
    if (!auth.allowedTenantIds?.includes(tid)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("bookings")
    .select("*, tenants(id, name, slug)")
    .order("booking_date", { ascending: false })
    .order("booking_time", { ascending: false });

  // Scope to tenant: explicit param > inferred from membership
  if (tenantId) {
    query = query.eq("tenant_id", parseInt(tenantId));
  } else if (!auth.platformAdmin && auth.allowedTenantIds && auth.allowedTenantIds.length > 0) {
    query = query.in("tenant_id", auth.allowedTenantIds);
  }

  if (status) query = query.eq("status", status);
  if (date) query = query.eq("booking_date", date);
  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/bookings GET]", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

// ── PATCH /api/admin/bookings ─────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;
  const supabase = createAdminClient();

  // Verify the booking belongs to an allowed tenant
  if (!auth.platformAdmin) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("tenant_id")
      .eq("id", id)
      .single();

    if (!booking || !auth.allowedTenantIds?.includes(booking.tenant_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[admin/bookings PATCH]", error);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ── DELETE /api/admin/bookings ────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = createAdminClient();

  // Verify ownership before deleting
  if (!auth.platformAdmin) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("tenant_id")
      .eq("id", id)
      .single();

    if (!booking || !auth.allowedTenantIds?.includes(booking.tenant_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) {
    console.error("[admin/bookings DELETE]", error);
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── POST /api/admin/bookings — resend booking emails ──────────────────────────

export async function POST(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = z.object({ id: z.string().uuid() }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid booking id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, tenants(id, name, slug, from_email)")
    .eq("id", parsed.data.id)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Tenant access check for non-platform admins
  if (!auth.platformAdmin) {
    if (!auth.allowedTenantIds?.includes(booking.tenant_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const tenant = booking.tenants as { id: number; name: string; slug: string | null; from_email: string | null } | null;
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    await sendBookingEmails({
      tenant,
      booking: {
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        customer_phone: booking.customer_phone,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        party_size: booking.party_size,
        service_label: booking.service_label,
        special_notes: booking.special_notes,
      },
      supabase,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    console.error("[admin/bookings POST]", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
