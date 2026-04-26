# Workflow: Stitch → Puck Provisioning

> **Audience:** Copilot agent inside VS Code. This is the canonical sequence followed for any Stitch provisioning run.

The user provides inputs in [`inputs/`](inputs/). You execute steps in order. Stop and report immediately if any step fails.

---

## Step 0 — Read the Request

Read [`inputs/request.md`](inputs/request.md). It contains:

- **Tenant** — slug, ID, or domain
- **Page** — slug (e.g. `home`), title, isHomepage flag
- **Stitch project ID + screen IDs**
- **Optional design.md path** — colour/typography spec (default: `inputs/design.md`)
- **Optional pre-fetched screen JSONs** — under `inputs/screens/`

If `request.md` is missing, ask the user to fill in [`inputs/request.template.md`](inputs/request.template.md).

---

## Step 1 — Resolve Tenant ID

If the user gave a slug or domain (e.g. `bibikitchen`), resolve it to the numeric `tenants.id`:

```bash
node -e "
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((a, l) => {
  const [k, ...v] = l.split('='); if (k && v.length) a[k.trim()] = v.join('=').trim().replace(/^[\"']|[\"']\$/g, ''); return a;
}, {});
const { createClient } = require('@supabase/supabase-js');
const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data } = await c.from('tenants').select('id, name, slug, domain').or('slug.eq.bibikitchen,domain.eq.bibikitchen').maybeSingle();
  console.log(data);
})();
"
```

> **CRITICAL**: Always resolve the tenant ID from the database by slug or domain. **Never trust the numeric ID written in `request.md`** — it may be stale, wrong, or copied from a template. Only use the DB-resolved `tenantId` for all subsequent steps.

---

## Step 2 — Fetch Stitch Screens

For each screen ID in the request, call the Stitch MCP. Load via `tool_search` if needed.

### Canonical name format (required)

All Stitch MCP tools require a **canonical `name` path**, not a bare screen hex ID:

```
name: "projects/<projectId>/screens/<screenId>"
```

For example: `"projects/11681557974546401399/screens/6039b8cf526d43fbbd2000d457ccccf4"`

### Large project ID precision hazard

If the `projectId` has **more than 15 decimal digits** (i.e. > 2^53), the VS Code MCP wrapper will coerce it from a JSON string to a JavaScript `number`, silently losing precision. The resulting API call will fail with a "project not found" error.

**When this happens, bypass the MCP wrapper entirely and use raw curl:**

```bash
curl -s -X POST https://stitch.googleapis.com/mcp \
  -H "Content-Type: application/json" \
  -H "X-Goog-Api-Key: <YOUR_API_KEY>" \
  -d '{
    "jsonrpc": "2.0", "id": 1,
    "method": "tools/call",
    "params": {
      "name": "mcp_stitch_get_screen",
      "arguments": {
        "name": "projects/11681557974546401399/screens/6039b8cf526d43fbbd2000d457ccccf4"
      }
    }
  }'
```

The project ID is sent as a JSON **string** inside the `arguments` object — this preserves full precision. The response contains `content[].text` with the screen HTML, and a `downloadUrl` field you can fetch separately for the full HTML document.

### Workflow

1. Load the `mcp_stitch_list_screens` tool first to confirm screen IDs.
2. Call `mcp_stitch_get_screen` (or curl) per screen. Use `name: "projects/<id>/screens/<id>"`.
3. If the Stitch screen has a `downloadUrl`, fetch it with `curl -L <downloadUrl>` to get the full rendered HTML.
4. Save raw JSON response to `inputs/screens/<screenId>.raw.json` and the HTML to `inputs/screens/<screenId>.html`.

If the user already pre-fetched the JSON and dropped it into `inputs/screens/`, **skip this step**.

---

## Step 3 — Normalise Each Screen Into Our `StitchScreen` Shape

The Stitch MCP output is not guaranteed to match our `StitchScreen` interface. For each screen, manually translate it into:

```jsonc
{
  "id": "<screenId>",
  "name": "Home",
  "slug": "home",
  "sections": [
    { "type": "hero",       "props": { "title": "...", "subtitle": "...", "backgroundImage": "https://..." } },
    { "type": "services",   "props": { "title": "Our Menu", "services": [ ... ] } },
    ...
  ],
  "imageUrls": [ "https://...png", ... ]
}
```

