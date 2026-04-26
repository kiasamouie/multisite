# Worked Example: Bibi Kitchen Homepage

This is a complete walkthrough of the real provisioning run against the Bibi Persian Kitchen tenant. It reflects what actually happened, including the pitfalls encountered and how they were resolved.

---

## The Inputs

User pastes the following into [`inputs/request.md`](inputs/request.md):

```
- Tenant: bibikitchen
- Page: home (isHomepage: true)
- Stitch project: 11681557974546401399 (Bibi Kitchen Modern Redesign)
- Screen: 6039b8cf526d43fbbd2000d457ccccf4 (Homepage v2)
- design.md: see inputs/design.md
- Always download images as PNG.
```

`request.md` listed `Numeric ID: 12` — **this was wrong**. The DB lookup in Step 1 returned `id = 22`. Always query; never trust the ID in the request file.

---

## Step 1 — Resolve Tenant ID

```bash
node -e "
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((a, l) => {
  const [k, ...v] = l.split('='); if (k && v.length) a[k.trim()] = v.join('=').trim().replace(/^[\"']|[\"'\$]/g, ''); return a;
}, {});
const { createClient } = require('@supabase/supabase-js');
const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data } = await c.from('tenants').select('id,name,slug,domain').or('slug.eq.bibikitchen,domain.eq.bibikitchen').maybeSingle();
  console.log(data);
})();
"
// → { id: 22, name: 'Bibi Persian Kitchen', slug: null, domain: 'bibikitchen.localhost' }
```

**Result**: `tenantId = 22`. The request.md said `12` — ignored.

---

## Step 2 — Fetch Stitch Screen

The project ID `11681557974546401399` has 20 decimal digits — far above 2^53 (15 digits). The VS Code MCP wrapper would coerce this to a JS `number` and lose precision. The API would return a "project not found" error.

**Fix**: bypass the wrapper and use raw curl with the project ID as a JSON string:

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
  }' | jq .
