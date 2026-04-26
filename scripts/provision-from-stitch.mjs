#!/usr/bin/env node
/**
 * Provision a single tenant page from a parsed Stitch screen.
 *
 * Reads a "manifest" JSON file describing the target tenant + page + parsed
 * blocks (with image refs already resolved to media IDs), then writes:
 *   - tenants.branding (patched, not replaced)
 *   - one section per page with all blocks under it (replaces existing
 *     sections/blocks for that page — full overwrite for re-provisioning)
 *
 * Usage:
 *   node scripts/provision-from-stitch.mjs <manifestJson>
 *
 * Manifest shape:
 *   {
 *     "tenantId": 12,
 *     "pageSlug": "home",
 *     "pageTitle": "Home",
 *     "isHomepage": true,
 *     "branding": { "primary_color": "#6b0110", ... },
 *     "blocks": [
 *       { "type": "hero", "position": 0, "content": { ... } },
 *       ...
 *     ],
 *     "warnings": [ ... optional pass-through ... ]
 *   }
 *
 * Image substitution: callers should replace any `imageRefs` in parsed blocks
 * with concrete URLs (via the upload manifest from download-stitch-images.mjs)
 * BEFORE running this script. This script writes content as-is.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(__dirname, "..", name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const [k, ...v] = t.split("=");
      if (!process.env[k]) process.env[k] = v.join("=").replace(/^"|"$/g, "");
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const [, , manifestPath] = process.argv;
if (!manifestPath) {
  console.error("Usage: node scripts/provision-from-stitch.mjs <manifestJson>");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(resolve(manifestPath), "utf8"));
const { tenantId, pageSlug, pageTitle, isHomepage, branding, blocks } = manifest;

if (!tenantId || !pageSlug || !Array.isArray(blocks)) {
  console.error("❌ Manifest must include tenantId, pageSlug, and blocks[]");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function patchBranding() {
  if (!branding || Object.keys(branding).length === 0) return;
  const { data: existing } = await admin
    .from("tenants")
    .select("branding")
    .eq("id", tenantId)
    .single();
  const merged = { ...(existing?.branding ?? {}), ...branding };
  const { error } = await admin
    .from("tenants")
    .update({ branding: merged })
    .eq("id", tenantId);
  if (error) throw new Error(`Branding update failed: ${error.message}`);
  console.log(`🎨 Branding patched (${Object.keys(branding).join(", ")})`);
}

async function findOrCreatePage() {
  const { data: existing } = await admin
    .from("pages")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", pageSlug)
    .maybeSingle();

  if (existing?.id) {
    if (pageTitle || typeof isHomepage === "boolean") {
      const update = {};
      if (pageTitle) update.title = pageTitle;
      if (typeof isHomepage === "boolean") update.is_homepage = isHomepage;
      await admin.from("pages").update(update).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data: created, error } = await admin
    .from("pages")
    .insert({
      tenant_id: tenantId,
      title: pageTitle || pageSlug,
      slug: pageSlug,
      page_type: "custom",
      page_config: {},
      is_published: true,
      is_homepage: !!isHomepage,
    })
    .select("id")
    .single();
  if (error || !created) throw new Error(`Page create failed: ${error?.message}`);
  return created.id;
}

async function wipePageContent(pageId) {
  // Cascading FK delete on sections will drop all blocks
  const { error } = await admin.from("sections").delete().eq("page_id", pageId);
  if (error) throw new Error(`Failed to clear sections: ${error.message}`);
}

async function writeBlocks(pageId) {
  const { data: section, error: sectionErr } = await admin
    .from("sections")
    .insert({ page_id: pageId, type: "default", position: 0 })
    .select("id")
    .single();
  if (sectionErr || !section) throw new Error(`Section create failed: ${sectionErr?.message}`);

  if (blocks.length === 0) return;

  const rows = blocks.map((b, idx) => ({
    section_id: section.id,
    type: b.type,
    content: b.content || {},
    position: typeof b.position === "number" ? b.position : idx,
  }));
  const { error: blockErr } = await admin.from("blocks").insert(rows);
  if (blockErr) throw new Error(`Blocks insert failed: ${blockErr.message}`);
}

async function revalidate() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.log("ℹ️  REVALIDATE_SECRET not set — skipping cache revalidation");
    return;
  }
  try {
    const res = await fetch(`${baseUrl}/api/revalidate?tag=pages&secret=${secret}`);
    if (res.ok) console.log("🔄 revalidated tag: pages");
  } catch {
    // best-effort
  }
}

async function main() {
  console.log(`🛠  Provisioning tenant ${tenantId} / page "${pageSlug}" with ${blocks.length} block(s)\n`);

  await patchBranding();
  const pageId = await findOrCreatePage();
  console.log(`📄 Page id = ${pageId}`);
  await wipePageContent(pageId);
  await writeBlocks(pageId);
  console.log(`✅ Wrote ${blocks.length} block(s) under one default section`);
  await revalidate();

  if (Array.isArray(manifest.warnings) && manifest.warnings.length > 0) {
    console.log(`\n⚠️  ${manifest.warnings.length} unmapped Stitch component(s):`);
    for (const w of manifest.warnings) {
      console.log(`   • [${w.stitchType}] page=${w.page} pos=${w.position} → fallback=${w.fallback}`);
    }
    console.log("   Run the add-block-type prompt to extend the registry.");
  }

  console.log("\n🎉 Provisioning complete.");
}

main().catch((err) => {
  console.error("❌ Provisioning failed:", err.message);
  process.exit(1);
});
