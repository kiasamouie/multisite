import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";
import { ensurePageMediaBlock } from "@repo/lib/media/blocks";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/pages/[id]/page-media-block
 *
 * Ensures a page_media block exists for the given page and usage_type.
 * Creates a section (if the page has none) and a block (if none matches the
 * usage_type) — idempotent. Used by the admin panel "Add Page Media Block"
 * button and by the media upload flow retroactively.
 *
 * Body: { usage_type: string }
 * Response: { success: true }
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const pageId = Number(id);
  if (!pageId) return NextResponse.json({ error: "Invalid page ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const { data: page } = await auth.admin
    .from("pages")
    .select("tenant_id")
    .eq("id", pageId)
    .single();

  if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, page.tenant_id, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  let body: unknown = {};
  try { body = await request.json(); } catch { /* use defaults */ }

  const { usage_type = "general" } = body as { usage_type?: string };
  if (!usage_type.trim()) {
    return NextResponse.json({ error: "usage_type is required" }, { status: 400 });
  }

  await ensurePageMediaBlock(auth.admin, pageId, usage_type.trim());
  revalidateTag("pages", "max");

  return NextResponse.json({ success: true });
}