```

The response included a `downloadUrl`. Fetched the full HTML:

```bash
curl -L "<downloadUrl>" > documentation/stitch-provisioning/inputs/screens/6039b8cf.html
```

Saved raw JSON to `inputs/screens/6039b8cf.raw.json` and envelope to `6039b8cf.envelope.json`.

---

## Step 3 — Normalise the Screen

Reading the Stitch HTML, the screen had 4 main sections plus a navbar and footer:

```
Navbar: BIBI logo | Menu | Private Dining | Our Story | [Reserve a Table]
Hero: full-bleed image, "Modern Persian Kitchen" headline, subtitle, Reserve CTA
About: left text + right image, "Curated from Heritage" (bg: #fff8f3)
Gallery: 3-up image grid, "Curated Plates" (bg: #fff2e1 — warm amber lift)
Booking: booking form area
Footer: address + social links
```

**Navbar items identified**:
- "Menu" → `kind: "page"` (internal page, needs a real `pages` row)
- "Private Dining" → `kind: "page"` (internal page)
- "Our Story" → `kind: "page"` (internal page)
- "Reserve a Table" → CTA button on the `site_header` block (`ctaText` / `ctaLink`)

Per-section background colours extracted:
- Hero: full-bleed image (no explicit bg)
- About: `#fff8f3` (off-white canvas)
- Gallery: `#fff2e1` (warm amber, distinct from About)
- Booking: no explicit bg

---

## Steps 4–7 — Parse, Download Images, Build Manifest

6 images downloaded as PNG → media IDs 48–53 in bucket `media/22/`.

Blocks in manifest:
```jsonc
[
  { "type": "hero",          "position": 0, "content": { "title": "...", "backgroundImage": "https://...hero.png" } },
  { "type": "about",         "position": 1, "content": { "title": "Curated from Heritage", ...,
      "sectionStyle": { "backgroundColor": "#fff8f3" } } },
  { "type": "gallery",       "position": 2, "content": { "title": "Curated Plates", ...,
      "sectionStyle": { "backgroundColor": "#fff2e1" } } },
  { "type": "booking_block", "position": 3, "content": { ... } }
]
```

---

## Step 8 — Provision Main Content Page

```bash
node scripts/provision-from-stitch.mjs documentation/stitch-provisioning/inputs/screens/6039b8cf.manifest.json
```

Output:
```
🛠  Provisioning tenant 22 / page "home" with 4 block(s)
🎨 Branding patched (primary_color, accent_color, bg_color, font_family)
📄 Page id = 49
✅ Wrote 4 block(s) under one default section (id=187)
🔄 revalidated tag: pages
🎉 Provisioning complete.
```

---

## Step 8a — Write site_settings.theme.palette

After provisioning, the public site colours were still wrong — the Tailwind utilities (`bg-primary`, `text-foreground`, etc.) were rendering the default dark palette. This is because `provision-from-stitch.mjs` only writes to `tenants.branding` which sets `--tenant-primary` for `<SiteNav>`, but Tailwind tokens come from `paletteToCssVars(site_settings.theme.palette)`.

Written via a one-off script (`scripts/_apply-bibi-theme.mjs`):

```js
await supabase.from('tenants').update({
  site_settings: {
    theme: {
      palette: {
        primary:           "#6b0110",
        primaryForeground: "#ffffff",
        accent:            "#775a19",
        accentForeground:  "#ffffff",
        background:        "#fff8f3",
        foreground:        "#221a0e",
        muted:             "#f0e0cc",
      },
      mode: "light",
      font: { family: "Manrope" }
    }
  }
}).eq('id', 22);
```

After this, all Tailwind semantic tokens resolved correctly across the public site.

---

## Step 8b — Create Stub Pages for Navbar Items

The navbar showed "Menu", "Private Dining", "Our Story" as internal navigation. These needed real `pages` rows — not anchor hrefs, not external links.

```js
// Created pages:
// id=51  slug=menu             title=Menu
// id=52  slug=private-dining   title=Private Dining
// id=53  slug=our-story        title=Our Story
```

Script: `scripts/_create-bibi-nav-pages.mjs`.

---

## Step 8c — Update the site_header Page

Tenant 22 had a `page_type: "site_header"` page (id=50) containing site_header blocks (ids 487, 488) and site_footer blocks (ids 489, 490).

Updated all `site_header` blocks with:
```js
{
  logoText:  "BIBI",
  navPages: [
    { kind: "page", id: 51, title: "Menu",           href: "/menu" },
    { kind: "page", id: 52, title: "Private Dining", href: "/private-dining" },
    { kind: "page", id: 53, title: "Our Story",      href: "/our-story" },
  ],
  ctaText: "Reserve a Table",
  ctaLink: "/booking",
}
```

**Key lesson**: The first attempt used `kind: "external"` with `href: "#menu"` anchor links. This was wrong — those are in-page scroll anchors, not internal page links. The correct discriminator for internal site pages is `kind: "page"` with the real `pages.id`.

Updated `site_footer` blocks with brand address, hours, and social links.

---

## Step 9 — Verify

Visit `http://bibikitchen.localhost:3000/`:
- ✅ Pomegranate primary colour on nav/CTA
- ✅ Off-white (#fff8f3) background across the page
- ✅ About section background (#fff8f3) and Gallery background (#fff2e1) visually distinct
- ✅ Navbar: BIBI logo | Menu | Private Dining | Our Story | Reserve a Table
- ✅ Navbar links navigate to /menu, /private-dining, /our-story (pages 51–53)
- ✅ Public site uses light theme regardless of admin dark theme state

---

## Final Pages State for Tenant 22

| ID | Slug | Title | Type |
|---|---|---|---|
| 49 | `home` | Home | template (homepage) |
| 50 | `__site_header__` | Header & Footer | site_header |
| 51 | `menu` | Menu | custom (stub) |
| 52 | `private-dining` | Private Dining | custom (stub) |
| 53 | `our-story` | Our Story | custom (stub) |

Pages 51–53 are empty stubs. They can be filled with content via additional Stitch imports (new screens) or manual Puck editing.

---

## Pitfalls Summary

| Pitfall | What Happened | Fix |
|---|---|---|
| Wrong tenant ID in request.md | request.md said `12`, actual was `22` | Always query by slug/domain first |
| Stitch MCP precision error | Project ID > 2^53 lost precision in IDE MCP wrapper | Use raw curl with string ID |
| Public site dark theme | `next-themes` dark class persisting from /admin to public routes | Added pre-paint script in `layout.tsx` to strip dark class on public routes |
| Tailwind tokens not updating | Only wrote `tenants.branding`, not `site_settings.theme.palette` | Must write palette to `site_settings.theme` after provisioning |
| Navbar not routing correctly | Used `kind:"external"` with `#anchor` hrefs | Must use `kind:"page"` with real `pages.id` for internal pages |
| No real pages for nav links | Did not create `pages` rows for nav items | Create stub pages first, then reference by id in navPages |
