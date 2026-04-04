import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";
import { blockUpdateSchema } from "@repo/lib/validation/schemas";
import type { Json } from "@repo/lib/supabase/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getBlockWithTenant(admin: ReturnType<typeof import("@repo/lib/supabase/admin").createAdminClient>, blockId: number) {
  const { data: block } = await admin
    .from("blocks")
    .select("id, section_id, sections!inner(page_id, pages!inner(tenant_id))")
    .eq("id", blockId)
    .single();

  if (!block) return null;
  const tenantId = (block as unknown as { sections: { pages: { tenant_id: number } } }).sections.pages.tenant_id;
  return { block, tenantId };
}

// PUT /api/blocks/[id] — update a block
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const blockId = Number(id);
  if (!blockId) return NextResponse.json({ error: "Invalid block ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const result = await getBlockWithTenant(auth.admin, blockId);
  if (!result) return NextResponse.json({ error: "Block not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, result.tenantId, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = blockUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { content, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (content !== undefined) updateData.content = content;
  const { data, error } = await auth.admin
    .from("blocks")
    .update(updateData as { type?: string; content?: Json; position?: number })
    .eq("id", blockId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/blocks/[id]
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const blockId = Number(id);
  if (!blockId) return NextResponse.json({ error: "Invalid block ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const result = await getBlockWithTenant(auth.admin, blockId);
  if (!result) return NextResponse.json({ error: "Block not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, result.tenantId, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  const { error } = await auth.admin.from("blocks").delete().eq("id", blockId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
