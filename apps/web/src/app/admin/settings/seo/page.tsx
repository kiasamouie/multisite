import { getSettings } from "@repo/lib/site-settings/read";
import { getActiveAdminTenantId } from "@/lib/admin-tenant";
import { SeoForm } from "./seo-form";

export const dynamic = "force-dynamic";

export default async function SeoSettingsPage() {
  const { tenantId } = await getActiveAdminTenantId();
  const seo = await getSettings(tenantId, "seo");

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">SEO</h2>
        <p className="text-sm text-muted-foreground">
          Defaults for search engine metadata. Per-page overrides take priority
          over these.
        </p>
      </header>
      <SeoForm initial={seo} />
    </div>
  );
}
