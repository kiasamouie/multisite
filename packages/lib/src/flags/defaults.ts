import { PLANS, type PlanTier } from "../stripe/plans";

/**
 * Get default feature flags for a plan tier.
 * This is the fast path — no DB query needed.
 */
export function getPlanDefaults(plan: PlanTier): Record<string, boolean> {
  const planConfig = PLANS[plan];
  const allFeatureKeys = new Set<string>();

  // Collect all feature keys from all plans
  Object.values(PLANS).forEach((p) => {
    p.features.forEach((f) => allFeatureKeys.add(f));
  });

  const defaults: Record<string, boolean> = {};
  allFeatureKeys.forEach((key) => {
    defaults[key] = planConfig.features.includes(key);
  });

  return defaults;
}

/**
 * Get all known feature flag keys across all plans.
 */
export function getAllFeatureKeys(): string[] {
  const keys = new Set<string>();
  Object.values(PLANS).forEach((p) => {
    p.features.forEach((f) => keys.add(f));
  });
  return Array.from(keys);
}
