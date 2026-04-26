import { unstable_cache } from "next/cache";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { getPageMedia } from "@repo/lib/media/resolve";
import { getAllFlags } from "@repo/lib/flags/check";
import type {
  Tenant,
  SiteHeaderConfig,
  SiteFooterConfig,
  SlotItem,
  NavPageRef,
} from "@repo/lib/tenant/context";
import type { Page, PageMediaAsset } from "@repo/template/types";
import type { PlanTier } from "@repo/lib/stripe/plans";

/**
 * Cached tenant resolution by production domain.
 */
export const getCachedTenant = unstable_cache(
  async (domain: string): Promise<Tenant | null> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("tenants")
      .select("*")
      .eq("domain", domain)
      .single();
    return data as Tenant | null;
  },
  ["tenant-by-domain"],
  { revalidate: false, tags: ["tenants"] }
);

/**
 * Cached tenant resolution by slug (dev-mode ?_tenant= switcher).
 */
export const getCachedTenantBySlug = unstable_cache(
  async (slug: string): Promise<Tenant | null> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", slug)
      .single();
    return data as Tenant | null;
  },
  ["tenant-by-slug"],
  { revalidate: false, tags: ["tenants"] }
);

/**
 * Homepage lookup — always fresh from DB so edits appear immediately.
 */
export async function getCachedHomePage(tenantId: number): Promise<Page | null> {
    const supabase = createAdminClient();
    const { data: page } = await supabase
      .from("pages")
      .select("*, sections(*, blocks(*))")
      .eq("tenant_id", tenantId)
      .eq("is_homepage", true)
      .eq("is_published", true)
      .single();

    if (!page) return null;

    // If this is a template page, verify the feature flag is enabled
    const pageWithTypes = page as Record<string, unknown> & { page_type?: string; feature_key?: string };
    if (pageWithTypes.page_type === "template" && pageWithTypes.feature_key) {
      const { data: flag } = await supabase
        .from("feature_flags")
        .select("enabled")
        .eq("tenant_id", tenantId)
        .eq("key", String(pageWithTypes.feature_key))
        .single();

      // If feature is disabled, fallback to null (homepage not available)
      if (!flag?.enabled) return null;
    }

    const sections = (page as Record<string, unknown> & { sections?: unknown[] }).sections || [];

    return {
      ...((page as unknown) as Page),
      sections: (sections as Array<unknown>).map((s) => {
        const section = s as Record<string, unknown> & { blocks?: unknown[] };
        return {
          ...section,
          blocks: (section.blocks || []).sort(
            (a: unknown, b: unknown) => {
              const aPos = (a as Record<string, unknown>).position as number || 0;
              const bPos = (b as Record<string, unknown>).position as number || 0;
              return aPos - bPos;
            }
          ),
        };
      }),
    } as Page;
}

/**
 * Page by slug + tenant — always fresh from DB so edits appear immediately.
 */
export async function getCachedPage(tenantId: number, slug: string): Promise<Page | null> {
    const supabase = createAdminClient();
    const { data: page } = await supabase
      .from("pages")
      .select("*, sections(*, blocks(*))")
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
      .eq("is_published", true)
      .neq("page_type", "site_header")
      .single();

    if (!page) return null;

    // Note: template pages are publicly viewable regardless of feature flag.
    // Nav visibility is controlled separately by getCachedNavPages.

    const sections = (page as Record<string, unknown> & { sections?: unknown[] }).sections || [];

    return {
      ...((page as unknown) as Page),
      sections: (sections as Array<unknown>).map((s) => {
        const section = s as Record<string, unknown> & { blocks?: unknown[] };
        return {
          ...section,
          blocks: (section.blocks || []).sort(
            (a: unknown, b: unknown) => {
              const aPos = (a as Record<string, unknown>).position as number || 0;
              const bPos = (b as Record<string, unknown>).position as number || 0;
              return aPos - bPos;
            }
          ),
        };
      }),
    } as Page;
}

/**
 * Page media associations with signed URLs — no cache, always fresh.
 */
export async function getCachedPageMedia(pageId: number): Promise<PageMediaAsset[]> {
  return getPageMedia(pageId);
}

/**
 * Cached feature flags for a tenant (plan defaults + per-tenant overrides).
 */
export const getCachedFlags = unstable_cache(
  async (tenantId: number, plan: string): Promise<Record<string, boolean>> => {
    return getAllFlags(tenantId, plan as PlanTier);
  },
  ["tenant-flags"],
  { revalidate: false, tags: ["flags"] }
);

