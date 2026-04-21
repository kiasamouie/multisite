import { NextResponse } from "next/server";
import { createAdminClient } from "@repo/lib/supabase/admin";

/**
 * GET /api/media/[id]/img
 *
 * Public media proxy — redirects to a freshly-generated signed URL.
 * Browsers cache the redirect for 30 min. When cache expires, they
 * re-fetch this route and get a new signed URL. From the user's
 * perspective, the image URL never expires.
 *
 * Usage: <img src="/api/media/42/img" />
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const mediaId = parseInt(id, 10);
  if (isNaN(mediaId)) {
    return NextResponse.json({ error: "Invalid media ID" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: media, error } = await supabase
    .from("media")
    .select("url")
    .eq("id", mediaId)
    .single();

  if (error || !media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const { data: signedUrlData, error: signError } = await supabase.storage
    .from("media")
    .createSignedUrl(media.url, 1800);

  if (signError || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }

  return NextResponse.redirect(signedUrlData.signedUrl, {
    status: 302,
    headers: {
      "Cache-Control": "public, max-age=1800, stale-while-revalidate=300",
    },
  });
}
