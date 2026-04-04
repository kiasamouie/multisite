import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";
import { pageUpdateSchema } from "@repo/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/pages/[id] — get a single page with sections + blocks
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const pageId = Number(id);
  if (!pageId) return NextResponse.json({ error: "Invalid page ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const { data: page, error } = await auth.admin
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .single();

  if (error || !page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, page.tenant_id, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  // Fetch sections with blocks
  const { data: sections } = await auth.admin
    .from("sections")
    .select("*, blocks(*)")
    .eq("page_id", pageId)
    .order("position", { ascending: true });

  return NextResponse.json({
    ...page,
    sections: (sections || []).map((s) => ({
      ...s,
      blocks: (s.blocks || []).sort(
        (a: { position: number }, b: { position: number }) => a.position - b.position
      ),
    })),
  });
}

// PUT /api/pages/[id] — update a page
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const pageId = Number(id);
  if (!pageId) return NextResponse.json({ error: "Invalid page ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  // Get page to check tenant ownership
  const { data: page } = await auth.admin.from("pages").select("tenant_id").eq("id", pageId).single();
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, page.tenant_id, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = pageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // If setting as homepage, unset any existing homepage for this tenant
  if (parsed.data.is_homepage) {
    await auth.admin
      .from("pages")
      .update({ is_homepage: false })
      .eq("tenant_id", page.tenant_id)
      .eq("is_homepage", true)
      .neq("id", pageId);
  }

  const { data, error } = await auth.admin
    .from("pages")
    .update(parsed.data)
    .eq("id", pageId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/pages/[id] — delete a page
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const pageId = Number(id);
  if (!pageId) return NextResponse.json({ error: "Invalid page ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const { data: page } = await auth.admin.from("pages").select("tenant_id").eq("id", pageId).single();
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, page.tenant_id, auth.admin, auth.isPlatform, "admin");
  if (!access.allowed) return access.response!;

  const { error } = await auth.admin.from("pages").delete().eq("id", pageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
