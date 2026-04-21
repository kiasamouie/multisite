# Config-Driven Pages Architecture

## Overview

This system has evolved from static, hard-coded React templates to a **fully config-driven architecture** where all page content is stored in the database as **sections** containing **blocks**. Pages are rendered dynamically at request time from database configuration, enabling flexible content management through both visual editor and programmatic APIs.

---

## Core Concepts

### Pages
- Root container for a tenant's website content
- Properties: `id`, `tenant_id`, `title`, `slug`, `is_homepage`, `feature_key` (plan gating)
- Contains ordered **sections**
- Can be rendered by visiting `/{slug}` on tenant domain or homepage at `/`

### Sections
- Containers within a page that organize related blocks
- Properties: `id`, `page_id`, `position` (order)
- Contain ordered **blocks**
- Rendered sequentially via `SectionRenderer`

### Blocks
- Atomic content units (hero, text, images, forms, etc.)
- Properties: `id`, `section_id`, `type` (registry key), `props` (JSON), `position` (order)
- 27 available block types defined in `packages/template/src/blocks/registry.ts`
- Rendered via `BlockRenderer` → `BLOCK_REGISTRY.get(type)(props)`

---

## Database Schema

```sql
-- pages table
CREATE TABLE pages (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_homepage BOOLEAN DEFAULT false,
  feature_key TEXT, -- plan-gated feature (e.g., "services_page")
  page_type TEXT,
  page_config JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- sections table
CREATE TABLE sections (
  id UUID PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- blocks table
CREATE TABLE blocks (
  id UUID PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- registry key: "hero_block", "text_block", etc.
  props JSONB NOT NULL, -- block-specific configuration
  position INTEGER NOT NULL,
  content JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## Rendering Pipeline

```
Request to /{slug} or /
    ↓
getCachedPage(tenant_id, slug) [plain async, fresh DB query]
    ↓
PageRenderer({page})
    ↓
map(section) → SectionRenderer({section})
    ↓
map(block) → BlockRenderer({block})
    ↓
BLOCK_REGISTRY.get(block.type)(block.props)
    ↓
React Component rendered
```

**Key Points:**
- `getCachedPage` and `getCachedHomePage` are plain async functions (no caching)
- Pages are queried fresh on every request
- Blocks are rendered client-side in React
- Content updates trigger `revalidateTag("pages", "max")` to clear Next.js data cache

---

## Two Paths to Content Management

### 1. Visual Editor (Puck)
**For non-technical users and administrators**

- Access: `/admin/pages/[id]/edit`
- Plan-gated: only accessible to members with admin+ role in their plan
- Super admins can edit any tenant's pages
- Drag-and-drop UI to add, remove, reorder, and configure blocks
- Real-time publish to database via `/api/admin/pages/[id]/puck`
- After publish: `window.location.reload()` forces full page remount so Puck re-initialises with fresh DB data

**Flow:**
```
Admin clicks "Edit in Puck"
    ↓
Load page → fetch sections+blocks → convert to Puck format (dbToPuck)
    ↓
Render Puck Editor with all 27 block types available
    ↓
User edits (drag, add, configure, remove blocks)
    ↓
Click "Publish"
    ↓
POST to /api/admin/pages/[id]/puck with updated Puck data
    ↓
Convert Puck format to DB format (puckToDb)
    ↓
Delete old sections+blocks, insert new ones
    ↓
revalidateTag("pages", "max")
    ↓
window.location.reload() → page fully remounts with fresh DB data
    ↓
User sees updated editor or navigates to tenant page to verify
```

### 2. Programmatic API (MCP / Custom Scripts)
**For automation, bulk operations, and external integrations**

#### Provision a Tenant with Templates
```typescript
// packages/lib/src/tenant/provisioning.ts
await provisionTenant(adminClient, tenantId, planId);
```
- Creates 4 starter pages with full content
- Inserts sections and blocks directly from `pageTemplates.ts`
- Runs on tenant creation or plan upgrade

#### Sync Plan / Add Pages
```typescript
await syncTenantPlan(adminClient, tenantId, newPlanId);
```
- Adds new pages for new plan features (e.g., upgrading to Growth adds portfolio page)
- Re-runs provisioning helpers
- Can be called via `/api/admin/tenants/[id]/sync-plan` endpoint

#### Direct Database Manipulation (MCP)
```typescript
// Insert a page
const { data: pages } = await adminClient
  .from("pages")
  .insert({
    tenant_id: tenantId,
    title: "Services",
    slug: "services",
    is_homepage: false,
    feature_key: "services_page"
  })
  .select();

