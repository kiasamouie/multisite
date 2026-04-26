#!/usr/bin/env node
// One-off: apply Stitch design system to Bibi Kitchen (tenant 22).
// - Sets site_settings.theme palette (Tailwind tokens cascade through globals.css)
// - Updates the existing site_header block with brand + nav + Reserve button
// - Adds per-section sectionStyle.backgroundColor to home page blocks
// - Sets page background tint via tenant theme so blocks inherit correctly.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  for (const path of [".env", ".env.local"]) {
    try {
      readFileSync(path, "utf8")
        .split("\n")
        .forEach((line) => {
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
const HOME_PAGE_ID = 49;

async function main() {
  // ── 1. Theme palette ────────────────────────────────────────────────
  // Mirrors design.md tokens. paletteToCssVars converts these hex values to
  // HSL tuples and overrides --primary/--background/etc on the public site,
  // so every Tailwind utility class (bg-primary, text-foreground, bg-card)
  // automatically inherits the Bibi colour story.
  const themeValue = {
    mode: "light",
    palette: {
      primary: "#6b0110",          // pomegranate
      primaryForeground: "#ffffff",
      accent: "#775a19",           // saffron
      accentForeground: "#ffffff",
      background: "#fff8f3",       // surface — fine paper cream
      foreground: "#221a0e",       // on-surface — soft black
      muted: "#f0e0cc",            // surface-variant
    },
    font: { family: "Manrope" },
  };

  const { error: settingsErr } = await supabase
    .from("site_settings")
    .upsert(
      { tenant_id: TENANT_ID, namespace: "theme", value: themeValue },
      { onConflict: "tenant_id,namespace" },
    );
  if (settingsErr) throw new Error(`site_settings: ${settingsErr.message}`);
  console.log("✓ Theme palette set");

  // ── 2. Site header block ────────────────────────────────────────────
  // Find every site_header block on the header page (there are duplicates
  // from earlier scaffolding) and update them all to keep the live config
  // and the editor draft in sync.
  const { data: headerPage } = await supabase
    .from("pages")
    .select("id, sections(id, blocks(id, type))")
    .eq("tenant_id", TENANT_ID)
    .eq("page_type", "site_header")
    .single();

  const headerBlockIds = [];
  const footerBlockIds = [];
  for (const sec of headerPage?.sections ?? []) {
    for (const b of sec.blocks ?? []) {
      if (b.type === "site_header") headerBlockIds.push(b.id);
      if (b.type === "site_footer") footerBlockIds.push(b.id);
    }
  }

  const headerContent = {
    sticky: "true",
    borderBottom: "true",
    backdropBlur: "true",
    sectionStyle: { backgroundColor: "#fff8f3" }, // matches body bg
    leftItems: [
      {
        kind: "text",
        text: "BIBI",
        href: "/",
        imageId: null,
        variant: "default",
        textSize: "2xl",
        textWeight: "bold",
        textColor: "#6b0110",
      },
    ],
    navPages: [
      { kind: "external", href: "/", title: "The Kitchen" },
      { kind: "external", href: "#menu", title: "Menu" },
      { kind: "external", href: "#booking", title: "Private Dining" },
      { kind: "external", href: "#about", title: "Our Story" },
    ],
    rightItems: [
      {
        kind: "button",
        text: "Reserve",
        href: "#booking",
        imageId: null,
        variant: "default",
        buttonSize: "default",
        buttonRounded: "full",
        buttonBg: "#6b0110",
        buttonFg: "#ffffff",
      },
    ],
  };

  for (const id of headerBlockIds) {
    const { error } = await supabase.from("blocks").update({ content: headerContent }).eq("id", id);
    if (error) throw new Error(`update header block ${id}: ${error.message}`);
  }
  console.log(`✓ Updated ${headerBlockIds.length} site_header block(s)`);

  // Footer — minimal Bibi footer matching design
  const footerContent = {
    borderTop: "true",
    sectionStyle: { backgroundColor: "#fff8f3" },
    leftItems: [
      {
        kind: "text",
        text: "BIBI PERSIAN KITCHEN",
        href: "",
        imageId: null,
        variant: "default",
        textSize: "lg",
        textWeight: "semibold",
        textColor: "#6b0110",
      },
    ],
    centerItems: [],
    rightItems: [
      {
        kind: "text",
        text: "© 2026 BIBI PERSIAN KITCHEN. AN EDITORIAL TALE OF FLAVOR.",
        href: "",
        imageId: null,
        variant: "default",
        textSize: "xs",
        textWeight: "normal",
        textColor: "#6b0110",
      },
    ],
  };
  for (const id of footerBlockIds) {
    const { error } = await supabase.from("blocks").update({ content: footerContent }).eq("id", id);
    if (error) throw new Error(`update footer block ${id}: ${error.message}`);
  }
  console.log(`✓ Updated ${footerBlockIds.length} site_footer block(s)`);

  // ── 3. Per-section backgrounds on home page blocks ──────────────────
  // Match design.md surface tiers:
  //   surface              #fff8f3  (page base — hero + about)
  //   surface-container-low #fff2e1  (Curated Plates lift)
  //   primary-container    #8b1d24  (booking section over image bg)
  const { data: homeBlocks } = await supabase
    .from("blocks")
    .select("id, type, position, content, section_id, sections!inner(page_id)")
    .eq("sections.page_id", HOME_PAGE_ID)
    .order("position");

  const sectionBgByType = {
    hero: null, // image bg
    about: "#fff8f3",
    gallery: "#fff2e1", // <-- the "Curated Plates" lift
    booking_block: null, // image bg
  };

  for (const b of homeBlocks ?? []) {
    const bg = sectionBgByType[b.type];
    if (!bg) continue;
    const content = { ...b.content };
    content.sectionStyle = { ...(content.sectionStyle ?? {}), backgroundColor: bg };
    const { error } = await supabase.from("blocks").update({ content }).eq("id", b.id);
    if (error) throw new Error(`update block ${b.id}: ${error.message}`);
    console.log(`✓ Block ${b.id} (${b.type}) bg → ${bg}`);
  }

  // ── 4. Revalidate ───────────────────────────────────────────────────
  console.log("\nDone. Hard-refresh the browser tab to see the new theme.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
