import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";

// GET /api/admin/media/[id]/associations — list page associations for a media item
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mediaId = parseInt(id, 10);
  if (!mediaId) return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const { data: media, error: mediaError } = await auth.admin
    .from("media")
    .select("id, tenant_id")
    .eq("id", mediaId)
    .single();

  if (mediaError || !media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const access = await requireTenantMembership(auth.userId, media.tenant_id, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  const { data, error } = await auth.admin
    .from("media_page_associations")
    .select("id, page_id, usage_type, pages(id, title, slug, tenants(domain))")
    .eq("media_id", mediaId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// POST /api/admin/media/[id]/associations — add a page association
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mediaId = parseInt(id, 10);
  if (!mediaId) return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { page_id, usage_type = "general" } = body as { page_id: number; usage_type?: string };
  if (!page_id) return NextResponse.json({ error: "Missing page_id" }, { status: 400 });

  const { data: media, error: mediaError } = await auth.admin
    .from("media")
    .select("id, tenant_id")
    .eq("id", mediaId)
    .single();

  if (mediaError || !media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const access = await requireTenantMembership(auth.userId, media.tenant_id, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  // Verify the page belongs to the same tenant
  const { data: page } = await auth.admin
    .from("pages")
    .select("id")
    .eq("id", page_id)
    .eq("tenant_id", media.tenant_id)
    .single();

  if (!page) {
    return NextResponse.json({ error: "Page not found or does not belong to this tenant" }, { status: 404 });
  }

  const { data, error } = await auth.admin
    .from("media_page_associations")
    .insert({ media_id: mediaId, page_id, usage_type })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Association already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/admin/media/[id]/associations — remove a page association
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mediaId = parseInt(id, 10);
  if (!mediaId) return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { page_id } = body as { page_id: number };
  if (!page_id) return NextResponse.json({ error: "Missing page_id" }, { status: 400 });

  const { data: media, error: mediaError } = await auth.admin
    .from("media")
    .select("id, tenant_id")
    .eq("id", mediaId)
    .single();

  if (mediaError || !media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const access = await requireTenantMembership(auth.userId, media.tenant_id, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  const { error } = await auth.admin
    .from("media_page_associations")
    .delete()
    .eq("media_id", mediaId)
    .eq("page_id", page_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
