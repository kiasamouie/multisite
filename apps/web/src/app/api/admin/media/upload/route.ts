import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { getPlatformAdmin } from "@repo/lib/tenant/platform";
import { resolveTenantsByUserId } from "@repo/lib/tenant/resolver";
import { ensurePageMediaBlock } from "@repo/lib/media/blocks";
import type { Database, Json } from "@repo/lib/supabase/types";
import { NextResponse } from "next/server";

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

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const tenantIdStr = formData.get("tenantId") as string;
    const pageIdsStr = formData.get("pageIds") as string | null;
    const usageType = formData.get("usageType") as string | null;
    const tenantId = parseInt(tenantIdStr, 10);

    if (!file || !tenantId) {
      return NextResponse.json({ message: "Missing file or tenantId" }, { status: 400 });
    }

    // Parse page IDs if provided
    let pageIds: number[] = [];
    if (pageIdsStr) {
      try {
        pageIds = JSON.parse(pageIdsStr) as number[];
        if (!Array.isArray(pageIds)) {
          pageIds = [];
        }
      } catch {
        // Ignore parsing errors
        pageIds = [];
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

    // Read file bytes and metadata
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name;
    const mimeType = file.type;
    const size = file.size;

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

    // Include usage type in metadata if provided
    if (usageType) {
      metadataObj.usageType = usageType;
    }

    // Convert to Json type for database insert
    const metadata: Json = metadataObj as Json;

    // Create media record in database
    // Store the storage path (not the signed URL) so the download endpoint
    // can regenerate fresh signed URLs on demand without them expiring.
    const insertData: Database["public"]["Tables"]["media"]["Insert"] = {
      tenant_id: tenantId,
      filename,
      url: storagePath,
      metadata,
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
    let associatedPages: number[] = [];

    // Create associations if page IDs provided
    if (pageIds.length > 0) {
      // Validate that all pages belong to the same tenant and exist
      const { data: validatePages } = await adminSupabase
        .from("pages")
        .select("id, tenant_id")
        .in("id", pageIds)
        .eq("tenant_id", tenantId);

      if (validatePages && validatePages.length > 0) {
        const validPageIds = validatePages.map((p) => p.id);

        // Create associations for valid pages
        const associations = validPageIds.map((pageId) => ({
          media_id: mediaId,
          page_id: pageId,
          usage_type: usageType || "general",
          position: 0,
        }));

        const { error: assocError } = await adminSupabase
          .from("media_page_associations")
          .insert(associations);

        if (assocError) {
          console.error("Failed to create associations:", assocError);
          // Association failure is not fatal - media was still created
        } else {
          associatedPages = validPageIds;
        }
      }
    }

    // Auto-create page_media block for each associated page (idempotent)
    if (associatedPages.length > 0) {
      const blockUsageType = usageType || "general";
      for (const pid of associatedPages) {
        await ensurePageMediaBlock(adminSupabase, pid, blockUsageType);
      }
      revalidateTag("pages", "max");
    }

    // Invalidate media cache so pages re-fetch fresh associations
    revalidateTag("media", "max");

    return NextResponse.json(
      { 
        filename, 
        url: publicUrl,
        mediaId,
        associatedPages,
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
