"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@repo/lib/supabase/server";
import { getPlatformAdmin } from "@repo/lib/tenant/platform";
import { createAdminClient } from "@repo/lib/supabase/admin";

export type PlatformSettingsNamespace = "general" | "security" | "plans";

export interface PlatformGeneralSettings {
  platformName?: string;
  supportEmail?: string;
  description?: string;
}

export interface PlatformSecuritySettings {
  allowPublicSignup?: boolean;
  requireEmailVerification?: boolean;
}

export interface PlatformPlanSettings {
  trialDays?: number;
  defaultPlan?: "starter" | "growth" | "pro";
}

export type PlatformSettingsByNamespace = {
  general: PlatformGeneralSettings;
  security: PlatformSecuritySettings;
  plans: PlatformPlanSettings;
};

/** Read a platform settings namespace. Falls back to defaults if missing. */
export async function getPlatformSettings<
  K extends PlatformSettingsNamespace,
>(namespace: K): Promise<PlatformSettingsByNamespace[K]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("namespace", namespace)
    .maybeSingle();
  return ((data?.value ?? {}) as PlatformSettingsByNamespace[K]);
}

/** Verify current user is a platform admin; redirect to /admin if not. */
async function assertPlatformAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const admin = await getPlatformAdmin(user.id);
  if (!admin) redirect("/admin");
  return admin;
}

export async function savePlatformSettingsAction<
  K extends PlatformSettingsNamespace,
>(
  namespace: K,
  value: PlatformSettingsByNamespace[K],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertPlatformAdmin();
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("platform_settings")
      .upsert(
        { namespace, value: value as unknown as import("@repo/lib/supabase/types").Database["public"]["Tables"]["platform_settings"]["Row"]["value"] },
        { onConflict: "namespace" },
      );
    if (error) throw new Error(error.message);
    revalidatePath("/admin/platform-settings", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
