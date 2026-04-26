import { createAdminClient } from "../supabase/admin";
import type { Database } from "../supabase/types";
import type { SettingsByNamespace, SettingsNamespace } from "./types";

type Json = Database["public"]["Tables"]["site_settings"]["Row"]["value"];

/**
 * Upsert a tenant's settings for a namespace. The full value object is
 * stored — callers should merge with current settings if they want to
 * preserve fields they're not editing.
 *
 * Cache invalidation is the *caller's* responsibility — typically:
 *   revalidateTag(`site-settings:${tenantId}`);
 *   revalidateTag("tenants");
 * (these aren't called here so this module stays usable from non-Next
 * contexts like seed scripts and tests.)
 */
export async function upsertSettings<K extends SettingsNamespace>(
  tenantId: number,
  namespace: K,
  value: SettingsByNamespace[K],
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      {
        tenant_id: tenantId,
        namespace,
        value: value as unknown as Json,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,namespace" },
    );

  if (error) {
    throw new Error(
      `Failed to upsert site settings (tenant=${tenantId}, ns=${namespace}): ${error.message}`,
    );
  }
}

/**
 * Patch a subset of fields onto an existing namespace value. Reads current
 * value, shallow-merges the patch, writes it back.
 */
export async function patchSettings<K extends SettingsNamespace>(
  tenantId: number,
  namespace: K,
  patch: Partial<SettingsByNamespace[K]>,
): Promise<void> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("namespace", namespace)
    .maybeSingle();

  const current = ((data as { value?: unknown } | null)?.value ?? {}) as Record<
    string,
    unknown
  >;
  const next = { ...current, ...(patch as Record<string, unknown>) };
  await upsertSettings(tenantId, namespace, next as SettingsByNamespace[K]);
}
