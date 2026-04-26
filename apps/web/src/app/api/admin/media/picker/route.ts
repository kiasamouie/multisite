import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";

/**
 * GET /api/admin/media/picker?tenantId=N&mediaType=image|video&tag=hero
 *
 * Lightweight media list for the Puck editor media picker.
 * Returns { id, filename, metadata } for all media belonging to a tenant.
 * Optionally filters by mediaType (image or video) using metadata.mime_type.
 * Optionally filters by tag — returns only media that include the given tag.
 * URLs use the permanent proxy: /api/media/{id}/img
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

  const mediaType = request.nextUrl.searchParams.get("mediaType"); // "image" | "video" | null
  const tagFilter = request.nextUrl.searchParams.get("tag"); // single tag to filter by

  // Check membership unless platform admin
  if (!auth.isPlatform) {
    const check = await requireTenantMembership(auth.userId, tid, auth.admin, auth.isPlatform);
    if (!check.allowed) return check.response!;
  }

  let query = auth.admin
    .from("media")
    .select("id, filename, metadata, tags")
    .eq("tenant_id", tid)
    .order("created_at", { ascending: false });

  // Filter by tag using array containment if specified
  if (tagFilter) {
    query = (query as typeof query).contains("tags" as never, [tagFilter] as never);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let filtered = data ?? [];

  // Filter by media type if specified
  if (mediaType === "image" || mediaType === "video") {
    filtered = filtered.filter((m) => {
      const meta = m.metadata as Record<string, unknown> | null;
      const mime = (meta?.mime_type ?? meta?.content_type ?? "") as string;
      if (mime) return mime.startsWith(`${mediaType}/`);
      // Fallback: check filename extension
      const ext = m.filename.split(".").pop()?.toLowerCase() ?? "";
      if (mediaType === "image") return ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext);
      return ["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext);
    });
  }

  const items = filtered.map((m) => ({
    id: m.id,
    filename: m.filename,
    url: `/api/media/${m.id}/img`,
    metadata: m.metadata,
    tags: (m as typeof m & { tags?: string[] }).tags ?? [],
  }));

  return NextResponse.json({ items });
}
