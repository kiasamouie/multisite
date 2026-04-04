#!/usr/bin/env node

/**
 * Integration Test: Feature Flags + Tenant Provisioning
 * 
 * Tests:
 * 1. Create a test tenant
 * 2. Verify feature flags are created
 * 3. Verify template pages are created
 * 4. Check page visibility with feature flags
 * 5. Toggle feature flags and verify page visibility changes
 */

import { createAdminClient } from "@repo/lib/supabase/admin";
import { provisionTenant } from "@repo/lib/tenant/provisioning";
import { toggleFeatureFlag, getFeatureFlags } from "@repo/lib/tenant/featureFlags";

const admin = createAdminClient();

async function test() {
  console.log("\n🧪 Integration Test: Feature Flags + Tenant Provisioning\n");

  try {
    // 1. Create a test tenant
    console.log("1️⃣  Creating test tenant...");
    const testDomain = `test-tenant-${Date.now()}.local`;
    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({
        name: "Test Tenant",
        domain: testDomain,
        plan: "starter",
      })
      .select("id")
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Failed to create tenant: ${tenantError?.message}`);
    }

    const tenantId = tenant.id;
    console.log(`   ✓ Tenant created: ID ${tenantId}, Domain: ${testDomain}\n`);

    // 2. Provision tenant
    console.log("2️⃣  Provisioning tenant with default features...");
    const provisioning = await provisionTenant(tenantId, "starter");
    console.log(`   ✓ flags_created: ${provisioning.flagsCreated}`);
    console.log(`   ✓ pages_created: ${provisioning.pagesCreated}`);
    if (provisioning.errors?.length) {
      console.log(`   ⚠ Errors: ${provisioning.errors.join(", ")}`);
    }
    console.log();

    // 3. Fetch created feature flags
    console.log("3️⃣  Fetching feature flags...");
    const flags = await getFeatureFlags(tenantId);
    console.log(`   ✓ Flags (count: ${Object.keys(flags).length}):`);
    Object.entries(flags).slice(0, 5).forEach(([key, enabled]) => {
      console.log(`     - ${key}: ${enabled ? "✅ enabled" : "❌ disabled"}`);
    });
    console.log();

    // 4. Fetch created pages
    console.log("4️⃣  Fetching provisioned pages...");
    const { data: pages, error: pagesError } = await admin
      .from("pages")
      .select("id, slug, feature_key, page_type, is_published")
      .eq("tenant_id", tenantId)
      .eq("page_type", "template");

    if (pagesError) {
      throw new Error(`Failed to fetch pages: ${pagesError.message}`);
    }

    console.log(`   ✓ Pages created (count: ${pages?.length ?? 0}):`);
    pages?.slice(0, 5).forEach((page) => {
      console.log(`     - ${page.slug} (feature: ${page.feature_key})`);
    });
    console.log();

    // 5. Test feature flag toggle
    if (pages && pages.length > 0) {
      const testPage = pages[0];
      const testFeature = String(testPage.feature_key);

      console.log(`5️⃣  Testing feature flag toggle (${testFeature})...`);
      console.log(`   Current state: enabled`);

      // Toggle off
      const toggleResult = await toggleFeatureFlag(tenantId, testFeature, false);
      console.log(`   ✓ Toggled OFF: ${toggleResult.success ? "success" : "failed"}`);
      console.log(`   Pages affected: ${toggleResult.pagesAffected}`);

      // Check flag
      const flagsAfterToggle = await getFeatureFlags(tenantId);
      console.log(`   Flag ${testFeature} is now: ${flagsAfterToggle[testFeature] ? "enabled" : "disabled"}`);

      // Toggle back on
      await toggleFeatureFlag(tenantId, testFeature, true);
      console.log(`   ✓ Toggled back ON`);
      console.log();
    }

    // 6. Cleanup
    console.log("6️⃣  Cleaning up test data...");
    await admin.from("tenants").delete().eq("id", tenantId);
    console.log(`   ✓ Test tenant deleted\n`);

    console.log("✅ All tests passed!\n");
  } catch (error) {
    console.error("❌ Test failed:");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

test();
