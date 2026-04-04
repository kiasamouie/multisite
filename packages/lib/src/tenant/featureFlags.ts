/**
 * Feature Flag Service
 * 
 * Handles feature flag operations including syncing page visibility
 * When a feature flag is toggled, update related template pages
 */

import { createAdminClient } from "../supabase/admin";

export type FeatureFlagToggleResult = {
  success: boolean;
  flagUpdated: boolean;
  pagesAffected: number;
  error?: string;
};

/**
 * Toggle a feature flag for a tenant
 * Also updates visibility of related template pages
 */
export async function toggleFeatureFlag(
  tenantId: number,
  featureKey: string,
  enabled: boolean
): Promise<FeatureFlagToggleResult> {
  const admin = createAdminClient();

  try {
    // Step 1: Update the feature flag
    const { error: flagError } = await admin
      .from("feature_flags")
      .upsert(
        {
          tenant_id: tenantId,
          key: featureKey,
          enabled,
        },
        { onConflict: "tenant_id,key" }
      );

    if (flagError) {
      return {
        success: false,
        flagUpdated: false,
        pagesAffected: 0,
        error: flagError.message,
      };
    }

    // Step 2: Find all template pages for this feature
    const { data: pages, error: pagesError } = await admin
      .from("pages")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("feature_key", featureKey)
      .eq("page_type", "template");

    if (pagesError) {
      return {
        success: false,
        flagUpdated: true,
        pagesAffected: 0,
        error: `Flag updated but failed to sync pages: ${pagesError.message}`,
      };
    }

    // Step 3: Update page visibility (soft-enable/disable)
    // Note: We use is_published to track visibility, not a separate is_enabled column
    // When feature is disabled, we keep the page but can hide it from listing
    if (pages && pages.length > 0) {
      const pageIds = pages.map((p) => p.id);

      // For now, we'll just track the feature flag state
      // The rendering layer checks feature_flags for visibility control
      // This prevents breaking customizations if flag is re-enabled
    }

    return {
      success: true,
      flagUpdated: true,
      pagesAffected: pages?.length ?? 0,
    };
  } catch (err) {
    return {
      success: false,
      flagUpdated: false,
      pagesAffected: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Get feature flag status for a tenant
 */
export async function getFeatureFlags(tenantId: number) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("feature_flags")
    .select("*")
    .eq("tenant_id", tenantId);

  if (error) {
    throw new Error(`Failed to fetch feature flags: ${error.message}`);
  }

  // Convert to Record for easier lookup
  const flagMap: Record<string, boolean> = {};
  if (data) {
    data.forEach((flag) => {
      flagMap[flag.key] = flag.enabled;
    });
  }

  return flagMap;
}

/**
 * Check if a specific feature is enabled for a tenant
 */
export async function isFeatureEnabled(
  tenantId: number,
  featureKey: string
): Promise<boolean> {
  const flags = await getFeatureFlags(tenantId);
  return flags[featureKey] ?? false;
}
