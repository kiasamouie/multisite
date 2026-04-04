import { cookies } from "next/headers";
import { createServerClient } from "@repo/lib/supabase/server";
import { getPlatformAdmin } from "@repo/lib/tenant/platform";
import { resolveTenantsByUserId } from "@repo/lib/tenant/resolver";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/pages
 * Fetch pages for a specific tenant for use in dropdown/selectors.
 * 
 * Query params:
 *   - tenantId: string (required)
 *   - fields: comma-separated field names (optional, defaults to all)
 * 
 * Returns: { pages: [] }
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tenantIdStr = url.searchParams.get("tenantId");
    const fieldsStr = url.searchParams.get("fields");

    if (!tenantIdStr) {
      return NextResponse.json({ message: "Missing tenantId" }, { status: 400 });
    }

    const tenantId = parseInt(tenantIdStr, 10);
    if (isNaN(tenantId)) {
      return NextResponse.json({ message: "Invalid tenantId" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check permissions: user must be member of tenant or platform admin
    const platformAdmin = await getPlatformAdmin(user.id);
    let hasTenant = false;

    if (!platformAdmin) {
      const tenants = await resolveTenantsByUserId(user.id);
      hasTenant = tenants?.some((t) => t.id === tenantId) ?? false;
    } else {
      hasTenant = true; // Platform admin can see all
    }

    if (!hasTenant) {
      return NextResponse.json({ message: "Not authorized for this tenant" }, { status: 403 });
    }

    // Build select string
    const selectStr = fieldsStr || "id, title, slug, is_published";

    // Query pages
    const { data: pages, error } = await supabase
      .from("pages")
      .select(selectStr)
      .eq("tenant_id", tenantId)
      .order("title", { ascending: true });

    if (error) {
      console.error("Error fetching pages:", error);
      return NextResponse.json(
        { message: "Failed to fetch pages" },
        { status: 500 }
      );
    }

    return NextResponse.json({ pages: pages || [] }, { status: 200 });
  } catch (error) {
    console.error("Pages API error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
