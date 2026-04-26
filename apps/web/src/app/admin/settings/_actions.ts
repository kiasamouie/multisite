"use server";

import { updateTag, revalidatePath } from "next/cache";
import { upsertSettings } from "@repo/lib/site-settings/write";
import type {
  SettingsByNamespace,
  SettingsNamespace,
} from "@repo/lib/site-settings/types";
import { getActiveAdminTenantId } from "@/lib/admin-tenant";

/**
 * Save a settings namespace and bust caches that depend on it.
 *
 * Cache strategy: a single canonical tag `site-settings:{tenantId}` plus
 * `tenants` so that any layout reading either reflects the change. We also
 * revalidatePath the public root so the next public render picks it up.
 *
 * Uses `updateTag` (Next 16+) for read-your-own-writes semantics.
 */
export async function saveSettingsAction<K extends SettingsNamespace>(
  namespace: K,
  value: SettingsByNamespace[K],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { tenantId } = await getActiveAdminTenantId();
    await upsertSettings(tenantId, namespace, value);
    updateTag(`site-settings:${tenantId}`);
    updateTag("tenants");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: msg };
  }
}