The `type` field on each section MUST match a key in [`STITCH_BLOCK_MAP`](../../packages/lib/src/config/stitchBlockMap.ts) (e.g. `hero`, `services`, `testimonials`). If a section doesn't match anything, leave its `type` as the closest descriptive name — the parser will mark it unmapped and fall back to `rich_text`.

**Per-section backgrounds**: When the Stitch design shows distinct background colors for different sections (e.g. a warm off-white for "About", a muted gold for "Gallery"), capture each as `sectionStyle.backgroundColor` on the section's `props`. Example:

```jsonc
{ "type": "gallery", "props": {
  "title": "Curated Plates",
  "sectionStyle": { "backgroundColor": "#fff2e1" },
  ...
}}
```

The `sectionAttrs()` function in `packages/template/src/lib/styled-block.ts` reads this at render time and applies it to the section wrapper. Every block type supports this automatically — no custom code needed.

**Navbar items**: Look at the navbar in the Stitch screen. List each nav link. Decide for each:
- **Internal page link** (e.g. "Menu", "Our Story") → `kind: "page"` — will need a real `pages` row (created in Step 8b)
- **In-page anchor** (e.g. scrolls to a section on the same page) → `kind: "anchor"` with `sectionId`
- **External URL** → `kind: "external"` with `href`

Capture this list now; you'll need it for Steps 8b and 8c.

Save normalised output to `inputs/screens/<screenId>.normalised.json`.

---

## Step 4 — Parse + Extract Branding

Call the parser. Easiest is a tiny inline TS/JS snippet that imports from `@repo/lib/stitch`:

```bash
pnpm --filter @repo/lib exec tsx -e '
import { parseStitchScreen, collectImageUrls, extractBrandingFromDesignMd } from "@repo/lib/stitch";
import { readFileSync, writeFileSync } from "node:fs";

const screen = JSON.parse(readFileSync("documentation/stitch-provisioning/inputs/screens/<id>.normalised.json", "utf8"));
const designMd = readFileSync("documentation/stitch-provisioning/inputs/design.md", "utf8");

const parsed = parseStitchScreen(screen);
const branding = extractBrandingFromDesignMd(designMd);
const imageUrls = collectImageUrls(parsed);

writeFileSync("documentation/stitch-provisioning/inputs/screens/<id>.parsed.json",
  JSON.stringify({ parsed, branding, imageUrls }, null, 2));
console.log({ blocks: parsed.blocks.length, warnings: parsed.warnings.length, images: imageUrls.length, branding });
'
```

If `tsx` isn't installed, fall back to running the parser via a one-off file under `scripts/_tmp-parse.mjs`.

If `parsed.warnings.length > 0`:
- Read `parsed.warnings` and report them to the user
- For each unmapped type, follow [`ADD_NEW_BLOCK_TYPE.md`](ADD_NEW_BLOCK_TYPE.md)
- After adding the block(s), re-run this step

---

## Step 5 — Download Images as PNG

