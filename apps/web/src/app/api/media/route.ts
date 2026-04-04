import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireTenantMembership } from "@/lib/api-auth";

// GET /api/media?tenantId=X — list media for a tenant
export async function GET(request: NextRequest) {
  const tenantId = Number(request.nextUrl.searchParams.get("tenantId"));
  if (!tenantId) return NextResponse.json({ error: "Missing tenantId" }, { status: 400 });

  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const access = await requireTenantMembership(auth.userId, tenantId, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  const { data, error } = await auth.admin
    .from("media")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/media — upload a media file
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest();
  if (!auth.ok) return auth.response;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const tenantIdStr = formData.get("tenantId") as string | null;

  if (!file || !tenantIdStr) {
    return NextResponse.json({ error: "Missing file or tenantId" }, { status: 400 });
  }

  const tenantId = Number(tenantIdStr);
  if (!tenantId) return NextResponse.json({ error: "Invalid tenantId" }, { status: 400 });

  const access = await requireTenantMembership(auth.userId, tenantId, auth.admin, auth.isPlatform);
  if (!access.allowed) return access.response!;

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "bin";
  const safeFilename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storagePath = `tenant-${tenantId}/${safeFilename}`;

  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await auth.admin.storage
    .from("media")
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = auth.admin.storage.from("media").getPublicUrl(storagePath);

  const { data: mediaRecord, error: dbError } = await auth.admin
    .from("media")
    .insert({
      tenant_id: tenantId,
      url: publicUrl.publicUrl,
      filename: file.name,
      metadata: { size: file.size, type: file.type, storagePath },
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(mediaRecord, { status: 201 });
}
