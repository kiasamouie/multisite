import { createAdminClient } from "../supabase/admin";
import { getPlanDefaults } from "./defaults";
import type { PlanTier } from "../stripe/plans";

/**
 * Check if a feature flag is enabled for a tenant.
 * Two-tier: per-tenant override first, then plan default.
 */
export async function hasFlag(tenantId: number, key: string): Promise<boolean> {
  const supabase = createAdminClient();

  // 1. Check per-tenant override
  const { data: override } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("tenant_id", tenantId)
    .eq("key", key)
    .single();

  if (override) {
    return override.enabled;
  }

  // 2. Fall back to plan default
  const { data: tenant } = await supabase
    .from("tenants")
    .select("plan")
    .eq("id", tenantId)
    .single();

  if (!tenant) return false;

  const defaults = getPlanDefaults(tenant.plan as PlanTier);
  return defaults[key] ?? false;
}

/**
 * Get all flags for a tenant (overrides merged with plan defaults).
 * Good for loading all flags at once in a layout.
 */
export async function getAllFlags(
  tenantId: number,
  plan: PlanTier
): Promise<Record<string, boolean>> {
  const supabase = createAdminClient();

  // Get plan defaults
  const defaults = getPlanDefaults(plan);

  // Get per-tenant overrides
  const { data: overrides } = await supabase
    .from("feature_flags")
    .select("key, enabled")
    .eq("tenant_id", tenantId);

  // Merge: override takes precedence
  const flags = { ...defaults };
  if (overrides) {
    overrides.forEach((o) => {
      flags[o.key] = o.enabled;
    });
  }

  return flags;
}
