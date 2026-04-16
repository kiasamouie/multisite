# AI Provisioning System: Database-Driven Multi-Tenant Website Builder

## Purpose of This Document

This document is the canonical technical plan for how any tenant website on this platform can be built, styled, and configured entirely through database records — with an AI agent as the provisioning engine. It covers three tenant modes, the provisioning pipeline, the generic rendering contract, and the extensibility model for future features.

This document is designed to be handed back to an AI agent at any future point to resume, extend, or re-provision any part of the system.

---

## Core Principle

> **The codebase renders. The database decides what to render and how.**

No tenant-specific React components are ever written. Every visual difference between tenant websites — layout, color, typography, content, media, zones, pages, section order, feature availability — is expressed exclusively as database records. The generic renderer reads those records and produces the correct output for every tenant's unique design.

When an AI agent is given a reference (a Stitch MCP export, a URL, a screenshot, a description, an existing design system, or any other input) for a tenant website, the agent's job is to translate that reference into the correct database records — not to write new frontend code.

---

## The Three Rendering Modes (Tenant Types)

### Mode A: AI-Provisioned (Stitch or Any Reference)
The agent receives any reference and autonomously creates all DB records to produce a website that visually and structurally matches the reference using only the existing generic renderer.

- No tenant customization expected
- Feature flags default to locked (read-only admin)
- Provisioning is the only edit workflow
- Re-provisioning updates existing records idempotently

### Mode B: Template Tenant
A curated set of DB records representing a full website template (e.g., "Plumbing Business", "Music Artist", "Service Professional") is cloned and assigned to a tenant. Feature flags confer limited editing rights — predefined "allowed fields" exposed in the admin UI. The tenant customizes within the boundaries of the template.

- Template base is AI-provisioned once, then reused
- Tenant admin shows only allowed fields (phone, logo, hero image, primary color, bio, etc.)
- Layout structure and page count are locked
- Feature flags are the enforcement mechanism

### Mode C: Free/Blank Slate
A tenant starts from a blank state and builds using the full admin panel — zone builder, page builder, media upload, branding editor. Full feature flag access. This is the "Webflow-light" experience.

- All feature flags enabled
- Full zone builder and page management available
- Can optionally start from an AI-provisioned base and unlock editing

---

## The Database as the Contract

The entire system is driven by these tables. Every design decision a tenant has is stored in one of these structures.

### Core Tables

#### `tenants`
```sql
- id
- name
- domain
- slug
- branding: JSONB          ← design tokens (colors, fonts, spacing scale, logo)
- provisioning_mode: TEXT  ← "ai_locked" | "template" | "free"
- template_id: INTEGER     ← FK to tenant used as template base (nullable)
- created_at
- updated_at
```

**`branding` JSONB structure:**
```json
{
  "colors": {
    "primary": "#1a56db",
    "secondary": "#6b7280",
    "accent": "#f59e0b",
    "background": "#ffffff",
    "surface": "#f9fafb",
    "text": "#111827",
    "textMuted": "#6b7280"
  },
  "fonts": {
    "heading": "Inter",
    "body": "Inter",
    "mono": "JetBrains Mono"
  },
  "spacing": {
    "containerMaxWidth": "1280px",
    "sectionPaddingY": "64px",
    "sectionPaddingX": "24px"
  },
  "logo": {
    "media_id": 10,
    "url": "https://signed-url...",
    "altText": "ProPlumb Logo"
  },
  "favicon": {
    "media_id": 11,
    "url": "https://..."
  },
  "borderRadius": "8px",
  "shadowStyle": "soft"
}
```

#### `pages`
```sql
- id
- tenant_id
- title
- slug
- is_published
- is_homepage
- layout_config: JSONB   ← zone definitions, zone styling, responsive rules
- page_config: JSONB     ← page-level metadata (SEO, og tags, schema markup)
- position: INTEGER      ← nav order
- created_at
- updated_at
```

