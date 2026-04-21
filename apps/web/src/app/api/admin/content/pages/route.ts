import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";

/**
 * GET /api/admin/content/pages?tenantId=N
 *
 * Lightweight page list for the Puck editor link picker.
 * Returns { id, title, slug }[] for published pages of a tenant.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const tenantId = request.nextUrl.searchParams.get("tenantId");
  if (!tenantId) {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  const tid = parseInt(tenantId, 10);
  if (isNaN(tid)) {
    return NextResponse.json({ error: "Invalid tenantId" }, { status: 400 });
  }

  if (!auth.isPlatform) {
    const check = await requireTenantMembership(auth.userId, tid, auth.admin, auth.isPlatform);
    if (!check.allowed) return check.response!;
  }

  const { data, error } = await auth.admin
    .from("pages")
    .select("id, title, slug")
    .eq("tenant_id", tid)
    .eq("is_published", true)
    .order("title", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
