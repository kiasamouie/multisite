import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageRenderer } from "@repo/template/renderer/page";
import { getCachedTenant, getCachedTenantBySlug, getCachedPage, getCachedPageMedia, getCachedFlags } from "@/lib/cache";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params;
  const headersList = await headers();
  const tenantSlug = headersList.get("x-tenant-slug");
  const domain = headersList.get("x-tenant-domain") || "localhost";

  const tenant = tenantSlug
    ? await getCachedTenantBySlug(tenantSlug)
    : await getCachedTenant(domain);
  if (!tenant) notFound();

  const page = await getCachedPage(tenant.id, slug);
  if (!page) notFound();

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