**`layout_config` JSONB structure:**
```json
{
  "zones": {
    "hero": {
      "position": 0,
      "block_type": "hero",
      "media_ids": [42, 43],
      "display_mode": "single",
      "content": {
        "headline": "Professional Plumbing Services",
        "subheadline": "Available 24/7 in your area",
        "ctaText": "Get a Free Quote",
        "ctaUrl": "/contact"
      },
      "styling": {
        "backgroundColor": "#1a56db",
        "textColor": "#ffffff",
        "padding": "80px 24px",
        "textAlign": "center",
        "gradient": "linear-gradient(135deg, #1a56db 0%, #1e3a8a 100%)"
      },
      "responsive": {
        "mobile": { "padding": "40px 16px", "display_mode": "single" },
        "tablet": { "padding": "60px 24px" },
        "desktop": { "padding": "80px 24px" }
      }
    },
    "services": {
      "position": 1,
      "block_type": "feature_grid",
      "content": { "columns": 3, "items": [...] },
      "styling": { ... }
    },
    "gallery": {
      "position": 2,
      "block_type": "page_media",
      "media_ids": [44, 45, 46, 47],
      "display_mode": "gallery",
      "styling": { ... }
    }
  },
  "nav": {
    "style": "transparent_overlay",
    "sticky": true,
    "showLogo": true,
    "links": ["home", "services", "gallery", "contact"]
  },
  "footer": {
    "style": "minimal",
    "showSocial": true,
    "showAddress": true
  }
}
```

#### `sections`
- Granular breakdown of a page's visual sections
- Each section has a `type`, `position`, and `layout_config` subset
- Used by the block renderer for non-zone layouts or backward compatibility

#### `blocks`
```sql
- id
- section_id
- type: TEXT             ← maps to BLOCK_REGISTRY key
- content: JSONB         ← block-type-specific config
- position: INTEGER
- feature_flag: TEXT     ← optional: only render if this flag is enabled
```

#### `media` + `media_page_associations`
Already covered in MEDIA_PAGE_ASSOCIATION.md. Media is always referenced by ID, never embedded as raw URLs in page content. Signed URLs are fetched at render time.

#### `feature_flags`
```sql
- tenant_id
- flag: TEXT
- value: BOOLEAN | TEXT | JSONB
```

Feature flags used by provisioning system:
```
can_edit_pages           ← add/remove/reorder pages
can_edit_layout          ← zone builder access
can_edit_branding        ← branding token editor
can_edit_media           ← upload new media / change media in zones
can_edit_content         ← change text content in zones/blocks
can_edit_nav             ← modify nav links and style
allowed_edit_fields      ← JSONB list of specific field paths a template tenant can edit
provisioning_mode        ← mirrors tenant.provisioning_mode for flag queries
template_id              ← which template this tenant is based on (if any)
```

---

## The Generic Block Registry (Rendering Contract)

The `BLOCK_REGISTRY` in `packages/template/src/blocks/registry.ts` is the authoritative list of all renderable block types. **All AI provisioning must map to types that exist in this registry.** If a reference design requires something the registry doesn't have, a new generic block type is added to the registry — not a tenant-specific component.

### Current Registry (Extend, Never Duplicate)
| Block Type | Purpose | Key Content Fields |
|------------|---------|-------------------|
| `hero` | Large header section with image + headline | headline, subheadline, ctaText, ctaUrl, media_id |
| `page_media` | Media display (single, gallery, carousel) | usage_type, display_mode, media_ids |
| `feature_grid` | Grid of feature/service items | columns, items[{icon, title, description}] |
| `rich_text` | Arbitrary HTML/markdown content | html, markdown |
| `contact_form` | Contact form with configurable fields | fields[], submitText, successMessage |
| `testimonials` | Customer testimonials | items[{quote, author, role, avatar_media_id}] |
| `pricing_table` | Pricing tiers | tiers[{name, price, features[], ctaText}] |
| `cta_banner` | Call-to-action banner bar | headline, ctaText, ctaUrl, backgroundColor |
| `team_grid` | Team members grid | items[{name, role, bio, media_id}] |
| `faq` | Accordion FAQ | items[{question, answer}] |
| `embed` | iframe or script embed | src, type, height |
| `nav` | Navigation (rendered at layout level) | driven from layout_config.nav |
| `footer` | Footer (rendered at layout level) | driven from layout_config.footer |

### How to Add a New Block Type
When a future feature or design requires a block type not in the registry:
1. Add the block type to `BLOCK_REGISTRY` with its React component
2. Define its `content` JSONB shape in the type definitions
3. Document it in this table
4. The AI provisioner can immediately reference the new type when building any tenant

