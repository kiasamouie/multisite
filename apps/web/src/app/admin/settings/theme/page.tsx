import { getSettings } from "@repo/lib/site-settings/read";
import { getActiveAdminTenantId } from "@/lib/admin-tenant";
import { ThemeForm } from "./theme-form";

export const dynamic = "force-dynamic";

export default async function ThemeSettingsPage() {
  const { tenantId } = await getActiveAdminTenantId();
  const theme = await getSettings(tenantId, "theme");

  return (
    <div className="space-y-6 p-6">
      <header>
        <h2 className="text-2xl font-semibold">Theme &amp; Branding</h2>
        <p className="text-sm text-muted-foreground">
          Controls the colours and fonts of your{" "}
          <span className="font-medium">public website</span>. Your admin
          dashboard appearance is controlled by the light/dark toggle in the
          top bar.
        </p>
      </header>
      <ThemeForm initial={theme} />
    </div>
  );
}