// Insert sections and blocks
await insertSectionsAndBlocks(adminClient, pageId, [
  {
    blocks: [
      {
        type: "hero_block",
        props: { title: "Our Services", subtitle: "What we offer" }
      }
    ]
  }
]);
```

#### Adapters for Format Conversion
```typescript
// packages/lib/src/lib/puck/adapter.ts

// Convert database format to Puck editor format
const puckData = dbToPuck(sections);
// Result: { content: [{ type, props: { id, ...fields } }], root: {} }

// Convert Puck format back to database format
const dbSections = puckToDb(puckData);
// Result: [{ blocks: [{ type, props, position }, ...] }]
```

---

## Template System

### Provisioning Templates
When a tenant is created or plan is upgraded, they receive pre-built pages with realistic content.

**File:** `packages/lib/src/config/pageTemplates.ts`

**Structure:**
```typescript
export const PAGE_TEMPLATES: Record<PlanType, PageTemplate[]> = {
  starter: [
    {
      title: "Home",
      slug: "home",
      isHomepage: true,
      sections: [
        {
          blocks: [
            { type: "hero_block", props: { ... } },
            { type: "text_block", props: { ... } },
            { type: "cta_block", props: { ... } }
          ]
        }
      ]
    },
    // ... 3 more pages (about, contact, blog)
  ],
  growth: [...], // 4 pages + portfolio, team
  pro: [...]     // 4 pages + events, testimonials
};
```

**12 Total Pages:**
- 4 Starter tier: Home, About, Contact, Blog
- 4 Growth tier: Services, Portfolio, Team, Resource Hub
- 4 Pro tier: Events, Testimonials, Case Studies, Gallery

Each template includes:
- Full, realistic block configuration
- Multiple sections with varied block types
- Plan-appropriate feature levels (hero, CTA, forms, etc.)

---

## Plan-Gated Features

**File:** `packages/lib/src/stripe/plans.ts`

Feature keys in page `feature_key` field gate access:

```typescript
PLANS = {
  starter: {
    features: {
      // Pages
      home_page: true,
      about_page: true,
      contact_page: true,
      blog_page: true,
      
      // NOT available
      services_page: false,
      portfolio_page: false,
      ...
    }
  },
  growth: {
    features: {
      // All starter + new
      services_page: true,
      portfolio_page: true,
      team_page: true,
      ...
    }
  },
  pro: {
    features: {
      // All growth + new
      events_page: true,
      testimonials_page: true,
      ...
    }
  }
};
```

**Runtime Access Check:**
- Tenant visits `/services` → fetch page → check `feature_key` against `getCachedFlags(tenantId)`
- If feature disabled → 404 or redirect
- Puck editor button only visible in admin if `plan` allows editing (from `AdminContext`)

---

## Caching Strategy

### What's Cached?
- **Tenant info** (`getCachedTenant`) → tags: `["tenants"]`
- **Flags** (`getCachedFlags`) → tags: `["flags"]`
- **Navigation pages** (`getCachedNavPages`) → tags: `["pages"]`

### What's NOT Cached (Always Fresh)?
- **Page content** (`getCachedPage`, `getCachedHomePage`) → plain async functions
- Every request queries the full sections+blocks from DB

### Why?
Ensures that after Puck publish, the page immediately shows updated content on the tenant site without stale cache.

### Cache Invalidation
```typescript
// After successful Puck publish
revalidateTag("pages", "max");
```
- Clears `getCachedNavPages` and other tags
- Fresh page query on next request
- Then: `window.location.reload()` in Puck editor for immediate visual feedback

---

## Block Registry

**Location:** `packages/template/src/blocks/registry.ts`

27 block types organized into 5 categories:

### Hero Blocks
- `hero_block` — Banner with title, subtitle, CTA
- `hero_with_image_block` — Hero + background image

### Content Blocks
- `text_block` — Rich text paragraph
- `heading_block` — Styled heading
- `image_block` — Standalone image
- `image_grid_block` — Multi-image grid
- `video_block` — Embedded video (YouTube, Vimeo)
- `quote_block` — Testimonial/quote with attribution

### Business Blocks
- `pricing_table_block` — Plan comparison
- `faq_block` — Collapsible FAQ items
- `contact_form_block` — Form with fields
- `team_block` — Team member cards
- `services_block` — Service/feature cards
- `portfolio_block` — Project showcase

### Social Blocks
- `testimonials_block` — Social proof reviews
- `social_links_block` — Social media icons
- `newsletter_block` — Email signup

### Info Blocks
- `address_block` — Location/contact info
- `featured_posts_block` — Blog post cards
- `events_block` — Event listings
- `calendar_block` — Event calendar
- `gallery_block` — Image slideshow
- `accordion_block` — Expandable sections
- `tabs_block` — Tabbed content
- `banner_block` — Alert/notification banner
- `button_block` — CTA button
- `divider_block` — Visual separator
- `spacer_block` — Whitespace control

---

## Key Files & Locations

| File | Purpose |
|------|---------|
| `apps/web/src/lib/cache.ts` | Page caching (plain async) |
| `apps/web/src/app/api/admin/pages/[id]/puck/route.ts` | Puck save endpoint |
| `apps/web/src/app/admin/pages/[id]/edit/page.tsx` | Editor page route |
| `apps/web/src/app/admin/pages/[id]/edit/editor.tsx` | Puck component |
| `apps/web/src/lib/puck/adapter.ts` | DB ↔ Puck format conversion |
| `apps/web/src/lib/puck/config.tsx` | Puck block config |
| `packages/template/src/renderer/PageRenderer.tsx` | Renders sections+blocks |
| `packages/template/src/blocks/registry.ts` | Block type registry |
| `packages/lib/src/config/pageTemplates.ts` | Template definitions |
| `packages/lib/src/tenant/provisioning.ts` | Tenant setup & sync |
| `packages/lib/src/stripe/plans.ts` | Plan feature matrix |

---

## Usage Examples

### Example 1: MCP Add a Services Page to Existing Tenant
```typescript
import { adminClient } from "@/lib/supabase";
import { insertSectionsAndBlocks } from "@repo/lib/tenant/provisioning";

