import { headers } from "next/headers";
import { PageRenderer } from "@repo/template/renderer/page";
import { getCachedTenant, getCachedTenantBySlug, getCachedHomePage, getCachedPageMedia, getCachedFlags } from "@/lib/cache";

export default async function HomePage() {
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");
  const domain = headersList.get("x-tenant-domain") || "localhost";

  const tenant = tenantSlug
    ? await getCachedTenantBySlug(tenantSlug)
    : await getCachedTenant(domain);
  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Welcome</h1>
          <p className="mt-4 text-muted-foreground">
            This site is being set up. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  const page = await getCachedHomePage(tenant.id);

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Welcome</h1>
          <p className="mt-4 text-muted-foreground">
            This site is being set up. Check back soon.
          </p>
        </div>
      </div>
    );
  }

  // Fetch media associations and feature flags in parallel
  const [media, flags] = await Promise.all([
    getCachedPageMedia(page.id),
    getCachedFlags(tenant.id, tenant.plan),
  ]);

  return (
    <PageRenderer
      page={{ ...page, media_associations: media, feature_flags: flags }}
    />
  );
}

export const revalidate = 0;