/**
 * Cached published pages for the site nav — ordered by title.
 * Only returns pages whose feature flag is enabled (for template pages).
 * Used to auto-build the navbar links from the actual pages table.
 */
export const getCachedNavPages = unstable_cache(
  async (tenantId: number): Promise<Array<{ title: string; slug: string }>> => {
    const supabase = createAdminClient();

    const { data: pages } = await supabase
      .from("pages")
      .select("title, slug, page_type, feature_key")
      .eq("tenant_id", tenantId)
      .eq("is_published", true)
      .eq("is_homepage", false)
      .neq("page_type", "site_header")
      .order("title", { ascending: true });

    if (!pages || pages.length === 0) return [];

    // For template pages, filter out those whose feature flag is disabled
    const featureKeys = [
      ...new Set(
        pages
          .filter((p) => (p as Record<string, unknown>).page_type === "template" && (p as Record<string, unknown>).feature_key)
          .map((p) => String((p as Record<string, unknown>).feature_key))
      ),
    ];

    let enabledFlags = new Set<string>();
    if (featureKeys.length > 0) {
      const { data: flags } = await supabase
        .from("feature_flags")
        .select("key, enabled")
        .eq("tenant_id", tenantId)
        .in("key", featureKeys);
      enabledFlags = new Set(
        (flags ?? []).filter((f) => f.enabled).map((f) => f.key)
      );
    }

    return pages
      .filter((p) => {
        const pg = p as Record<string, unknown>;
        if (pg.page_type === "template" && pg.feature_key) {
          return enabledFlags.has(String(pg.feature_key));
        }
        return true; // custom pages always shown
      })
      .map((p) => ({ title: p.title, slug: p.slug }));
  },
  ["tenant-nav-pages"],
  { revalidate: false, tags: ["pages", "flags"] }
);

/**
 * Normalise a slot item coming from block content. Ensures valid defaults
 * and coerces stored string-typed toggles.
 */
function normalizeSlotItems(raw: unknown): SlotItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r): SlotItem | null => {
      if (!r || typeof r !== "object") return null;
      const item = r as Record<string, unknown>;
      const kind = item.kind;
      if (kind !== "text" && kind !== "image" && kind !== "button") return null;

      const str = (k: string) =>
        typeof item[k] === "string" ? (item[k] as string) : undefined;
      const num = (k: string) =>
        typeof item[k] === "number" ? (item[k] as number) : undefined;

      const textSizes = ["xs", "sm", "base", "lg", "xl", "2xl"] as const;
      const textWeights = ["normal", "medium", "semibold", "bold"] as const;
      const buttonSizes = ["sm", "default", "lg"] as const;
      const roundeds = ["none", "sm", "md", "lg", "full"] as const;

      const pickEnum = <T extends string>(
        key: string,
        allowed: readonly T[],
      ): T | undefined => {
        const v = item[key];
        return typeof v === "string" && (allowed as readonly string[]).includes(v)
          ? (v as T)
          : undefined;
      };

      return {
        kind,
        text: str("text"),
        imageId: typeof item.imageId === "number" ? item.imageId : null,
        href: str("href"),

        textSize: pickEnum("textSize", textSizes),
        textWeight: pickEnum("textWeight", textWeights),
        textColor: str("textColor"),
        italic: item.italic === true,

        imageHeight: num("imageHeight"),
        imageRounded: pickEnum("imageRounded", roundeds),
        imageAlt: str("imageAlt"),

        variant:
          item.variant === "outline" || item.variant === "ghost"
            ? item.variant
            : "default",
        buttonSize: pickEnum("buttonSize", buttonSizes),
        buttonBg: str("buttonBg"),
        buttonFg: str("buttonFg"),

        marginX: num("marginX"),
      };
    })
    .filter((x): x is SlotItem => x !== null);
}

function normalizeNavPages(raw: unknown): NavPageRef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r): NavPageRef | null => {
      if (!r || typeof r !== "object") return null;
      const p = r as Record<string, unknown>;
      const title = typeof p.title === "string" ? p.title : "";
      const href = typeof p.href === "string" ? p.href : "";
      const kindRaw = typeof p.kind === "string" ? p.kind : undefined;
      const kind: "page" | "anchor" | "external" =
        kindRaw === "anchor" || kindRaw === "external"
          ? kindRaw
          : "page";

      // Need *something* renderable.
      if (!title && !href) return null;

      const id = typeof p.id === "number" ? p.id : undefined;
      const sectionId = typeof p.sectionId === "number" ? p.sectionId : undefined;

      // For "page" kind, we still expect an id (legacy invariant).
      if (kind === "page" && id === undefined) {
        // Accept anyway if href looks like an internal path — treat as external.
        return { kind: "external", title, href: href || "/" };
      }

      return {
        kind,
        id,
        sectionId,
        title,
        href: href || "/",
      };
    })
    .filter((x): x is NavPageRef => x !== null);
}