Build the input list (every URL from Step 4's `imageUrls`):

```bash
cat > /tmp/stitch-images.json <<'EOF'
[
  { "url": "https://...img1.png", "usageType": "hero",    "altText": "Bibi Kitchen hero" },
  { "url": "https://...img2.png", "usageType": "gallery", "altText": "Plated dish" }
]
EOF

node scripts/download-stitch-images.mjs <tenantId> /tmp/stitch-images.json /tmp/stitch-images.uploaded.json
```

Output: `/tmp/stitch-images.uploaded.json` containing `{ remoteUrl → { mediaId, storagePath, publicUrl } }`.

Always saves as PNG regardless of source format (per workflow convention).

> **⚠️ `aida/` vs `aida-public/` image URLs**: Stitch AI-generated images come in two CDN flavours:
> - `lh3.googleusercontent.com/aida-public/AB6AXu...` — **publicly accessible**, download works as expected
> - `lh3.googleusercontent.com/aida/ADBb0u...` — **requires Google auth session**, curl returns the Google login HTML page instead of the image
>
> If all images fail (output file is 2405-byte HTML), check whether the URLs use `aida/` instead of `aida-public/`. If so, **proceed without images** — leave all `imageUrl` fields as empty strings in the manifest and blocks. The blocks render gracefully without images. Notify the user to add images manually via the Puck editor after provisioning.

---

## Step 6 — Substitute Image URLs in Block Content

Walk through `parsed.blocks`. For each block with `imageRefs`:

```js
for (const ref of block.imageRefs ?? []) {
  const upload = uploadedMap[ref.remoteUrl];
  if (upload) block.content[ref.contentKey] = upload.publicUrl;
}
delete block.imageRefs; // clean up before writing manifest
```

This step ensures DB content references our local Supabase media (not the original Stitch URLs which expire).

For richer media wiring, you can additionally insert rows into `media_page_associations` after Step 7 — but for the first pass, embedding the signed URL into `content` is enough.

---

## Step 7 — Build the Provisioning Manifest

```jsonc
{
  "tenantId": 12,
  "pageSlug": "home",
  "pageTitle": "Home",
  "isHomepage": true,
  "branding": { "primary_color": "#6b0110", "accent_color": "#775a19", "bg_color": "#fff8f3", "font_family": "Manrope" },
  "blocks": [
    { "type": "hero",     "position": 0, "content": { "title": "...", "backgroundImage": "https://...signed.png" } },
    { "type": "services", "position": 1, "content": { ... } }
  ],
  "warnings": [ /* pass through from parser */ ]
}
```

Write to `documentation/stitch-provisioning/inputs/screens/<id>.manifest.json`.

---

## Step 8 — Provision Main Content Page

```bash
node scripts/provision-from-stitch.mjs documentation/stitch-provisioning/inputs/screens/<id>.manifest.json
```

This:
- Patches `tenants.branding` (merge, not overwrite)
- Finds or creates the `pages` row by `(tenant_id, slug)`
- **Deletes** existing sections/blocks for that page
- Inserts one `default` section + all blocks under it
- Hits `/api/revalidate?tag=pages` if `REVALIDATE_SECRET` is set

> **Note**: This script only writes the content page and `tenants.branding`. The Tailwind theme, site header, and navbar pages all need the additional steps below.

---

## Step 8a — Write site_settings.theme.palette

`tenants.branding` only sets legacy CSS variables (`--tenant-primary`, `--tenant-accent`, etc.) used by `<SiteNav>` brand colour. It does **NOT** set the Tailwind semantic tokens (`bg-primary`, `text-foreground`, `bg-card`, etc.).

Those tokens come from `site_settings.theme.palette` processed by `paletteToCssVars()` in `packages/lib/src/theme/palette.ts`. Without this step, the public site will render with default (often dark) Tailwind colours that don't match the design.

After provisioning, write the theme palette:

```js
await supabase
  .from('tenants')
  .update({
    site_settings: {
      theme: {
        palette: {
          primary:            "#6b0110",  // matches branding.primary_color
          primaryForeground:  "#ffffff",
          accent:             "#775a19",  // matches branding.accent_color
          accentForeground:   "#ffffff",
          background:         "#fff8f3",  // matches branding.bg_color
          foreground:         "#221a0e",
          muted:              "#f0e0cc",
        },
        mode: "light",   // "light" unless design explicitly calls for dark
        font: { family: "Manrope" }  // from design.md
      }
    }
  })
  .eq('id', tenantId);
```

**Palette keys** map directly to Tailwind CSS variable names: `primary` → `--primary`, `background` → `--background`, `foreground` → `--foreground`, `muted` → `--muted`, etc.

---

## Step 8b — Create Stub Pages for Navbar Items

For every navbar item that you identified as `kind: "page"` in Step 3, create a real `pages` row. These pages start empty (no blocks) — the user can fill them later via Puck editor or additional Stitch imports.

```js
async function findOrCreatePage(supabase, tenantId, { slug, title }) {
  const { data: existing } = await supabase
    .from('pages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .maybeSingle();
  if (existing) return existing.id;

  const { data } = await supabase
    .from('pages')
    .insert({
      tenant_id:   tenantId,
      slug,
      title,
      page_type:   'custom',
      page_config: {},
      is_published: true,
      is_homepage:  false,
    })
    .select('id')
    .single();
  return data.id;
}
```

Collect the resulting IDs:
```js
const menuId          = await findOrCreatePage(c, tenantId, { slug: 'menu',           title: 'Menu' });
const privateDiningId = await findOrCreatePage(c, tenantId, { slug: 'private-dining', title: 'Private Dining' });
const ourStoryId      = await findOrCreatePage(c, tenantId, { slug: 'our-story',      title: 'Our Story' });
```

You now have real DB IDs for Step 8c.

---

## Step 8c — Update the site_header Page

There is a separate `page_type: "site_header"` page per tenant. It is NOT a content page — it holds the `site_header` and `site_footer` blocks that render on every page of the tenant's site.

`provision-from-stitch.mjs` does **not** touch this page. You must update it manually.

### Find the site_header blocks

```js
const { data: headerPage } = await supabase
  .from('pages')
  .select('id')
  .eq('tenant_id', tenantId)
  .eq('page_type', 'site_header')
  .maybeSingle();

const { data: blocks } = await supabase
  .from('blocks')
  .select('id, type, content')
  .eq('tenant_id', tenantId)
  .in('type', ['site_header', 'site_footer']);
```

### NavPageRef shape

**CRITICAL**: NavPage entries MUST match the `NavPageRef` type defined in `packages/template/src/types/index.ts`:

```ts
type NavPageRef =
  | { kind: "page";     id: number;    title: string; href: string }   // real pages row
  | { kind: "anchor";   sectionId: string; title: string; href: string } // same-page scroll
  | { kind: "external"; title: string; href: string }                  // external URL only
```

- Use `kind: "page"` for internal site pages (requires real `pages.id` from Step 8b)
- Use `kind: "anchor"` only for in-page scroll targets
- Use `kind: "external"` only for genuinely external URLs (not for internal routes)

**NEVER** use `kind: "external"` with `href: "#anchor"` for navbar items that should be separate pages.

### Update each site_header block

```js
const navPages = [
  { kind: "page", id: menuId,          title: "Menu",           href: "/menu" },
  { kind: "page", id: privateDiningId, title: "Private Dining", href: "/private-dining" },
  { kind: "page", id: ourStoryId,      title: "Our Story",      href: "/our-story" },
];

for (const block of blocks.filter(b => b.type === 'site_header')) {
  await supabase.from('blocks').update({
    content: {
      ...block.content,
      logoText:   "BIBI",           // brand name from design
      navPages,
      ctaText:    "Reserve a Table",
      ctaLink:    "/booking",
    }
  }).eq('id', block.id);
}
```

Also update `site_footer` blocks with footer copy, links, and contact info from the design.

---

## Step 9 — Verify

- Visit `http://<tenant>.localhost:3000/<pageSlug>` (or whatever the user's local domain looks like)
- **Check colours**: Tailwind semantic tokens should match the palette (primary, background, foreground). If the site still shows dark/default colours, Step 8a was likely skipped or the `site_settings` update failed.
- **Check navbar**: Nav links should render and navigate to the correct pages (not 404). If blank, the `site_header` blocks may not have been updated (Step 8c).
- **Check section backgrounds**: If the design has different per-section backgrounds, they should be visible. If all sections look the same colour, `sectionStyle.backgroundColor` was not set in the block content.
- Check the Puck editor: `/admin/pages/<id>/edit` — confirm blocks loaded
- Spot-check the rendered page vs the Stitch design screenshot

---

## Step 10 — Report

Tell the user, briefly:
- Pages updated (slug + ID) — content page + stub nav pages
- Block count written to the content page
- Branding fields applied (both `tenants.branding` AND `site_settings.theme.palette`)
- site_header updated (navPages, logo, CTA)
- Any remaining TODOs (e.g. "3 stub pages created — fill them in via Puck editor or re-run provisioning with their screen IDs")
- Media uploaded count
- Any warnings (with suggested next step)

---

## Common Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `parsed.warnings.length > 0` | Stitch section type not in `STITCH_BLOCK_MAP` | [`ADD_NEW_BLOCK_TYPE.md`](ADD_NEW_BLOCK_TYPE.md) |
| Images render broken after a few hours | Signed URL expired (1h TTL) | Re-run Step 5 + 8, or write a route that refreshes via `media.url` storage path |
| Block renders but field empty | `contentMapping` in `STITCH_BLOCK_MAP` doesn't cover that field | Add the missing key, re-run Step 4 onwards |
| `permission denied` from Supabase | Service role key missing | Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` |
| Revalidate skipped | `REVALIDATE_SECRET` not set | Optional — tag-based caches will refresh on next request anyway |