const tenantId = "...";
const pageId = "...";

// Insert page
const { data: page } = await adminClient
  .from("pages")
  .insert({
    tenant_id: tenantId,
    title: "Services",
    slug: "services",
    is_homepage: false,
    feature_key: "services_page"
  })
  .select()
  .single();

// Add content
await insertSectionsAndBlocks(adminClient, page.id, [
  {
    blocks: [
      {
        type: "hero_block",
        props: { title: "Our Services", description: "..." }
      },
      {
        type: "services_block",
        props: { items: [...] }
      },
      {
        type: "cta_block",
        props: { text: "Get Started", url: "/contact" }
      }
    ]
  }
]);

// Clear cache
revalidateTag("pages", "max");
```

### Example 2: Puck Editor Workflow
1. Admin visits `/admin/pages/services` → clicks "Open Visual Editor"
2. Puck loads with current sections+blocks
3. Admin drags new block, configures fields, reorders
4. Clicks "Publish"
5. POST to API, database updated, page reloads with new content
6. Admin navigates to `/services` on tenant domain → sees changes live

### Example 3: Bulk Create Pages via Script
```typescript
// scripts/create-tenant-pages.mjs
import { createAdminClient } from "@repo/lib/supabase";
import { provisionTenant } from "@repo/lib/tenant/provisioning";

const adminClient = createAdminClient();
const tenantId = process.argv[2];
const planId = "growth"; // or "pro"

await provisionTenant(adminClient, tenantId, planId);
console.log("✓ Tenant provisioned with all pages");
```

---

## Best Practices

### For Content Editors (Visual)
- Use Puck editor for day-to-day content updates
- Drag to reorder blocks for layout changes
- Publish frequently and verify on live site
- All changes are immediately visible

### For Developers (Programmatic)
- Use `insertSectionsAndBlocks` helper for bulk inserts
- Always call `revalidateTag("pages", "max")` after DB changes
- Validate block props match registry schemas
- Use templates for consistent initial content
- Plan feature keys prevent users from accessing gated pages

### For System Design
- Blocks are immutable once rendered (edit via Puck, re-publish)
- Sections are only containers (no visual significance in rendering)
- `position` fields control ordering (0-indexed, sequential)
- JSON schema validation happens at block render time
- RLS policies enforce tenant isolation at database level

---

## Migration from Static Templates

If migrating legacy pages:

1. **Extract component props** → convert to `Block` objects
2. **Group related content** → organize into `Section`s
3. **Create page** → insert to `pages` table
4. **Insert sections+blocks** → use `insertSectionsAndBlocks()`
5. **Verify rendering** → visit tenant page
6. **Delete old template** → remove React component

Example:
```typescript
// Old: <BlogTemplate title="Blog" posts={[...]} />
// New:
{
  type: "featured_posts_block",
  props: { title: "Blog", posts: [...] }
}
```

---

## Future Enhancements

- [ ] Block templates (save block configs for reuse)
- [ ] Section templates (save layout patterns)
- [ ] A/B testing variants
- [ ] Version history & rollback
- [ ] Scheduled publishing
- [ ] Multi-language support
- [ ] Custom block types (plugin system)
- [ ] Headless CMS API for external integrations
