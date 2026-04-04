/**
 * Tenant Provisioning Service
 * 
 * Handles automated setup when a new tenant is created:
 * - Creates default feature flags based on plan
 * - Creates template pages for enabled features
 */

import { createAdminClient } from "../supabase/admin";
import { getTemplatesForPlan } from "../config/pageTemplates";

export type ProvisioningResult = {
  success: boolean;
  tenantId: number;
  pagesCreated: number;
  flagsCreated: number;
  errors?: string[];
};

/**
 * Provision a new tenant with default pages and feature flags
 * Called immediately after tenant is created
 */
export async function provisionTenant(
  tenantId: number,
  plan: "starter" | "growth" | "pro"
): Promise<ProvisioningResult> {
  const admin = createAdminClient();
  const errors: string[] = [];
  let flagsCreated = 0;
  let pagesCreated = 0;

  try {
    // Step 1: Create feature flags for this tenant based on plan
    // Read defaults from feature_flag_defaults table
    const { data: defaults, error: defaultsError } = await admin
      .from("feature_flag_defaults")
      .select("key, default_enabled")
      .eq("plan_tier", plan);

    if (defaultsError) {
      errors.push(`Failed to fetch defaults: ${defaultsError.message}`);
      return { success: false, tenantId, pagesCreated, flagsCreated, errors };
    }

    if (defaults && defaults.length > 0) {
      const flagInserts = defaults.map((d) => ({
        tenant_id: tenantId,
        key: d.key,
        enabled: d.default_enabled,
      }));

      const { error: flagError } = await admin
        .from("feature_flags")
        .insert(flagInserts);

      if (flagError) {
        errors.push(`Failed to create feature flags: ${flagError.message}`);
      } else {
        flagsCreated = flagInserts.length;
      }
    }

    // Step 2: Create template pages for enabled features
    const templates = getTemplatesForPlan(plan);

    for (const template of templates) {
      try {
        // Only create if feature is in the enabled set
        const { data: flag, error: flagCheckError } = await admin
          .from("feature_flags")
          .select("enabled")
          .eq("tenant_id", tenantId)
          .eq("key", template.feature_key)
          .single();

        if (flagCheckError) {
          errors.push(
            `Failed to check flag for ${template.feature_key}: ${flagCheckError.message}`
          );
          continue;
        }

        // Only create page if feature is enabled for this plan
        if (flag?.enabled !== false) {
          const { error: pageError } = await admin
            .from("pages")
            .insert({
              tenant_id: tenantId,
              title: template.title,
              slug: template.slug,
              feature_key: template.feature_key,
              page_type: "template",
              page_config: template.defaultConfig,
              is_published: false, // Pages start as draft
            });

          if (pageError) {
            errors.push(
              `Failed to create page ${template.key}: ${pageError.message}`
            );
          } else {
            pagesCreated++;
          }
        }
      } catch (err) {
        errors.push(
          `Error provisioning ${template.key}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return {
      success: errors.length === 0,
      tenantId,
      pagesCreated,
      flagsCreated,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    return {
      success: false,
      tenantId,
      pagesCreated,
      flagsCreated,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}
