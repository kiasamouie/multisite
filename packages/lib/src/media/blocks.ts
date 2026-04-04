import { createAdminClient } from "../supabase/admin";
import type { Json } from "../supabase/types";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Ensures a `page_media` block exists in the page's sections for the given
 * usage_type. Idempotent — does nothing if a matching block already exists.
 *
 * Creates a default section if the page has none.
 * Appends the block to the last section so it doesn't disrupt existing layout.
 *
 * Requires the admin (service-role) client so it bypasses RLS.
 */
export async function ensurePageMediaBlock(
  supabase: AdminClient,
  pageId: number,
  usageType: string
): Promise<void> {
  // 1. Get all sections for this page
  const { data: sections } = await supabase
    .from("sections")
    .select("id, position")
    .eq("page_id", pageId)
    .order("position", { ascending: true });

  // 2. Determine or create the section to append to
  let targetSectionId: number;
  let allSectionIds: number[];

  if (!sections || sections.length === 0) {
    const { data: newSection } = await supabase
      .from("sections")
      .insert({ page_id: pageId, type: "default", position: 0 })
      .select("id")
      .single();
    if (!newSection) return;
    targetSectionId = newSection.id;
    allSectionIds = [targetSectionId];
  } else {
    // Append to the last section so existing blocks come first
    targetSectionId = sections[sections.length - 1].id;
    allSectionIds = sections.map((s) => s.id);
  }

  // 3. Skip if a page_media block with this usage_type already exists in any section
  const { data: existingBlocks } = await supabase
    .from("blocks")
    .select("id, content")
    .in("section_id", allSectionIds)
    .eq("type", "page_media");

  const hasMatch = existingBlocks?.some((b) => {
    const c = b.content as Record<string, unknown>;
    return c?.usage_type === usageType;
  });

  if (hasMatch) return;

  // 4. Find next available position in the target section
  const { data: lastBlock } = await supabase
    .from("blocks")
    .select("position")
    .eq("section_id", targetSectionId)
    .order("position", { ascending: false })
    .limit(1);

  const position = ((lastBlock?.[0]?.position as number) ?? -1) + 1;

  // 5. Create the block
  await supabase.from("blocks").insert({
    section_id: targetSectionId,
    type: "page_media",
    content: { usage_type: usageType, display_mode: "gallery" } as unknown as Json,
    position,
  });
}
