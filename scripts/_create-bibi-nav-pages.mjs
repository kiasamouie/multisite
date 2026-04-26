#!/usr/bin/env node
// Create real page records for the navbar entries that the Stitch hero
// references (Menu / Our Story / Private Dining), then rewrite the
// site_header navPages to use kind:"page" with the real page IDs.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  for (const path of [".env", ".env.local"]) {
    try {
      readFileSync(path, "utf8").split("\n").forEach((line) => {
        const [k, ...v] = line.split("=");
        if (k && v.length) env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
      });
    } catch {}
  }
  return env;
}
const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TENANT_ID = 22;

const NAV_PAGES = [
  { slug: "menu", title: "Menu" },
  { slug: "private-dining", title: "Private Dining" },
  { slug: "our-story", title: "Our Story" },
];

async function findOrCreatePage({ slug, title }) {
  const { data: existing } = await supabase
    .from("pages")
    .select("id")
    .eq("tenant_id", TENANT_ID)
    .eq("slug", slug)
    .maybeSingle();
  if (existing?.id) {
    console.log(`  · ${slug} → existing id=${existing.id}`);
    return existing.id;
  }
  const { data, error } = await supabase
    .from("pages")
    .insert({
      tenant_id: TENANT_ID,
      slug,
      title,
      page_type: "custom",
      page_config: {},
      is_published: true,
      is_homepage: false,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Create ${slug}: ${error.message}`);
  console.log(`  · ${slug} → created id=${data.id}`);
  return data.id;
}

async function main() {
  console.log("Creating navbar page stubs:");
  const pageIds = [];
  for (const p of NAV_PAGES) {
    const id = await findOrCreatePage(p);
    pageIds.push({ ...p, id });
  }

  // Build navPages array using kind:"page" with real ids
  const navPages = [
    { kind: "page", id: pageIds.find((p) => p.slug === "menu").id, title: "Menu", href: "/menu" },
    {
      kind: "page",
      id: pageIds.find((p) => p.slug === "private-dining").id,
      title: "Private Dining",
      href: "/private-dining",
    },
    { kind: "page", id: pageIds.find((p) => p.slug === "our-story").id, title: "Our Story", href: "/our-story" },
  ];

  // Update every site_header block on the header page
  const { data: hp } = await supabase
    .from("pages")
    .select("id, sections(blocks(id, type, content))")
    .eq("tenant_id", TENANT_ID)
    .eq("page_type", "site_header")
    .single();

  let updated = 0;
  for (const sec of hp?.sections ?? []) {
    for (const b of sec.blocks ?? []) {
      if (b.type !== "site_header") continue;
      const content = { ...b.content, navPages };
      const { error } = await supabase.from("blocks").update({ content }).eq("id", b.id);
      if (error) throw new Error(`Update header ${b.id}: ${error.message}`);
      updated++;
    }
  }
  console.log(`✓ Updated ${updated} site_header block(s) with kind:"page" navPages`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
