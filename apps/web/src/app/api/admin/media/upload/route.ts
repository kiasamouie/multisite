import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import Busboy from "busboy";
import { Readable } from "stream";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { getPlatformAdmin } from "@repo/lib/tenant/platform";
import { resolveTenantsByUserId } from "@repo/lib/tenant/resolver";
import type { Database, Json } from "@repo/lib/supabase/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
// Force Node.js runtime so request.formData() handles large multipart bodies
// reliably (the Edge runtime has a 4MB limit).
export const runtime = "nodejs";

/**
 * Parse multipart/form-data by first buffering the entire request body, then
 * feeding it into busboy. Buffering avoids Web→Node stream boundary issues
 * that previously truncated large MP4 uploads.
 */
async function parseUploadForm(request: Request): Promise<{
  file: Buffer;
  filename: string;
  mimeType: string;
  tenantIdStr: string;
  tagsStr: string | null;
}> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw new Error("Expected multipart/form-data content type");
  }

  // Buffer the entire body up front — reliable for any size in Node runtime
  const arrayBuffer = await request.arrayBuffer();
  const bodyBuffer = Buffer.from(arrayBuffer);
  if (bodyBuffer.length === 0) {
    throw new Error("Request body is empty");
  }

  return new Promise((resolve, reject) => {
    let fileBuffer: Buffer | null = null;
    let filename = "upload";
    let mimeType = "application/octet-stream";
    let tenantIdStr = "";
    let tagsStr: string | null = null;
    let settled = false;

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: { fileSize: 500 * 1024 * 1024, files: 1 },
    });

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    busboy.on("file", (_fieldname, fileStream, info) => {
      filename = info.filename || "upload";
      mimeType = info.mimeType || "application/octet-stream";
      const chunks: Buffer[] = [];
      fileStream.on("data", (chunk: Buffer) => chunks.push(chunk));
      fileStream.on("limit", () => fail(new Error("File exceeds 500MB limit")));
      fileStream.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
      fileStream.on("error", (err: unknown) =>
        fail(err instanceof Error ? err : new Error("File stream error"))
      );
    });

    busboy.on("field", (name, value) => {
      if (name === "tenantId") tenantIdStr = value;
      else if (name === "tags") tagsStr = value;
    });

    busboy.on("close", () => {
      if (settled) return;
      settled = true;
      if (!fileBuffer || fileBuffer.length === 0) {
        reject(new Error("No file received in upload"));
        return;
      }
      resolve({ file: fileBuffer, filename, mimeType, tenantIdStr, tagsStr });
    });

    busboy.on("error", (err: unknown) =>
      fail(err instanceof Error ? err : new Error("Upload parse error"))
    );

    // Feed the complete buffer into busboy via a single-shot Readable stream
    Readable.from(bodyBuffer).pipe(busboy);
  });
}

/**
 * POST /api/admin/media/upload
 * Handles media file uploads to Supabase Storage and creates media records.
 *
 * Request: FormData with:
 *   - file: File
 *   - tenantId: string (number)
 *   - pageIds: string (JSON array of page IDs, optional)
 *   - usageType: string (optional, default 'general')
 *
 * Response: { filename, url, mediaId, associatedPages }
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart form using native request.formData()
    let parsedForm: Awaited<ReturnType<typeof parseUploadForm>>;
    try {
      parsedForm = await parseUploadForm(request);
    } catch (parseErr) {
      console.error("Multipart parse error:", parseErr);
      return NextResponse.json(
        { message: parseErr instanceof Error ? parseErr.message : "Failed to parse upload" },
        { status: 400 }
      );
    }

    const { file: buffer, filename, mimeType, tenantIdStr, tagsStr } = parsedForm;
    const tenantId = parseInt(tenantIdStr, 10);
    const size = buffer.length;

    if (!tenantId) {
      return NextResponse.json({ message: "Missing tenantId" }, { status: 400 });
    }

    // Parse tags if provided
    let tags: string[] = [];
    if (tagsStr) {
      try {
        tags = JSON.parse(tagsStr) as string[];
        if (!Array.isArray(tags)) tags = [];
        tags = tags.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim());
      } catch {
        tags = [];
      }
    }

    // Check permissions: user must be member of tenant or platform admin
    const platformAdmin = await getPlatformAdmin(user.id);
    if (!platformAdmin) {
      const tenants = await resolveTenantsByUserId(user.id);
      const hasTenant = tenants?.some((t) => t.id === tenantId);
      if (!hasTenant) {
        return NextResponse.json({ message: "Not authorized for this tenant" }, { status: 403 });
      }
    }

    // Get admin client for storage operations
    const adminSupabase = createAdminClient();
    
    // Generate unique path: media/{tenantId}/{filename}
    const storagePath = `media/${tenantId}/${filename}`;

    // Upload to media bucket (bucket is private, uses signed URLs for access)
    const uploadResult = await adminSupabase.storage
      .from("media")
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadResult.error) {
      console.error("Storage upload failed:", uploadResult.error);
      const errorMsg = uploadResult.error.message || "Failed to upload file";
      return NextResponse.json(
        { message: errorMsg },
        { status: 500 }
      );
    }

    // Generate signed URL for the uploaded file (valid for 1 hour)
    const { data: signedUrlData } = await adminSupabase.storage
      .from("media")
      .createSignedUrl(storagePath, 3600);

    const publicUrl = signedUrlData?.signedUrl || "";

    // Detect media type from MIME type
    const detectType = (mime: string): string => {
      if (mime.startsWith("image/")) return "image";
      if (mime.startsWith("video/")) return "video";
      if (mime.startsWith("audio/")) return "audio";
      return "document";
    };

    // Extract image dimensions if applicable
    const metadataObj: Record<string, unknown> = {
      type: detectType(mimeType),
      size: size,
      uploadedAt: new Date().toISOString(),
      storagePath: storagePath,
    };

    if (mimeType.startsWith("image/") && publicUrl) {
      try {
        const img = new Image();
        img.onload = () => {
          (metadataObj as Record<string, unknown>).width = img.width;
          (metadataObj as Record<string, unknown>).height = img.height;
        };
        img.src = publicUrl;
      } catch {
        // Ignore dimension extraction errors
      }
    }

    // Convert to Json type for database insert
    const metadata: Json = metadataObj as Json;

    // Create media record in database
    // Store the storage path (not the signed URL) so the download endpoint
    // can regenerate fresh signed URLs on demand without them expiring.
    const insertData: Database["public"]["Tables"]["media"]["Insert"] & { tags?: string[] } = {
      tenant_id: tenantId,
      filename,
      url: storagePath,
      metadata,
      ...(tags.length > 0 ? { tags } : {}),
    };
    
    const { data: mediaData, error: insertError } = await supabase
      .from("media")
      .insert(insertData)
      .select("id")
      .single();

    if (insertError || !mediaData) {
      console.error("Database insert error:", insertError);
      // Note: file was already uploaded, but record creation failed
      return NextResponse.json(
        { message: "File uploaded but failed to create record" },
        { status: 500 }
      );
    }

    const mediaId = mediaData.id;

    revalidateTag("media");

    return NextResponse.json(
      { 
        filename, 
        url: publicUrl,
        mediaId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