**Rule**: One generic block type can serve any tenant. Never create `PlumberHeroBlock` — create `HeroBlock` with content that makes it look like a plumber website.

---

## The Provisioning Pipeline

### Input Sources (All Supported)
The AI provisioning system accepts any of the following inputs:

| Input Type | Examples | Agent Behavior |
|------------|---------|----------------|
| **Stitch MCP** | MCP export from stitch.ai | Parse components/tokens directly from MCP tool output |
| **URL Reference** | "Build me this site: [url]" | Agent fetches page structure, extracts design intent |
| **Screenshot/Image** | Attached image of a design | Agent interprets visual layout, maps to zones |
| **Description** | "Plumbing company, dark blue, modern" | Agent infers design from description + vertical |
| **Design System Doc** | Figma links, style guides | Agent extracts tokens and component inventory |
| **Existing Template** | "Clone the ProPlumb template for this tenant" | Agent copies template DB records to new tenant |
| **Combination** | "Like this URL but with these Stitch colors" | Agent merges inputs |

The input format is irrelevant. The output is always: **database records**.

### Provisioning Steps (Universal Pipeline)

Regardless of input type, the provisioner always executes these steps in order:

```
Step 1: PARSE INPUT
  - Extract: page list, zone/section structure, component inventory,
    design tokens (colors, fonts), image references, text content
  - Flag any components that don't map to existing block types

Step 2: MAP COMPONENTS TO BLOCK TYPES
  - For each design component, find the closest block type in BLOCK_REGISTRY
  - If no match: assign to "rich_text" or "embed" as fallback
  - Log unmapped components for future block type additions

Step 3: RESOLVE MEDIA
  - For each image in the design reference:
    a. Download image to Supabase Storage (if from external URL)
    b. Create media record with metadata
    c. Record the local media ID for use in zone config
  - For placeholder images: create media record with placeholder URL

Step 4: UPSERT TENANT BRANDING
  - Map design tokens to tenants.branding JSONB
  - Set primary/secondary/accent colors
  - Set font families
  - Set spacing scale
  - Create logo/favicon media records + reference them in branding

Step 5: UPSERT PAGES
  - For each page in the design:
    a. Create/update pages record (title, slug, position, is_published, is_homepage)
    b. Set page_config (SEO: title, description, og image)
  - Set one page as is_homepage: true

Step 6: BUILD LAYOUT CONFIG PER PAGE
  - For each page's sections:
    a. Map each section to a named zone key (hero, services, gallery, etc.)
    b. Set zone.block_type from step 2 mapping
    c. Set zone.media_ids from step 3 resolved IDs
    d. Set zone.content from extracted text/config
    e. Set zone.styling from design tokens + section-specific overrides
    f. Set zone.responsive rules (mobile/tablet/desktop)
    g. Set zone.position for render order
  - Write to pages.layout_config JSONB

Step 7: UPSERT SECTIONS + BLOCKS
  - For backward compatibility and the block renderer:
    a. Create section records for each page zone
    b. Create block records for each section
    c. Block content JSONB mirrors zone content from layout_config

Step 8: CREATE MEDIA_PAGE_ASSOCIATIONS
  - For each media_id referenced in a page's layout_config:
    - Create media_page_associations record
    - Set usage_type matching the zone name (hero, gallery, etc.)
    - Call ensurePageMediaBlock() for the page

Step 9: SET FEATURE FLAGS
  - Based on provisioning_mode:
    - ai_locked: all editing flags = false
    - template: set allowed_edit_fields list
    - free: all editing flags = true
  - Store mode in tenants.provisioning_mode

Step 10: REVALIDATE CACHE
  - Call revalidateTag("pages")
  - Call revalidateTag("tenants")

Step 11: VERIFY (optional but recommended)
  - Fetch rendered page via API and validate structure
  - Log any zones with missing media or unmapped block types
```

### Provisioning API Endpoints

#### `POST /api/admin/tenants/[id]/provision`
Triggers full provisioning pipeline for a tenant.
- Body: `{ mode: "ai_locked" | "template" | "free", source?: any, template_id?: number }`
- The `source` field is free-form — it can be a URL, a JSON structure, a description. The caller (AI agent) populates it based on what it parsed.
- The API endpoint delegates to the provisioner service in `packages/lib/src/provisioner/`

