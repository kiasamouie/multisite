import { unstable_cache } from "next/cache";
import { createAdminClient } from "@repo/lib/supabase/admin";
import { getPageMedia } from "@repo/lib/media/resolve";
import { getAllFlags } from "@repo/lib/flags/check";
import type { Tenant } from "@repo/lib/tenant/context";
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
 * Cached homepage lookup (by is_homepage flag).
 * Includes feature flag validation for template pages.
 */
export const getCachedHomePage = unstable_cache(
  async (tenantId: number): Promise<Page | null> => {
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
  },
  ["homepage"],
  { revalidate: false, tags: ["pages"] }
);

/**
 * Cached page by slug + tenant.
 * Includes feature flag validation for template pages.
 */
export const getCachedPage = unstable_cache(
  async (tenantId: number, slug: string): Promise<Page | null> => {
    const supabase = createAdminClient();
    const { data: page } = await supabase
      .from("pages")
      .select("*, sections(*, blocks(*))")
      .eq("tenant_id", tenantId)
      .eq("slug", slug)
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

      // If feature is disabled, treat page as not found
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
  },
  ["page-by-slug"],
  { revalidate: false, tags: ["pages"] }
);

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
