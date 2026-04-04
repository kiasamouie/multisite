import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";
import { sectionUpdateSchema } from "@repo/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getSectionWithTenant(admin: ReturnType<typeof import("@repo/lib/supabase/admin").createAdminClient>, sectionId: number) {
  const { data: section } = await admin
    .from("sections")
    .select("id, page_id, pages!inner(tenant_id)")
    .eq("id", sectionId)
    .single();

  if (!section) return null;
  const tenantId = (section as unknown as { pages: { tenant_id: number } }).pages.tenant_id;
  return { section, tenantId };
}

// PUT /api/sections/[id] — update a section
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const sectionId = Number(id);
  if (!sectionId) return NextResponse.json({ error: "Invalid section ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const result = await getSectionWithTenant(auth.admin, sectionId);
  if (!result) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, result.tenantId, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sectionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { data, error } = await auth.admin
    .from("sections")
    .update(parsed.data)
    .eq("id", sectionId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/sections/[id]
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const sectionId = Number(id);
  if (!sectionId) return NextResponse.json({ error: "Invalid section ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const result = await getSectionWithTenant(auth.admin, sectionId);
  if (!result) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, result.tenantId, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  const { error } = await auth.admin.from("sections").delete().eq("id", sectionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