#### `POST /api/admin/tenants/[id]/provision/dry-run`
Returns what would be provisioned without writing to DB. Useful for validating AI output before committing.

#### `POST /api/admin/tenants/[id]/provision/from-template`
Clone an existing tenant's DB records to a new tenant. Fast path for template-based provisioning.

#### `GET /api/admin/tenants/[id]/provision/status`
Returns current provisioning status, mode, and a manifest of all provisioned records.

---

## The Stitch Block Map

`packages/lib/src/stitch/block-map.ts` is the authoritative translation layer between Stitch component names and platform block types.

### Example Mappings
```typescript
export const STITCH_BLOCK_MAP: Record<string, StitchBlockMapping> = {
  "HeroSection":        { blockType: "hero",          zone: "hero",      displayMode: "single" },
  "HeroCarousel":       { blockType: "hero",          zone: "hero",      displayMode: "carousel" },
  "ImageGallery":       { blockType: "page_media",    zone: "gallery",   displayMode: "gallery" },
  "FeaturedImage":      { blockType: "page_media",    zone: "featured",  displayMode: "single" },
  "ServicesGrid":       { blockType: "feature_grid",  zone: "services",  contentKey: "items" },
  "ServicesList":       { blockType: "feature_grid",  zone: "services",  contentKey: "items" },
  "ContactForm":        { blockType: "contact_form",  zone: "contact",   contentKey: "fields" },
  "Testimonials":       { blockType: "testimonials",  zone: "reviews",   contentKey: "items" },
  "TeamSection":        { blockType: "team_grid",     zone: "team",      contentKey: "items" },
  "PricingSection":     { blockType: "pricing_table", zone: "pricing",   contentKey: "tiers" },
  "FAQ":                { blockType: "faq",           zone: "faq",       contentKey: "items" },
  "RichText":           { blockType: "rich_text",     zone: "content",   contentKey: "html" },
  "CTABanner":          { blockType: "cta_banner",    zone: "cta",       contentKey: "cta" },
  "EmbedBlock":         { blockType: "embed",         zone: "embed",     contentKey: "src" },
  "LogoHeader":         { blockType: "nav",           zone: "nav" },
  "Footer":             { blockType: "footer",        zone: "footer" },
};
```

This map is extended any time Stitch introduces a new component type. Unmapped components fall back to `rich_text` with a console warning so the agent knows to update the map.

---

## The Rendering Pipeline (How DB Records Become a Website)

```
Request: GET tenant.com/services
               ↓
middleware.ts  → resolves tenant by domain/subdomain
               ↓
[slug]/page.tsx → getCachedPage(slug, tenantId)
               ↓
PageRenderer   → reads page.layout_config.zones
               ↓
 For each zone (ordered by position):
   ↓
ZoneRenderer   → reads zone.block_type
               ↓
BlockRenderer  → looks up BLOCK_REGISTRY[block_type]
               ↓
Block Component → renders with zone.content + zone.styling
               ↓
 If zone has media_ids:
   ↓
PageMediaContext → reads media_page_associations for page
               ↓
PageMediaBlock  → renders media filtered by usage_type = zone name
               ↓
CSS Variables  → injected from tenants.branding at layout.tsx level
               ↓
Response: Fully rendered page unique to this tenant
```

### CSS Variable Injection (Branding System)

At `apps/web/src/app/[slug]/layout.tsx` (or the root layout for tenant routes), the branding JSONB is read once and injected as CSS custom properties:

```typescript
// Generated from tenants.branding at request time
const cssVars = {
  "--color-primary": branding.colors.primary,
  "--color-secondary": branding.colors.secondary,
  "--font-heading": branding.fonts.heading,
  "--spacing-section-y": branding.spacing.sectionPaddingY,
  // ... etc
};
```

All block components use only CSS variables for colors and typography — never hardcoded values. This means changing one tenant's `branding.colors.primary` instantly changes every button, heading, and accent on every page of that tenant's site.

---

## The Admin Panel (Mode-Aware UI)

The admin panel for a tenant adapts entirely to its `provisioning_mode` and feature flags.

### How It Works

