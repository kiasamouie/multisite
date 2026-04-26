import { getSettings } from "@repo/lib/site-settings/read";
import { getActiveAdminTenantId } from "@/lib/admin-tenant";
import { NavigationForm } from "./navigation-form";

export const dynamic = "force-dynamic";

export default async function NavigationSettingsPage() {
  const { tenantId } = await getActiveAdminTenantId();
  const navigation = await getSettings(tenantId, "navigation");

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Navigation</h2>
        <p className="text-sm text-muted-foreground">
          Behaviour for site navigation links — including anchor links that
          deep-link into specific page sections (e.g. <code>/about#pricing</code>).
        </p>
      </header>
      <NavigationForm initial={navigation} />
    </div>
  );
}
