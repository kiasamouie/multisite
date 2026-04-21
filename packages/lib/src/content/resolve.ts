import { createAdminClient } from "../supabase/admin";

/**
 * Content type → table name mapping.
 * Mirrors the API route mapping in /api/admin/content/[type]/route.ts.
 */
const CONTENT_TABLES: Record<string, string> = {
  team: "team_members",
  testimonials: "testimonials",
  portfolio: "portfolio_items",
  blog: "blog_posts",
  events: "content_events",
};

/**
 * Block content key → content type mapping.
 * When a block has one of these keys (containing an array of IDs),
 * we fetch the full records and inject them alongside.
 */
const CONTENT_KEYS: Record<string, { table: string; injectKey: string }> = {
  teamMemberIds: { table: "team_members", injectKey: "members" },
  testimonialIds: { table: "testimonials", injectKey: "testimonials" },
  portfolioItemIds: { table: "portfolio_items", injectKey: "projects" },
  blogPostIds: { table: "blog_posts", injectKey: "posts" },
  eventIds: { table: "content_events", injectKey: "events" },
};

interface BlockLike {
  type: string;
  content: Record<string, unknown>;
}

/**
 * Resolves content library record IDs in block data to full records.
 *
 * For each block, if `content.teamMemberIds` (or similar) contains
 * an array of integer IDs, we batch-fetch those records from the DB
 * and inject them into `content.members` (or the appropriate key).
 *
 * This runs server-side during page rendering so front-end blocks
 * always receive resolved data.
 */
export async function resolveBlockContent<T extends BlockLike>(blocks: T[]): Promise<T[]> {
  const supabase = createAdminClient();

  // Collect all IDs we need to fetch, grouped by table
  const fetchMap = new Map<string, Set<number>>();

  for (const block of blocks) {
    for (const [key, config] of Object.entries(CONTENT_KEYS)) {
      const ids = block.content[key];
      if (Array.isArray(ids) && ids.length > 0) {
        const numericIds = ids.filter((id): id is number => typeof id === "number");
        if (numericIds.length > 0) {
          const existing = fetchMap.get(config.table) ?? new Set();
          for (const id of numericIds) existing.add(id);
          fetchMap.set(config.table, existing);
        }
      }
    }
  }

  // If nothing to resolve, return as-is
  if (fetchMap.size === 0) return blocks;

  // Batch fetch all records
  const recordCache = new Map<string, Map<number, Record<string, unknown>>>();

  await Promise.all(
    Array.from(fetchMap.entries()).map(async ([table, ids]) => {
      const { data } = await (supabase as any)
        .from(table)
        .select("*")
        .in("id", Array.from(ids));

      const map = new Map<number, Record<string, unknown>>();
      for (const row of data ?? []) {
        map.set(row.id as number, row as Record<string, unknown>);
      }
      recordCache.set(table, map);
    })
  );

  // Inject resolved records into block content
  return blocks.map((block) => {
    let modified = false;
    const newContent = { ...block.content };

    for (const [key, config] of Object.entries(CONTENT_KEYS)) {
      const ids = block.content[key];
      if (Array.isArray(ids) && ids.length > 0) {
        const tableCache = recordCache.get(config.table);
        if (tableCache) {
          const resolved = ids
            .filter((id): id is number => typeof id === "number")
            .map((id) => tableCache.get(id))
            .filter(Boolean);
          if (resolved.length > 0) {
            newContent[config.injectKey] = resolved;
            modified = true;
          }
        }
      }
    }

    return modified ? { ...block, content: newContent } : block;
  });
}
