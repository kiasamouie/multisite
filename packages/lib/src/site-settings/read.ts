import { createAdminClient } from "../supabase/admin";
import { SETTINGS_DEFAULTS } from "./defaults";
import type { SettingsByNamespace, SettingsNamespace } from "./types";

/**
 * Read a tenant's settings for a single namespace. Returns the namespace
 * defaults when no row exists, so callers can render UIs safely.
 *
 * Not cached at this layer — call sites either need fresh data (admin)
 * or wrap this in `unstable_cache` themselves with a tag like
 * `site-settings:{tenantId}`.
 */
export async function getSettings<K extends SettingsNamespace>(
  tenantId: number,
  namespace: K,
): Promise<SettingsByNamespace[K]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("namespace", namespace)
    .maybeSingle();

  if (!data) return SETTINGS_DEFAULTS[namespace];

  const value = (data as { value: unknown }).value;
  if (!value || typeof value !== "object") return SETTINGS_DEFAULTS[namespace];

  // Merge stored value over defaults so missing keys pick up new defaults.
  return {
    ...SETTINGS_DEFAULTS[namespace],
    ...(value as object),
  } as SettingsByNamespace[K];
}

/**
 * Read every namespace for a tenant in a single query. Useful for SSR of
 * pages that depend on multiple settings (e.g. the public layout).
 */
export async function getAllSettings(
  tenantId: number,
): Promise<Partial<SettingsByNamespace>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("site_settings")
    .select("namespace, value")
    .eq("tenant_id", tenantId);

  const out: Partial<SettingsByNamespace> = {};
  for (const row of (data ?? []) as Array<{ namespace: string; value: unknown }>) {
    const ns = row.namespace as SettingsNamespace;
    if (!(ns in SETTINGS_DEFAULTS)) continue;
    if (row.value && typeof row.value === "object") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[ns] = {
        ...SETTINGS_DEFAULTS[ns],
        ...(row.value as object),
      };
    }
  }
  return out;
}
