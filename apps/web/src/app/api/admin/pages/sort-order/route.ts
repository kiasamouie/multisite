import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { getPlatformAdmin } from "@repo/lib/tenant/platform";
import { resolveTenantsByUserId } from "@repo/lib/tenant/resolver";

/**
 * PATCH /api/admin/pages/sort-order
 *
 * Body: { orders: { id: number; sort_order: number }[] }
 *
 * Persists a new sort_order for each page in a single batch.
 * - Platform admins may reorder pages across any tenant.
 * - Tenant members may only reorder pages they belong to (verified per page).
 */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { orders?: { id: number; sort_order: number }[] }
      | null;

    const orders = body?.orders;
    if (!Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ message: "Missing or invalid orders" }, { status: 400 });
    }

    // Validate shape
    for (const o of orders) {
      if (typeof o?.id !== "number" || typeof o?.sort_order !== "number") {
        return NextResponse.json({ message: "Each order must have numeric id and sort_order" }, { status: 400 });
      }
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const platformAdmin = await getPlatformAdmin(user.id);
    const admin = createAdminClient();

    // Authorization for non-platform-admins: ensure all page IDs belong to a
    // tenant the user is a member of.
    if (!platformAdmin) {
      const ids = orders.map(o => o.id);
      const { data: pages, error: fetchErr } = await admin
        .from("pages")
        .select("id, tenant_id")
        .in("id", ids);
      if (fetchErr) {
        return NextResponse.json({ message: "Failed to load pages" }, { status: 500 });
      }
      const tenants = await resolveTenantsByUserId(user.id);
      const allowedTenantIds = new Set((tenants ?? []).map(t => t.id));
      const allAllowed = (pages ?? []).every(p => allowedTenantIds.has(p.tenant_id));
      if (!allAllowed || (pages?.length ?? 0) !== ids.length) {
        return NextResponse.json({ message: "Not authorized for one or more pages" }, { status: 403 });
      }
    }

    // Apply updates (one per page)
    const results = await Promise.all(
      orders.map(o =>
        admin.from("pages").update({ sort_order: o.sort_order }).eq("id", o.id),
      ),
    );
    const firstErr = results.find(r => r.error)?.error;
    if (firstErr) {
      console.error("Failed to update sort_order:", firstErr);
      return NextResponse.json({ message: "Failed to save order" }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: orders.length });
  } catch (error) {
    console.error("sort-order PATCH error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
