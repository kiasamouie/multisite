import { createAdminClient } from "../supabase/admin";

export interface PageMediaAsset {
  id: number;
  media_id: number;
  page_id: number;
  usage_type: string;
  position: number;
  signedUrl: string;
  filename: string;
  /** "image" | "video" | "audio" | "document" | "unknown" */
  type: string;
  metadata: Record<string, unknown>;
}

/**
 * Fetch all media associated with a page and generate signed URLs.
 * Uses the admin (service-role) client so it works at server-render time
 * without RLS constraints on the storage bucket.
 *
 * Signed URLs are valid for 3600s (1 hour), which is well above the
 * 60s page revalidation interval.
 */
export async function getPageMedia(pageId: number): Promise<PageMediaAsset[]> {
  const supabase = createAdminClient();

  const { data: associations, error } = await supabase
    .from("media_page_associations")
    .select("id, media_id, page_id, usage_type, position, media(id, url, filename, metadata)")
    .eq("page_id", pageId)
    .order("position", { ascending: true });

  console.log("🎞️ getPageMedia:", { pageId, associations_count: associations?.length, error });

  if (error || !associations) return [];

  const assets: PageMediaAsset[] = [];

  for (const assoc of associations) {
    const media = assoc.media as unknown as {
      id: number;
      url: string;
      filename: string;
      metadata: Record<string, unknown>;
    } | null;

    console.log("  📷 Processing association:", { assoc_id: assoc.id, media_id: assoc.media_id, has_media: !!media, url: media?.url });

    if (!media) continue;

    // media.url is the full path within the bucket, e.g. "media/{tenantId}/{filename}"
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from("media")
      .createSignedUrl(media.url, 3600);

    console.log("  🔗 Signed URL:", { media_id: media.id, path: media.url, signed: !!signedUrlData?.signedUrl, error: signError?.message });

    if (!signedUrlData?.signedUrl) continue;

    const metadata = (media.metadata || {}) as Record<string, unknown>;

    assets.push({
      id: assoc.id,
      media_id: media.id,
      page_id: assoc.page_id,
      usage_type: assoc.usage_type ?? "general",
      position: assoc.position ?? 0,
      signedUrl: signedUrlData.signedUrl,
      filename: media.filename,
      type: metadata.type ? String(metadata.type) : "unknown",
      metadata,
    });
  }

  console.log("✅ getPageMedia returning:", { total: assets.length, assets: assets.map(a => ({ id: a.id, filename: a.filename })) });
  return assets;
}
