import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@repo/lib/supabase/server";
import { getPlatformAdmin } from "@repo/lib/tenant/platform";
import { getPlatformSettings } from "../_actions";
import { GeneralForm } from "./general-form";

export const dynamic = "force-dynamic";

export default async function PlatformGeneralSettingsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const admin = await getPlatformAdmin(user.id);
  if (!admin) redirect("/admin");

  const settings = await getPlatformSettings("general");

  return (
    <div className="space-y-6 p-6">
      <header>
        <h2 className="text-2xl font-semibold">General</h2>
        <p className="text-sm text-muted-foreground">
          Core identity of the Multisite platform.
        </p>
      </header>
      <GeneralForm initial={settings} />
    </div>
  );
}
