import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";
import { blockSchema } from "@repo/lib/validation/schemas";
import type { Json } from "@repo/lib/supabase/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getSectionTenantId(admin: ReturnType<typeof import("@repo/lib/supabase/admin").createAdminClient>, sectionId: number) {
  const { data } = await admin
    .from("sections")
    .select("id, pages!inner(tenant_id)")
    .eq("id", sectionId)
    .single();
  if (!data) return null;
  return (data as unknown as { pages: { tenant_id: number } }).pages.tenant_id;
}

// GET /api/sections/[id]/blocks — list blocks for a section
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const sectionId = Number(id);
  if (!sectionId) return NextResponse.json({ error: "Invalid section ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const tenantId = await getSectionTenantId(auth.admin, sectionId);
  if (!tenantId) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, tenantId, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  const { data, error } = await auth.admin
    .from("blocks")
    .select("*")
    .eq("section_id", sectionId)
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/sections/[id]/blocks — create a block
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const sectionId = Number(id);
  if (!sectionId) return NextResponse.json({ error: "Invalid section ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const tenantId = await getSectionTenantId(auth.admin, sectionId);
  if (!tenantId) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, tenantId, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = blockSchema.safeParse({ ...(body as Record<string, unknown>), section_id: sectionId });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { data, error } = await auth.admin
    .from("blocks")
    .insert({ ...parsed.data, content: parsed.data.content as Json })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