The `useTenantAdmin()` hook (already exists) provides both `tenantId` and the current feature flags. Any admin component checks flags before rendering edit controls.

The `Resource` component (`apps/web/src/components/admin/Resource/index.tsx`) accepts a `permissionsConfig` prop that controls which actions (create, edit, delete, sort) are shown based on flags.

A new `useTenantPermissions()` hook reads the feature flag set and returns derived capabilities:
```typescript
interface TenantPermissions {
  canEditPages: boolean;
  canEditLayout: boolean;
  canEditBranding: boolean;
  canEditMedia: boolean;
  canEditContent: boolean;
  allowedEditFields: string[];     // Specific field paths for template mode
  provisioningMode: string;
}
```

### Admin UI Per Mode

**Mode A (ai_locked)**:
```
Pages     → read-only list, no edit/create/delete
Media     → read-only gallery, no upload
Branding  → read-only view of colors/fonts
Layout    → hidden
Settings  → limited (domain, contact info only if flag allows)
Dashboard → shows site preview link, provisioning status
```

**Mode B (template)**:
```
Pages     → read-only list, click to open "Allowed Fields" editor
Media     → upload enabled for zones in allowed_edit_fields only
Branding  → shows only: primary color picker + logo upload (if flagged)
Layout    → hidden
Settings  → contact info, social links, business hours
Dashboard → shows what the tenant can and cannot change
```

**Mode C (free)**:
```
Pages     → full CRUD, reorder, slug editing
Media     → full upload + association + zone assignment
Branding  → full design token editor
Layout    → full zone builder (add/remove/reorder/style zones)
Settings  → all settings
Dashboard → analytics, provisioning tools, template export
```

### Template Mode "Allowed Fields" Editor

For Mode B tenants, clicking into a page shows a form with only the allowed fields from the template. The allowed fields are a list of JSONB paths stored in the `allowed_edit_fields` feature flag:

```json
[
  "layout_config.zones.hero.content.headline",
  "layout_config.zones.hero.media_ids",
  "layout_config.zones.contact.content.phone",
  "layout_config.zones.contact.content.email",
  "layout_config.zones.contact.content.address",
  "branding.colors.primary",
  "branding.logo"
]
```

The admin UI reads this list and renders only those specific input controls — dynamically, driven entirely from the feature flag value.

---

## Zone Builder (Free Mode)

The zone builder is the full customization tool for Mode C tenants. It is built as a structured panel interface (not drag-drop initially), upgradeable to drag-drop in the future.

### Components

**`PageLayoutBuilder`** (`apps/web/src/components/admin/pages/PageLayoutBuilder.tsx`)
- Lists all zones on the current page
- Ordered list with drag-to-reorder (position field)
- "Add Zone" button with zone type dropdown
- Each zone row has: zone name, block type badge, media count, edit button, delete button

**`ZoneEditor`** (`apps/web/src/components/admin/pages/ZoneEditor.tsx`)
- Modal/panel for editing one zone's full configuration
- Tabs: Content | Media | Styling | Responsive
- Content tab: renders correct field inputs based on block_type (dynamic)
- Media tab: MediaSelector showing assigned media, drag-to-reorder, add/remove
- Styling tab: StylesPanel (below)
- Responsive tab: per-breakpoint overrides for padding, display_mode, visibility

**`StylesPanel`** (`apps/web/src/components/admin/pages/StylesPanel.tsx`)
- Color fields: background, text, border (uses CSS hex inputs + color preview)
- Spacing fields: padding (T/R/B/L or shorthand)
- Typography: text size, alignment, weight
- Effects: border radius, shadow, gradient toggle
- Uses CSS variable references where possible (e.g., "Use Primary Color" checkbox)

**`BrandingEditor`** (`apps/web/src/components/admin/branding/BrandingEditor.tsx`)
- Full design token editor for `tenants.branding`
- Color swatches for all 7 color roles
- Font pickers (from Google Fonts or a curated list)
- Spacing scale controls
- Logo/favicon upload
- Live preview panel showing how changes affect the site

---

## Template System

### What Is a Template

A template is a tenant record in the database whose `provisioning_mode` is `"template_source"` and whose pages, layout_config, sections, blocks, and branding represent a fully designed website for a specific industry vertical.

