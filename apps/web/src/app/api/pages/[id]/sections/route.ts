import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";
import { sectionSchema } from "@repo/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/pages/[id]/sections — list sections for a page
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const pageId = Number(id);
  if (!pageId) return NextResponse.json({ error: "Invalid page ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  // Verify page exists and check tenant access
  const { data: page } = await auth.admin.from("pages").select("tenant_id").eq("id", pageId).single();
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, page.tenant_id, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  const { data, error } = await auth.admin
    .from("sections")
    .select("*, blocks(*)")
    .eq("page_id", pageId)
    .order("position", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sections = (data || []).map((s) => ({
    ...s,
    blocks: (s.blocks || []).sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    ),
  }));

  return NextResponse.json(sections);
}

// POST /api/pages/[id]/sections — create a section
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const pageId = Number(id);
  if (!pageId) return NextResponse.json({ error: "Invalid page ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const { data: page } = await auth.admin.from("pages").select("tenant_id").eq("id", pageId).single();
  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, page.tenant_id, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sectionSchema.safeParse({ ...(body as Record<string, unknown>), page_id: pageId });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { data, error } = await auth.admin
    .from("sections")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("pages", "max");
  return NextResponse.json(data, { status: 201 });
}
