import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@repo/lib/supabase/server";
import { getPlatformAdmin } from "@repo/lib/tenant/platform";
import { getPlatformSettings } from "../_actions";
import { SecurityForm } from "./security-form";

export const dynamic = "force-dynamic";

export default async function PlatformSecuritySettingsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const admin = await getPlatformAdmin(user.id);
  if (!admin) redirect("/admin");

  const settings = await getPlatformSettings("security");

  return (
    <div className="space-y-6 p-6">
      <header>
        <h2 className="text-2xl font-semibold">Security</h2>
        <p className="text-sm text-muted-foreground">
          Signup policies and authentication requirements.
        </p>
      </header>
      <SecurityForm initial={settings} />
    </div>
  );
}
