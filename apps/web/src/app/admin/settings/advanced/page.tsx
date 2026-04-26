import { getSettings } from "@repo/lib/site-settings/read";
import { getActiveAdminTenantId } from "@/lib/admin-tenant";
import { AdvancedForm } from "./advanced-form";

export const dynamic = "force-dynamic";

export default async function AdvancedSettingsPage() {
  const { tenantId } = await getActiveAdminTenantId();
  const advanced = await getSettings(tenantId, "advanced");

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Advanced</h2>
        <p className="text-sm text-muted-foreground">
          Custom CSS and head HTML injected into the public site only.
          Be careful — broken CSS or HTML here can break your public site.
        </p>
      </header>
      <AdvancedForm initial={advanced} />
    </div>
  );
}
