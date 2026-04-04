import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// DELETE /api/media/[id] — delete a media record and its file
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const mediaId = Number(id);
  if (!mediaId) return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const { data: media } = await auth.admin
    .from("media")
    .select("tenant_id, metadata")
    .eq("id", mediaId)
    .single();

  if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });

  const access = await requireTenantMembership(auth.userId, media.tenant_id, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  // Delete from storage
  const storagePath = (media.metadata as Record<string, unknown>)?.storagePath as string | undefined;
  if (storagePath) {
    await auth.admin.storage.from("media").remove([storagePath]);
  }

  // Delete from DB
  const { error } = await auth.admin.from("media").delete().eq("id", mediaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateTag("media");

  return NextResponse.json({ success: true });
}
