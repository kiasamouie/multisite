/**
 * Tenant Provisioning Service
 *
 * Handles automated setup when a new tenant is created:
 * - Creates default feature flags based on plan
 * - Creates template pages with sections + blocks for enabled features
 *
 * Also handles plan changes (upgrade / downgrade):
 * - Syncs feature flags to match the new plan
 * - Creates any new template pages unlocked by the plan
 * - Disables pages for features no longer in the plan
 */

import { createAdminClient } from "../supabase/admin";
import {
  getTemplatesForPlan,
  type PageTemplate,
} from "../config/pageTemplates";
import { PLANS, type PlanTier } from "../stripe/plans";

export type ProvisioningResult = {
  success: boolean;
  tenantId: number;
  pagesCreated: number;
  flagsCreated: number;
  errors?: string[];
};

/**
 * Insert sections and blocks for a page based on its template definition.
 */
async function insertSectionsAndBlocks(
  admin: ReturnType<typeof createAdminClient>,
  pageId: number,
  template: PageTemplate,
  errors: string[]
): Promise<void> {
  for (const section of template.sections) {
    const { data: sectionData, error: sectionError } = await admin
      .from("sections")
      .insert({
        page_id: pageId,
        type: section.type,
        position: section.position,
      })
      .select("id")
      .single();

    if (sectionError) {
      errors.push(
        `Failed to create section (page ${pageId}, pos ${section.position}): ${sectionError.message}`
      );
      continue;
    }

    if (section.blocks.length > 0) {
      const blockInserts = section.blocks.map((b) => ({
        section_id: sectionData.id,
        type: b.type,
        content: b.content as Record<string, never>,
        position: b.position,
      }));

      const { error: blockError } = await admin
        .from("blocks")
        .insert(blockInserts);

      if (blockError) {
        errors.push(
          `Failed to create blocks for section ${sectionData.id}: ${blockError.message}`
        );
      }
    }
  }
}

/**
 * Optional overrides accepted at tenant creation time.
 *
 * - `selectedPageKeys` — when provided, only template pages whose `key` is
 *   in the list will be created. When omitted, all plan-default templates
 *   are provisioned (existing behaviour).
 * - `featureFlagOverrides` — when provided, the listed flag keys will be
 *   set to the given enabled value, overriding the plan default. Other
 *   flags fall back to the plan default.
 */
export interface ProvisionOptions {
  selectedPageKeys?: string[];
  featureFlagOverrides?: Record<string, boolean>;
}

/**
 * Provision a new tenant with default pages and feature flags.
 * Called immediately after tenant is created.
 */
export async function provisionTenant(
  tenantId: number,
  plan: PlanTier,
  options: ProvisionOptions = {}
): Promise<ProvisioningResult> {
  const admin = createAdminClient();
  const errors: string[] = [];
  let flagsCreated = 0;
  let pagesCreated = 0;
  const { selectedPageKeys, featureFlagOverrides } = options;
  const selectedSet = selectedPageKeys ? new Set(selectedPageKeys) : null;

  try {
    // Step 1: Insert feature flags derived directly from the plan config.
    // We collect all known feature keys from all plans and set each one
    // to true/false depending on whether this plan includes it. Per-flag
    // overrides are applied last.
    const allKeys = new Set<string>();
    Object.values(PLANS).forEach((p) => p.features.forEach((f) => allKeys.add(f)));

    const planFeatures = new Set(PLANS[plan].features);
    const flagInserts = Array.from(allKeys).map((key) => ({
      tenant_id: tenantId,
      key,
      enabled:
        featureFlagOverrides && key in featureFlagOverrides
          ? featureFlagOverrides[key]
          : planFeatures.has(key),
    }));

    const { error: flagError } = await admin
      .from("feature_flags")
      .insert(flagInserts);

    if (flagError) {
      errors.push(`Failed to create feature flags: ${flagError.message}`);
    } else {
      flagsCreated = flagInserts.length;
    }

    // Step 2: Create template pages for features included in this plan.
    // We derive this directly from the plan's feature set — no extra DB
    // round-trip needed. The unique index on (tenant_id, feature_key)
    // prevents duplicates if this is somehow called twice.
    const templates = getTemplatesForPlan(plan);

    for (const template of templates) {
      // Only create pages for features actually in this plan
      if (!planFeatures.has(template.feature_key)) continue;
      // When the caller supplied a page selection, skip un-selected templates
      if (selectedSet && !selectedSet.has(template.key)) continue;

      const { data: pageData, error: pageError } = await admin
        .from("pages")
        .insert({
          tenant_id: tenantId,
          title: template.title,
          slug: template.slug,
          feature_key: template.feature_key,
          page_type: "template",
          page_config: {},
          is_published: true,
          is_homepage: template.is_homepage ?? false,
        })
        .select("id")
        .single();

      if (pageError) {
        // 23505 = unique_violation — page already exists, not an error
        if ((pageError as { code?: string }).code !== "23505") {
          errors.push(`Failed to create page ${template.key}: ${pageError.message}`);
        }
      } else {
        pagesCreated++;
        // Insert template sections and blocks for the new page
        await insertSectionsAndBlocks(admin, pageData.id, template, errors);
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

/**
 * Sync a tenant's feature flags and template pages to a new plan.
 * Called when a tenant's plan is upgraded or downgraded — whether triggered
 * by an admin action or a Stripe subscription event.
 *
 * Strategy:
 * - Upserts ALL known feature flags: enabled = plan includes it
 * - Creates any template pages newly unlocked by the plan (skips existing ones)
 * - Does NOT delete pages from demoted features (preserves content), but the
 *   rendering layer gates visibility via the flag value
 */
export async function syncTenantPlan(
  tenantId: number,
  newPlan: PlanTier
): Promise<ProvisioningResult> {
  const admin = createAdminClient();
  const errors: string[] = [];
  let flagsCreated = 0;
  let pagesCreated = 0;

  try {
    // Step 1: Upsert every known feature flag to match the new plan.
    const allKeys = new Set<string>();
    Object.values(PLANS).forEach((p) => p.features.forEach((f) => allKeys.add(f)));

    const planFeatures = new Set(PLANS[newPlan].features);
    const flagUpserts = Array.from(allKeys).map((key) => ({
      tenant_id: tenantId,
      key,
      enabled: planFeatures.has(key),
    }));

    const { error: flagError } = await admin
      .from("feature_flags")
      .upsert(flagUpserts, { onConflict: "tenant_id,key" });

    if (flagError) {
      errors.push(`Failed to sync feature flags: ${flagError.message}`);
    } else {
      flagsCreated = flagUpserts.length;
    }

    // Step 2: Create template pages for features newly available in this plan.
    // Pages that already exist are silently ignored (unique constraint).
    const templates = getTemplatesForPlan(newPlan);

    for (const template of templates) {
      if (!planFeatures.has(template.feature_key)) continue;

      const { data: pageData, error: pageError } = await admin
        .from("pages")
        .insert({
          tenant_id: tenantId,
          title: template.title,
          slug: template.slug,
          feature_key: template.feature_key,
          page_type: "template",
          page_config: {},
          is_published: true,
          is_homepage: template.is_homepage ?? false,
        })
        .select("id")
        .single();

      if (pageError) {
        // 23505 = unique_violation — page already exists, fine
        if ((pageError as { code?: string }).code !== "23505") {
          errors.push(`Failed to create page ${template.key}: ${pageError.message}`);
        }
      } else {
        pagesCreated++;
        // Insert template sections and blocks for the new page
        await insertSectionsAndBlocks(admin, pageData.id, template, errors);
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