function coerceBool(v: unknown, fallback: boolean): boolean {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return fallback;
}

function coerceNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function coerceString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return undefined;
}

/**
 * Fetch the shared Header & Footer Puck page for a tenant and extract the
 * first `site_header` block's content as a `SiteHeaderConfig`.
 *
 * Returns `null` if no header page exists yet.
 * Not cached — must be fresh so edits apply without a cache purge.
 */
export async function getHeaderConfig(tenantId: number): Promise<SiteHeaderConfig | null> {
  const supabase = createAdminClient();

  const { data: page } = await supabase
    .from("pages")
    .select("id, sections(blocks(type, content))")
    .eq("tenant_id", tenantId)
    .eq("page_type", "site_header")
    .order("id", { ascending: true })
    .limit(1)
    .single();

  if (!page) return null;

  const pageId = (page as Record<string, unknown> & { id: number }).id;
  const sections = (page as Record<string, unknown> & { sections?: unknown[] }).sections ?? [];
  for (const section of sections) {
    const s = section as { blocks?: Array<{ type: string; content: Record<string, unknown> }> };
    for (const block of s.blocks ?? []) {
      if (block.type === "site_header") {
        const c = block.content as Record<string, unknown>;
        const sectionStyle = c.sectionStyle as Record<string, unknown> | undefined;
        const bgColor = coerceString(sectionStyle?.backgroundColor ?? c.backgroundColor);
        const navPagesTextStyle =
          c.navPagesTextStyle && typeof c.navPagesTextStyle === "object"
            ? (c.navPagesTextStyle as SiteHeaderConfig["navPagesTextStyle"])
            : undefined;
        return {
          leftItems: normalizeSlotItems(c.leftItems),
          rightItems: normalizeSlotItems(c.rightItems),
          navPages: normalizeNavPages(c.navPages),
          sticky: coerceBool(c.sticky, true),
          scrollTransparency: coerceBool(c.scrollTransparency, false),
          borderBottom: coerceBool(c.borderBottom, true),
          backgroundColor: bgColor,
          backgroundOpacity: 100,
          backdropBlur: coerceBool(c.backdropBlur, true),
          navPagesTextStyle,
          headerPageId: pageId,
        };
      }
    }
  }

  // Page exists but no site_header block yet — still return the id so admin can edit it
  return {
    headerPageId: pageId,
  };
}

/**
 * Fetch the `site_footer` block from the same shared Header & Footer page.
 * Returns `null` if no such page or no footer block exists yet.
 */
export async function getFooterConfig(tenantId: number): Promise<SiteFooterConfig | null> {
  const supabase = createAdminClient();

  const { data: page } = await supabase
    .from("pages")
    .select("id, sections(blocks(type, content))")
    .eq("tenant_id", tenantId)
    .eq("page_type", "site_header")
    .order("id", { ascending: true })
    .limit(1)
    .single();

  if (!page) return null;

  const pageId = (page as Record<string, unknown> & { id: number }).id;
  const sections = (page as Record<string, unknown> & { sections?: unknown[] }).sections ?? [];
  for (const section of sections) {
    const s = section as { blocks?: Array<{ type: string; content: Record<string, unknown> }> };
    for (const block of s.blocks ?? []) {
      if (block.type === "site_footer") {
        const c = block.content as Record<string, unknown>;
        const sectionStyle = c.sectionStyle as Record<string, unknown> | undefined;
        const bgColor = coerceString(sectionStyle?.backgroundColor ?? c.backgroundColor);
        return {
          leftItems: normalizeSlotItems(c.leftItems),
          centerItems: normalizeSlotItems(c.centerItems),
          rightItems: normalizeSlotItems(c.rightItems),
          borderTop: coerceBool(c.borderTop, true),
          backgroundColor: bgColor,
          backgroundOpacity: 100,
          footerPageId: pageId,
        };
      }
    }
  }

  return { footerPageId: pageId };
}
