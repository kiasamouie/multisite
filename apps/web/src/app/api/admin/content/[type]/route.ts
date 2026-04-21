import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";

/**
 * Mapping from URL content type to database table name.
 * Keeps the API generic — adding a new content type only requires
 * adding one entry here and creating the table.
 */
const CONTENT_TABLES: Record<string, string> = {
  team: "team_members",
  testimonials: "testimonials",
  portfolio: "portfolio_items",
  blog: "blog_posts",
  events: "content_events",
};

function getTable(type: string): string | null {
  return CONTENT_TABLES[type] ?? null;
}

function parseTenantId(request: NextRequest): number | null {
  const raw = request.nextUrl.searchParams.get("tenantId");
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

/**
 * GET /api/admin/content/[type]?tenantId=N
 *
 * List all records for a content type and tenant.
 * Used by both admin CRUD pages and the content picker fields.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const table = getTable(type);
  if (!table) return NextResponse.json({ error: "Unknown content type" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const tid = parseTenantId(request);
  if (!tid) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  if (!auth.isPlatform) {
    const check = await requireTenantMembership(auth.userId, tid, auth.admin, auth.isPlatform);
    if (!check.allowed) return check.response!;
  }

  const { data, error } = await (auth.admin as any)
    .from(table)
    .select("*")
    .eq("tenant_id", tid)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

/**
 * POST /api/admin/content/[type]
 * Body: { tenantId, ...fields }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const table = getTable(type);
  if (!table) return NextResponse.json({ error: "Unknown content type" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { tenantId, ...fields } = body;

  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  if (!auth.isPlatform) {
    const check = await requireTenantMembership(auth.userId, tenantId, auth.admin, auth.isPlatform);
    if (!check.allowed) return check.response!;
  }

  const { data, error } = await (auth.admin as any)
    .from(table)
    .insert({ tenant_id: tenantId, ...fields })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data }, { status: 201 });
}

/**
 * PUT /api/admin/content/[type]
 * Body: { id, tenantId, ...fields }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const table = getTable(type);
  if (!table) return NextResponse.json({ error: "Unknown content type" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { id, tenantId, ...fields } = body;

  if (!id || !tenantId) return NextResponse.json({ error: "id and tenantId required" }, { status: 400 });

  if (!auth.isPlatform) {
    const check = await requireTenantMembership(auth.userId, tenantId, auth.admin, auth.isPlatform);
    if (!check.allowed) return check.response!;
  }

  const { data, error } = await (auth.admin as any)
    .from(table)
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ item: data });
}

/**
 * DELETE /api/admin/content/[type]?id=N&tenantId=N
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  const table = getTable(type);
  if (!table) return NextResponse.json({ error: "Unknown content type" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get("id");
  const tenantId = request.nextUrl.searchParams.get("tenantId");

  if (!id || !tenantId) return NextResponse.json({ error: "id and tenantId required" }, { status: 400 });

  const tid = parseInt(tenantId, 10);
  const rid = parseInt(id, 10);
  if (isNaN(tid) || isNaN(rid)) return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });

  if (!auth.isPlatform) {
    const check = await requireTenantMembership(auth.userId, tid, auth.admin, auth.isPlatform);
    if (!check.allowed) return check.response!;
  }

  const { error } = await (auth.admin as any)
    .from(table)
    .delete()
    .eq("id", rid)
    .eq("tenant_id", tid);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