Built-in templates are created by AI provisioning (from a reference design). They live in the DB alongside regular tenants but are flagged differently.

### Template Registry (Feature Flag: `is_template_source = true`)

Templates are queryable via:
```sql
SELECT * FROM tenants WHERE id IN (
  SELECT tenant_id FROM feature_flags 
  WHERE flag = 'is_template_source' AND value = 'true'
);
```

### Cloning a Template to a New Tenant

Provisioning from a template is always idempotent. The flow:

1. Fetch source tenant's pages, layout_config, sections, blocks, media associations, branding
2. Duplicate all records with `tenant_id = new_tenant_id`
3. Re-upload or re-reference any media (Supabase Storage paths are tenant-scoped)
4. Set `tenants.template_id = source_tenant_id` on the new tenant
5. Set feature flags based on desired mode (ai_locked, template, free)
6. Revalidate cache

### Future: Template Marketplace

Templates can be exported as a portable JSON manifest (not DB records directly, but a serialized representation). This manifest can be imported to provision any tenant on any future deployment of the platform.

---

## Extensibility Rules

These rules ensure the system remains generic and never accumulates tenant-specific code.

### Rule 1: New Features Go in BLOCK_REGISTRY
Any new visual capability is added as a new block type in `BLOCK_REGISTRY`. It is immediately available to all tenants via their `layout_config`.

### Rule 2: New Design Capabilities Go in `branding` JSONB
Any new design token (animation speed, border style, icon set, etc.) is added to the `branding` JSONB schema. All tenants can use it; the renderer reads it via CSS variables.

### Rule 3: New Tenant Capabilities Go in Feature Flags
Any new admin capability (e.g., "can export site", "can enable blog", "can add custom domain") is a feature flag. No capability is ever hardcoded per tenant.

### Rule 4: Provisioning Output Is Always DB Records
Any future input source (voice description, video walkthrough, design tool integration) still produces the same output: rows in `tenants`, `pages`, `sections`, `blocks`, `media`, `feature_flags`. The provisioning pipeline steps are always the same.

### Rule 5: No Tenant Name in Code
No component, route, file, or function is ever named after a tenant (no `proplumb-hero.tsx`, no `kaimusic-layout.ts`). All variation is expressed in DB records.

### Rule 6: Block Components Are Stateless Config Consumers
Block components receive their config from `block.content` + zone styling. They never fetch their own data. They never hardcode values. They are pure functions of their inputs.

---

## AI Agent Workflow (How to Use This System)

When an AI agent is handed a provisioning task, this is the exact workflow:

### Step 1: Understand the Input
- If Stitch MCP: invoke MCP tool to fetch component tree, design tokens, images
- If URL: fetch page HTML/structure, extract visual hierarchy and content
- If image/screenshot: interpret layout, identify zones, extract color scheme
- If description: infer industry vertical, use template as base, override with specifics

### Step 2: Read the Current State
```
- Check if tenant exists: GET /api/admin/tenants/[id]
- Check current provisioning_mode
- Check existing pages/layout_config (if re-provisioning)
- Run dry-run: POST /api/admin/tenants/[id]/provision/dry-run
```

### Step 3: Resolve Media First
- All images from the reference must be stored in Supabase Storage before writing page records
- Create media records, note the returned IDs for use in layout_config

### Step 4: Build the Provisioning Manifest
The AI constructs a JSON manifest representing all records to create/update:
```json
{
  "tenant_id": 5,
  "mode": "ai_locked",
  "branding": { ... },
  "pages": [
    {
      "slug": "home",
      "title": "Home",
      "is_homepage": true,
      "layout_config": {
        "zones": { "hero": { ... }, "services": { ... } }
      }
    }
  ],
  "feature_flags": { ... }
}
```

### Step 5: Execute Provisioning
- POST manifest to `/api/admin/tenants/[id]/provision`
- Monitor response for errors or unmapped block types
- Verify output: GET the public-facing pages and confirm structure

### Step 6: Report Back
- List all pages provisioned
- List all media uploaded
- Flag any zones that fell back to `rich_text` (need block type additions)
- Confirm provisioning_mode applied

---

## File Structure (Future State)

