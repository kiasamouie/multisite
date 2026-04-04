import { cookies } from "next/headers";
import { createServerClient } from "@repo/lib/supabase/server";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/media/[id]/download
 * Generates a time-limited signed URL for accessing media files.
 * 
 * Access Control:
 * - Tenant members can only access their own tenant's media
 * - Platform admins can access all media
 * 
 * Response: { url } (signed URL valid for 1 hour)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const mediaId = parseInt(id, 10);

    if (!mediaId) {
      return NextResponse.json({ message: "Invalid media ID" }, { status: 400 });
    }

    // Fetch media record - RLS will enforce tenant access control
    const { data: media, error: fetchError } = await supabase
      .from("media")
      .select("id, url, tenant_id")
      .eq("id", mediaId)
      .single();

    if (fetchError || !media) {
      console.error("Media fetch error:", fetchError);
      return NextResponse.json(
        { message: "Media not found or access denied" },
        { status: 404 }
      );
    }

    // At this point, RLS has verified the user has access
    // Now generate a signed URL for the storage path
    const storagePath = media.url; // URL field now contains the storage path

    const adminSupabase = createAdminClient();

    // Generate signed URL valid for 1 hour
    const { data: urlData, error: signError } = await adminSupabase.storage
      .from("media")
      .createSignedUrl(storagePath, 3600); // 3600 seconds = 1 hour

    if (signError || !urlData) {
      console.error("Signed URL generation error:", signError);
      return NextResponse.json(
        { message: "Failed to generate download URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: urlData.signedUrl }, { status: 200 });
  } catch (error) {
    console.error("Media download error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Request failed" },
      { status: 500 }
    );
  }
}
