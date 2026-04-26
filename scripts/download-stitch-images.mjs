#!/usr/bin/env node
/**
 * Download Stitch image URLs → Supabase Storage + create media records.
 *
 * Always saves as PNG (per workflow convention). Idempotent: if a media
 * row already exists for the same `(tenant_id, filename)` it is reused.
 *
 * Usage:
 *   node scripts/download-stitch-images.mjs <tenantId> <inputJson> [outputJson]
 *
 *   <inputJson>  Path to JSON file: [{ url, usageType?, altText? }, ...]
 *   <outputJson> Optional. Defaults to <inputJson>.uploaded.json
 *
 * Output JSON format (consumed by provision-from-stitch.mjs):
 *   {
 *     "<remoteUrl>": { mediaId, storagePath, publicUrl, filename }
 *   }
 *
 * Notes:
 * - Uses `curl -L` for downloads (handles redirects).
 * - Uploads to bucket `media` under path `media/<tenantId>/<filename>.png`.
 * - Creates a row in the `media` table with the storage path stored in `url`
 *   (matches existing convention in apps/web/src/app/api/admin/media/upload).
 */

import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
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

const [, , tenantIdArg, inputPath, outputPathArg] = process.argv;
if (!tenantIdArg || !inputPath) {
  console.error("Usage: node scripts/download-stitch-images.mjs <tenantId> <inputJson> [outputJson]");
  process.exit(1);
}
const tenantId = parseInt(tenantIdArg, 10);
if (!Number.isFinite(tenantId)) {
  console.error("❌ tenantId must be a number");
  process.exit(1);
}

const inputs = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
if (!Array.isArray(inputs)) {
  console.error("❌ Input JSON must be an array of { url, usageType?, altText? }");
  process.exit(1);
}

const outputPath = outputPathArg
  ? resolve(outputPathArg)
  : resolve(inputPath).replace(/\.json$/i, ".uploaded.json");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const tmp = mkdtempSync(join(tmpdir(), "stitch-img-"));

function shortHash(input) {
  return createHash("sha256").update(input).digest("hex").slice(0, 10);
}

function safeStem(url, fallback) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || fallback;
    return last.replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9-_]/gi, "-").slice(0, 40) || fallback;
  } catch {
    return fallback;
  }
}

async function downloadAndUpload({ url, usageType, altText }) {
  const stem = safeStem(url, "image");
  const filename = `${stem}-${shortHash(url)}.png`;
  const storagePath = `media/${tenantId}/${filename}`;
  const localPath = join(tmp, filename);

  console.log(`⬇️  ${url}`);
  // -L follow redirects, -f fail on 4xx/5xx, -s silent, --output write to file
  execFileSync("curl", ["-L", "-f", "-s", "--output", localPath, url], { stdio: ["ignore", "ignore", "inherit"] });

  const buffer = readFileSync(localPath);

  // Upload (with upsert to make the script re-runnable)
  const upload = await admin.storage.from("media").upload(storagePath, buffer, {
    contentType: "image/png",
    upsert: true,
  });
  if (upload.error) throw new Error(`Upload failed for ${url}: ${upload.error.message}`);

  // Signed URL (1h)
  const { data: signed } = await admin.storage.from("media").createSignedUrl(storagePath, 3600);
  const publicUrl = signed?.signedUrl || "";

  // Reuse existing media row if present
  const { data: existing } = await admin
    .from("media")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("filename", filename)
    .maybeSingle();

  let mediaId = existing?.id;
  if (!mediaId) {
    const { data: inserted, error: insertErr } = await admin
      .from("media")
      .insert({
        tenant_id: tenantId,
        filename,
        url: storagePath,
        metadata: {
          type: "image",
          uploadedAt: new Date().toISOString(),
          storagePath,
          source: "stitch",
          remoteUrl: url,
          usageType: usageType || null,
          altText: altText || null,
        },
      })
      .select("id")
      .single();
    if (insertErr || !inserted) throw new Error(`Insert failed for ${url}: ${insertErr?.message}`);
    mediaId = inserted.id;
  }

  unlinkSync(localPath);
  return { remoteUrl: url, mediaId, storagePath, publicUrl, filename };
}

async function main() {
  console.log(`🖼  Downloading ${inputs.length} image(s) for tenant ${tenantId} → ${outputPath}\n`);
  const results = {};
  for (const item of inputs) {
    if (!item?.url) continue;
    if (results[item.url]) continue;
    try {
      const res = await downloadAndUpload(item);
      results[item.url] = res;
      console.log(`   ✓ media #${res.mediaId} ← ${res.filename}`);
    } catch (err) {
      console.error(`   ✗ ${item.url}\n     ${err.message}`);
    }
  }
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Wrote upload manifest to ${outputPath}`);
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});