```
packages/lib/src/
  provisioner/
    index.ts              ← main provisioner entry point
    steps/
      parse-media.ts      ← step 3: resolve + upload media
      map-branding.ts     ← step 4: extract design tokens
      build-pages.ts      ← step 5 + 6: page records + layout_config
      build-blocks.ts     ← step 7: section + block records
      set-flags.ts        ← step 9: feature flags
    types.ts              ← ProvisioningManifest type definitions
  stitch/
    block-map.ts          ← Stitch component → block type map
    types.ts              ← Stitch export TypeScript types
    parser.ts             ← Stitch-specific parsing (if Stitch has structured output)

apps/web/src/app/api/admin/tenants/[id]/
  provision/route.ts      ← POST: run provisioner
  provision/dry-run/route.ts
  provision/status/route.ts
  provision/from-template/route.ts

apps/web/src/app/admin/
  pages/[id]/layout/page.tsx        ← zone builder UI
  branding/page.tsx                 ← branding editor UI

apps/web/src/components/admin/
  pages/
    PageLayoutBuilder.tsx
    ZoneEditor.tsx
    StylesPanel.tsx
    ResponsivePreviewTabs.tsx
  branding/
    BrandingEditor.tsx
    ColorTokenField.tsx
    FontPicker.tsx

packages/template/src/
  renderer/
    PageRenderer.tsx      ← updated to read layout_config.zones
    ZoneRenderer.tsx      ← NEW: renders one zone from layout_config
  components/zones/
    BaseZone.tsx          ← common zone wrapper (styling, responsive)
    HeroZone.tsx          ← renders hero block_type zones
    MediaZone.tsx         ← renders page_media zones
    ContentZone.tsx       ← renders rich_text zones
    FormZone.tsx          ← renders contact_form zones
    (etc. one per block type that needs layout-level wrapping)

supabase/migrations/
  0024_add_layout_config.sql        ← layout_config on pages
  0025_add_provisioning_mode.sql    ← provisioning_mode + template_id on tenants
  0026_add_branding_to_tenants.sql  ← branding JSONB on tenants (if not already present)
```

---

## What This System Enables

| Capability | Powered By |
|-----------|-----------|
| Plumber website provisioned from Stitch/URL in minutes | Provisioning pipeline → DB records |
| Music artist website completely different from plumber | Same renderer, different layout_config + branding |
| Tenant changes their hero photo | Media upload → media_page_associations → revalidateTag |
| Tenant changes their primary color | BrandingEditor → tenants.branding → CSS variables |
| Tenant reorders page sections | ZoneEditor → layout_config.zones.position |
| New block type added, available to all tenants | BLOCK_REGISTRY + block-map.ts update |
| 50 plumbing companies all from same template | provision/from-template × 50 |
| New feature (blog, booking, etc.) rolled out | Feature flag + new block type |
| Re-provision an AI tenant with updated design | POST /provision → idempotent update |
| Super admin exports tenant as reusable template | is_template_source flag + manifest export |

---

## Non-Goals (Scope Boundaries)

- **No** per-tenant React component files ever
- **No** hardcoded tenant names, slugs, or IDs in source code
- **No** per-tenant CSS files. All styling is via CSS variables + inline zone styling from DB
- **No** page builder that writes raw HTML/CSS to disk
- **No** versioning of provisioning history (v1 scope) — provisioning always overwrites to latest

---

## Open Questions (To Resolve Before Implementation)

1. **Stitch MCP output format**: Is it a structured JSON schema we can type, or free-form? This determines how much the parser needs to handle variation.
2. **Media hosting**: When provisioning from an external URL reference, does the agent re-host all referenced images in Supabase Storage? (Recommended: yes, for independence from external URLs.)
3. **Template locking granularity**: For Mode B, is the allowed_edit_fields list set per-template or per-tenant? (Recommended: per-template as default, overrideable per-tenant.)
4. **Zone naming convention**: Standardize the canonical zone key names (`hero`, `services`, `gallery`, `cta`, `about`, `team`, `footer`, `nav`, etc.) and document them here before provisioner is built.
5. **Responsive breakpoints**: Standardize breakpoints used in zone.responsive (mobile: 0–767px, tablet: 768–1023px, desktop: 1024px+).
6. **Provisioning from voice/description**: What's the minimum viable description the AI needs to confidently pick a template base? (Industry vertical + color preference + page count?)
