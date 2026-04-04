import { headers } from "next/headers";
import { getCachedTenant, getCachedTenantBySlug } from "./cache";
import type { Tenant } from "@repo/lib/tenant/context";

/**
 * Resolves the current tenant from headers set by middleware.
 * In dev, x-tenant-slug overrides domain-based resolution (?_tenant=kaimusic).
 * In prod, always uses x-tenant-domain (production domain from Host header).
 */
export async function getCurrentTenant(): Promise<Tenant | null> {
  const headersList = await headers();
  // Dev-mode slug override
  const slug = headersList.get("x-tenant-slug");
  if (slug) return getCachedTenantBySlug(slug);
  // Production domain-based resolution
  const domain = headersList.get("x-tenant-domain");
  if (!domain) return null;
  return getCachedTenant(domain);
}
