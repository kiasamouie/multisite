# Multisite SaaS Platform - Architecture & Development Guidelines

## Quick Context
This is a **full SaaS website builder platform** (like lightweight Webflow/Squarespace). It handles multi-tenant site creation, a block-based page builder, billing via Stripe, media uploads, feature flags, and dual admin interfaces (super admin + per-tenant admin). Each tenant gets their own subdomain/custom domain and a fully isolated site.

---

## 🏗️ System Architecture

### Technology Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v3
- shadcn/ui (component library — all UI primitives live in `@repo/ui`)
- Refine.js v5 (data/state/CRUD management for admin tables)
- Recharts 2 (charts on dashboard)

**Backend & Database:**
- Supabase (PostgreSQL + Auth + RLS + Storage)
- Service role client for admin APIs (bypasses RLS)
- Browser/server clients for public/tenant APIs (RLS enforced)

**Infrastructure:**
- Vercel (hosting)
- Cloudflare (DNS/domains)
- Stripe (billing — webhooks update `subscriptions` table)
- Resend (transactional email)

### Monorepo Structure
```
/apps/web                  → main Next.js app (public sites + admin UI + API routes)
/packages/ui               → ALL shared UI: shadcn primitives + admin shell + layout
/packages/template         → page/section/block renderer (used by public sites)
/packages/lib              → core logic: auth, tenants, Stripe, flags, events, media
/packages/eslint-config    → shared lint rules
/packages/typescript-config → shared tsconfig bases
```

### ☁️ Local Development vs. Cloud Services

**CRITICAL DISTINCTION:**
- **Code**: Runs locally in your dev environment (Next.js dev server on `localhost:3000`)
- **Everything else**: Runs in the cloud (production Supabase project, Vercel, Stripe, Resend, etc.)

**This means:**
- You edit files locally, dev server hot-reloads code changes
- Database queries hit the **cloud Supabase project** (not a local database)
- Auth uses **cloud Supabase Auth** (not local)
- File uploads go to **cloud Supabase Storage** (not local)
- Email sends via **cloud Resend** (not local)
- Billing events come from **cloud Stripe** (not local)

**There is NO local database.** When you `pnpm dev`, your local Next.js app connects directly to the cloud Supabase project specified in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Implication for debugging/development:**
- No need to run migrations locally (`supabase db push` runs them on cloud)
- No need to reset local DB (there isn't one)
- Database state is shared — if you delete a record in dev, it's deleted in cloud
- Hard-refresh page loads real data from cloud (not cached locally)
- All caching behavior affects real cloud data

This is the standard SaaS development model: **local code, cloud services**.

### Multi-Tenant Routing
- `/admin` → platform admin (super admin only)
- `tenant.domain.com/admin` → tenant admin (tenant-scoped)
- `tenant.domain.com` → public site (rendered by template engine)
- Routing is decided in `apps/web/src/middleware.ts`: hostname is resolved to a tenant, then the request is proxied to the appropriate handler

---

## 🗄️ Database Schema Overview

All tables live in the cloud Supabase PostgreSQL instance. Migrations are in `/supabase/migrations/`.

| Table | Purpose |
|---|---|
| `tenants` | One row per tenant (name, slug, domain, plan, branding) |
| `memberships` | Users ↔ tenants join (role: owner/admin/member) |
| `pages` | Pages per tenant (title, slug, is_published, is_homepage, feature_key) |
| `sections` | Ordered sections within a page |
| `blocks` | Ordered blocks within a section (type + JSON content) |
| `media` | Uploaded files metadata (path in Storage, size, type, tenant_id) |
| `media_page_associations` | Many-to-many: media linked to pages with usage_type |
| `subscriptions` | Stripe subscription state per tenant (status, plan, period) |
| `feature_flags` | Per-tenant overrides on top of plan defaults |
| `events` | Analytics/tracking events (type, tenant_id, payload) |
| `audit_logs` | Admin action log (action, entity_type, entity_id, tenant_id) |
| `tenant_integrations` | External service connections per tenant |

RLS policies enforce row-level data isolation. Super admin APIs use the **service role** to bypass RLS. Tenant APIs use **browser/server clients** with RLS enforced.

---

## 💳 Billing & Plans

Three tiers defined in `packages/lib/src/stripe/plans.ts`:

| Plan | Pages | Storage | Custom Domain | Admin Users |
|---|---|---|---|---|
| `starter` | 5 | 100 MB | ✗ | 1 |
| `growth` | 25 | 1 GB | ✓ | 3 |
| `pro` | unlimited | 10 GB | ✓ | unlimited |

- Stripe webhooks (`/api/webhooks/stripe`) update the `subscriptions` table
- Checkout: `/api/stripe/checkout` — creates a Stripe Checkout session
- Portal: `/api/stripe/portal` — Stripe billing portal for self-service
- Plan features gate feature flags via `hasFlag()` / `getAllFlags()` in `packages/lib/src/flags/check.ts`

---

## 🚩 Feature Flags

Two-tier resolution (defined in `packages/lib/src/flags/`):

1. **Per-tenant override** — row in `feature_flags` table for `(tenant_id, key)`
2. **Plan default** — from `getPlanDefaults(plan)` in `flags/defaults.ts`

The per-tenant override always wins. Used to gate content features (blog, analytics, custom domain, etc.) and show/hide admin sections.

---

## 🌐 Public Site Rendering (Template Engine)

Tenant public sites are rendered by the template engine in `packages/template/src/`:

```
PageRenderer → SectionRenderer → BlockRenderer → [specific block component]
```

- `PageRenderer` takes a full `Page` object (with nested sections/blocks/media)
- `SectionRenderer` iterates sections by `position`
- `BlockRenderer` looks up the block `type` in `blocks/registry.ts` and renders the matching component
- `PageContext` provides tenant branding and feature flags to all blocks

### Available Block Types (27 total)
`Hero`, `About`, `Services`, `Contact`, `Testimonials`, `CTA`, `Gallery`, `RichText`, `Heading`, `Image`, `Video`, `TwoColumn`, `PricingTable`, `FAQ`, `Team`, `Stats`, `Map`, `SocialLinks`, `Newsletter`, `OpeningHours`, `Portfolio`, `EventsList`, `FeaturesList`, `ReviewsCarousel`, `BlogGrid`, `PageMedia`, `StatsBlock`

Each block has a typed `*BlockContent` interface in `packages/template/src/types/index.ts`.

### `PageMediaBlock`
Special block that renders media from the `media_page_associations` table. Supports `display_mode`: `"single"` | `"gallery"` | `"list"`. Media is keyed by `usage_type` (e.g. "hero_image", "gallery").

---

## 🧩 Component Organization & Reusability

### Folder Structure
```
apps/web/src/
  ├── app/
  │   ├── [slug]/page.tsx           ← public site renderer (tenant by hostname)
  │   ├── admin/                    ← all admin pages
  │   │   ├── layout.tsx            ← server: resolves tenant + builds Shell props
  │   │   ├── AdminClientWrapper.tsx ← client: provides TenantAdminContext
  │   │   ├── page.tsx              ← dashboard
  │   │   ├── tenants/page.tsx
  │   │   ├── pages/page.tsx
  │   │   ├── media/page.tsx
  │   │   ├── subscriptions/page.tsx
  │   │   └── login/page.tsx
  │   └── api/
  │       ├── admin/                ← service-role APIs (bypass RLS)
  │       │   ├── metrics/dashboard/route.ts  ← unified dashboard data API
  │       │   ├── metrics/card/route.ts
  │       │   ├── metrics/chart/route.ts
  │       │   ├── media/upload/route.ts
  │       │   ├── media/[id]/download/route.ts
  │       │   ├── media/[id]/associations/route.ts
  │       │   ├── tenants/route.ts
  │       │   ├── plans/route.ts
  │       │   ├── pages/route.ts
  │       │   └── feature-flags/route.ts
  │       ├── stripe/               ← Stripe checkout + portal
  │       ├── webhooks/stripe/      ← Stripe webhook handler
  │       ├── pages/[id]/           ← public/tenant pages API (RLS)
  │       ├── sections/             ← sections + blocks API (RLS)
  │       ├── media/                ← public media API (RLS)
  │       ├── events/track/         ← analytics event tracking
  │       └── feature-flags/        ← tenant flag lookup (RLS)
  ├── components/
  │   ├── admin/
  │   │   ├── Resource/             ← universal CRUD table component
  │   │   │   ├── index.tsx
  │   │   │   ├── types.ts
  │   │   │   ├── cells.tsx
  │   │   │   ├── SidePanel.tsx
  │   │   │   ├── ConfirmDialog.tsx
  │   │   │   ├── FieldRenderer.tsx
  │   │   │   └── SkeletonRows.tsx
  │   │   ├── dashboard/
  │   │   │   ├── DashboardLayout.tsx  ← full dashboard UI
  │   │   │   └── index.ts
  │   │   ├── tenants/
  │   │   │   ├── TenantAdminContext.tsx
  │   │   │   ├── TenantFlagsView.tsx
  │   │   │   └── index.ts
  │   │   ├── media/
  │   │   │   ├── MediaUploadInput.tsx
  │   │   │   └── index.ts
  │   │   └── index.ts
  │   └── site/
  │       ├── SiteNav.tsx
  │       ├── SiteFooter.tsx
  │       └── index.ts
  ├── middleware.ts                  ← hostname → tenant resolution + routing
  └── lib/
      └── api-auth.ts               ← authenticateRequest() helper for API routes

packages/ui/src/
  ├── components/ui/                ← shadcn primitives
  │   ├── alert-dialog, avatar, badge, breadcrumb, button, card, collapsible
  │   ├── command, dialog, dropdown-menu, input, label, progress, scroll-area
  │   ├── select, separator, sheet, sidebar, skeleton, switch, table
  │   ├── tabs, textarea, tooltip
  ├── admin/
  │   ├── Shell.tsx                 ← admin layout shell (toolbar + sidebar)
  │   ├── AppSidebar.tsx            ← collapsible nav sidebar
  │   ├── AdminSidebar.tsx          ← sidebar wrapper
  │   ├── layout/
  │   │   ├── PageHeader.tsx        ← deprecated (breadcrumbs now in Shell)
  │   │   └── Shell.tsx             ← current shell (search, breadcrumbs, theme toggle)
  │   ├── modals/                   ← create/edit form modals
  │   └── theme/ThemeToggle.tsx     ← dark/light theme toggle
  └── globals.css                   ← Tailwind base + CSS variables + animations

packages/lib/src/
  ├── supabase/
  │   ├── admin.ts                  ← createAdminClient() — service role
  │   ├── browser.ts                ← createBrowserClient()
  │   ├── server.ts                 ← createServerClient()
  │   └── types.ts                  ← generated Supabase TS types
  ├── tenant/
  │   ├── resolver.ts               ← get tenant by hostname/slug/user_id
  │   ├── platform.ts               ← isPlatformAdmin() check
  │   ├── context.ts                ← TenantAdminContext (tenantId, isPlatform)
  │   ├── provisioning.ts           ← create new tenant (rows + defaults)
  │   └── featureFlags.ts           ← tenant-specific flag helpers
  ├── flags/
  │   ├── check.ts                  ← hasFlag(), getAllFlags()
  │   └── defaults.ts               ← getPlanDefaults(plan)
  ├── stripe/
  │   ├── client.ts                 ← Stripe SDK instance
  │   └── plans.ts                  ← PLANS config (starter/growth/pro) + limits
  ├── media/
  │   ├── resolve.ts                ← resolve signed URLs for media assets
  │   └── blocks.ts                 ← attach media to page blocks
  ├── events/track.ts               ← trackEvent() analytics helper
  ├── resend/                       ← email client + templates
  ├── config/
  │   ├── dashboardConfig.ts        ← nav items config (NavItem type)
  │   ├── pageTemplates.ts          ← available page template definitions
  │   └── stitchBlockMap.ts         ← block type → component mapping
  ├── domain.ts                     ← domain/hostname helpers
  ├── logger.ts                     ← structured logging
  ├── ratelimit.ts                  ← rate limiting helper
  └── validation/schemas.ts         ← Zod schemas for API input validation

packages/template/src/
  ├── types/index.ts                ← Page, Section, Block, typed block content interfaces
  ├── renderer/
  │   ├── PageRenderer.tsx          ← top-level renderer
  │   ├── SectionRenderer.tsx
  │   ├── BlockRenderer.tsx         ← type → component dispatch
  │   └── PageContext.tsx           ← branding + flags context
  ├── blocks/registry.ts            ← block type registry
  ├── components/blocks/            ← 27 block components
  └── features/
      ├── registry.ts
      └── templates/                ← BasicPage, Blog, ContactForm templates
```

### Component Philosophy

**✅ DO:**
- Use Refine.js for data/state logic (useTable, useCreate, etc.)
- Write lean UI layer in React + Tailwind/shadcn (no Material-UI, no bloat)
- Favor composition: pass props for config
- One concern per file: separate data, render, style
- Extract to `/packages/ui` or `/packages/lib` only if shared
- Use barrel exports (index.ts) for folder imports
- Use shadcn components from `@repo/ui` — all primitives are already installed

**❌ DON'T:**
- Hardcode behavior in components
- Create unnecessary wrapper/Cell functions
- Call Supabase directly from components
- Over-engineer simple features
- Build complex custom state when Resource can handle it
- Install duplicate UI libraries — everything should come from `@repo/ui`

---

## �️ Admin UI Architecture

### Admin Shell (`packages/ui/src/admin/layout/Shell.tsx`)

The Shell is the outer chrome for all admin pages. It is a **client component** that wraps every admin route. It provides:

- **Collapsible sidebar** (`AppSidebar`) with nav items driven by config
- **Sticky toolbar** (`h-14`, `bg-background/95 backdrop-blur`) containing:
  - `SidebarTrigger` + `Separator`
  - **Auto-derived breadcrumbs** — uses `usePathname()` + nav items config to build "Admin > Media" style breadcrumbs automatically
  - **Search input** — 64–72px wide with clear button (desktop only)
  - **"View Site" button** — shown when a `siteUrl` is available (tenant context only), opens the live site in a new tab
  - **Theme toggle** — dark/light mode switcher
- `<main>` tag with `p-4 md:p-6` padding where page content renders

Shell props (all passed down from the server `admin/layout.tsx`):
```typescript
interface ShellProps {
  navItems: NavItem[];          // sidebar navigation
  header: { title, subtitle, initial }
  userEmail: string;
  userName?: string;
  signOutHref: string;
  siteUrl?: string;             // enables "View Site" button
  isSuperAdmin?: boolean;
  children: React.ReactNode;
}
```

### Admin Layout (`apps/web/src/app/admin/layout.tsx`)

Server component. Handles auth and routing logic:

1. Creates a Supabase server client and checks session
2. If no session → redirect to `/admin/login`
3. Determines context: `isPlatformAdmin` checks `platform_admins` table
4. For tenant domain requests: resolves tenant from hostname, checks `memberships`
5. Builds `navItems` and `header` config based on super admin vs tenant context
6. Renders `Shell` server-side with correct props

### `TenantAdminContext` (`components/admin/tenants/TenantAdminContext.tsx`)

Client-side context providing `{ tenantId, isPlatform }` to all admin components.

- `tenantId === null` → super admin, global view
- `tenantId === number` → tenant admin, all queries scoped to that tenant

Provided by `AdminClientWrapper.tsx` wrapping the admin layout's children.

### Smooth Animations (`packages/ui/src/globals.css`)

All admin UI transitions are CSS-driven — no JS animation libraries:

```css
/* All elements get subtle transitions for hover/theme changes */
* {
  transition-property: background-color, border-color, color, fill, stroke, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease;
}

/* Page routes fade in smoothly */
main {
  animation: page-fade-in 200ms ease-out;
}

@keyframes page-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Inputs, popovers (`[data-radix-popper-content-wrapper]`), sidebar (`[data-sidebar]`), and `cmdk` are excluded from transitions to prevent jank.

---

## 📊 Dashboard (`apps/web/src/components/admin/dashboard/DashboardLayout.tsx`)

A single `DashboardLayout` component serves both super admin and tenant admin views. It fetches all data in one call to `/api/admin/metrics/dashboard`.

### Data API (`/api/admin/metrics/dashboard`)

Single endpoint returning the full dashboard payload. Accepts `?tenantId=N` for tenant scope. All data fetched in **parallel** via `Promise.all` (8 concurrent Supabase queries):

**Platform view (no tenantId):**
- Stats: Total Tenants, Active Subscriptions, Total Members, Published Pages
- Each stat includes a `change` % comparing last 30 days vs prior 30 days
- `charts.growth` — cumulative tenant count over 30 days
- `charts.plans` — plan distribution (starter/growth/pro counts)
- `recentTenants` — last 5 tenants added

**Tenant view (with tenantId):**
- Stats: Total Pages, Published Pages, Media Files, Team Members
- `charts.growth` — cumulative page count over 30 days
- `charts.plans` — subscription status breakdown
- `summary` — storage MB, published/draft page counts for progress bars

**Both views:**
- `charts.activity` — events bucketed by day, last 30 days
- `charts.week` — events bucketed by weekday, last 7 days
- `recentActivity` — last 8 audit_log entries

### Dashboard Layout (widgets)

```
Row 1: [KPI Card] [KPI Card] [KPI Card] [KPI Card]   (grid-cols-2 lg:grid-cols-4)

Row 2: [─── Growth Area Chart ────────] [Donut Chart]
       (col-span-4)                      (col-span-3)

Row 3: [─── Tabbed Activity Chart ────] [Recent Tenants / Content Overview]
       (col-span-4, Tabs: 30d | 7d)      (col-span-3)

Row 4: [─────────── Activity Feed ───────────────────]
```

Widget components (all in `DashboardLayout.tsx`):
- `StatCardWidget` — icon + big number + TrendingUp/Down % indicator
- `GrowthChart` — AreaChart with gradient fill
- `DonutChart` — PieChart `innerRadius=50 outerRadius=80` with legend
- `WeekBarChart` — BarChart with rounded bars
- `ActivityFeed` — two-column dot-timeline of recent audit events
- `RecentTenantsList` — avatar initials + name + domain + plan badge
- `ContentBreakdown` — shadcn `Progress` bars for pages + media
- `DashboardSkeleton` — skeleton loading state

All Recharts components have `isAnimationActive animationDuration={600-800}`.

---

The `Resource<T>` component is your workhorse for list/CRUD pages. Use it for any "admin table" view (tenants, pages, media, subscriptions, etc).

### Core Props

```typescript
<Resource<PageRecord>
  // Data & Queries
  resource="pages"                    // Supabase table name
  select="*, tenants(...)"            // PostgREST select (joins)
  filters={[...]}                     // Initial Refine filters
  
  // Display
  title="Pages"
  subtitle="Manage pages"
  searchField="title"
  searchPlaceholder="Search..."
  columns={[...]}                     // Column definitions
  
  // Features
  canCreate={true}                    // Show "+ Add" button
  canEdit={true}                      // Show "Edit" action
  canDelete={true}                    // Show "Delete" action
  canSort={true}                      // Enable sortable columns
  canSearch={true}                    // Show search input
  
  // Forms
  createFields={[...]}                // Form fields for create modal
  editFields={[...]}                  // Form fields for edit modal
  defaultValues={{}}                  // Initial form state
  
  // Side panel (detail view)
  sidePanel={{
    icon: "article",
    title: "Page Details",
    subtitle: (row) => row.title,
    view: (row) => <PageDetailsPanel page={row} />,
    width: "md",
  }}
/>
```

### Column Definitions

**Simple column** (just display the value):
```typescript
{ key: "title", label: "Title" }
```

**Column with custom render** (inline function, no separate Cell component):
```typescript
{
  key: "is_published",
  label: "Status",
  render: (value) => {
    const isPublished = Boolean(value);
    return (
      <span className={isPublished ? "bg-green-100" : "bg-gray-100"}>
        {isPublished ? "Published" : "Draft"}
      </span>
    );
  },
  sortable: true,  // Enable sort arrows
}
```

**Column with access to full row** (for derived data):
```typescript
{
  key: "tenant_id",  // Must be unique, even if derived
  label: "Tenant",
  render: (value, row: Record<string, unknown>) => {
    const tenants = row.tenants as { name?: string } | undefined;
    return <span>{tenants?.name ?? "—"}</span>;
  },
}
```

**Unique keys are critical** - React uses them to track list items:
```typescript
// ✅ GOOD - unique keys
{ key: "metadata_type", label: "Type", render: ... }
{ key: "metadata_size", label: "Size", render: ... }

// ❌ BAD - duplicate keys cause React warnings
{ key: "metadata", label: "Type", render: ... }
{ key: "metadata", label: "Size", render: ... }
```

---

## 🔐 Multi-Scope Admin Pages (Super Admin vs Tenant Admin)

### The Pattern

**Key Concept:** Same component/page handles both super admin (global view, read-only) and tenant admin (scoped view, full CRUD).

### Implementation Template

```typescript
"use client";

import { useTenantAdmin, Resource } from "@/components/admin";

interface ItemRecord extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  // ... fields ...
  tenants?: { id: number; name: string };  // For super admin join
}

export default function ItemsPage() {
  const { tenantId } = useTenantAdmin();
  const isSuper = tenantId === null;  // Super admin check

  return (
    <Resource<ItemRecord>
      resource="items"
      title={isSuper ? "All Items" : "Items"}
      
      // RLS + Filtering
      select={isSuper ? "*, tenants(id, name)" : "*"}
      filters={isSuper ? undefined : [
        { field: "tenant_id", operator: "eq", value: tenantId }
      ]}
      
      // Permissions
      canCreate={!isSuper}  // Only tenant admin can create
      canEdit={!isSuper}
      canDelete={!isSuper}
      
      // Different columns for each scope
      columns={
        isSuper
          ? [
              { key: "name", label: "Name" },
              { key: "status", label: "Status", render: StatusBadge },
              { key: "tenant_id", label: "Tenant", render: TenantColumn },
              { key: "created_at", label: "Created", render: DateCell },
            ]
          : [
              { key: "name", label: "Name" },
              { key: "status", label: "Status", render: StatusBadge },
              { key: "created_at", label: "Created", render: DateCell },
            ]
      }
      
      // Create/Edit forms
      createFields={[
        { key: "name", label: "Name", type: "text", required: true },
        { key: "status", label: "Status", type: "select", options: [...] },
      ]}
      editFields={[
        { key: "name", label: "Name", type: "text", required: true },
        { key: "status", label: "Status", type: "select", options: [...] },
      ]}
      defaultValues={{ name: "", status: "draft" }}
      
      // Details side panel
      sidePanel={{
        icon: "info",
        title: "Item Details",
        subtitle: (row) => (row as ItemRecord).name,
        view: (row) => <ItemDetailsPanel item={row as ItemRecord} />,
        width: "md",
      }}
    />
  );
}

// ✅ Inline render functions - no separate Cell components!
function StatusBadge(value: unknown) {
  const status = String(value);
  return (
    <span className={status === "published" ? "bg-green-100" : "bg-gray-100"}>
      {status}
    </span>
  );
}

function TenantColumn(value: unknown, row: Record<string, unknown>) {
  const tenants = row.tenants as { name?: string } | undefined;
  return <span>{tenants?.name ?? "—"}</span>;
}

// Side panel component for detailed view
function ItemDetailsPanel({ item }: { item: ItemRecord }) {
  const { tenantId } = useTenantAdmin();
  const isSuper = tenantId === null;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground">Name</label>
        <p className="mt-1 text-sm font-medium">{item.name}</p>
      </div>
      
      {isSuper && item.tenants && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tenant</label>
          <p className="mt-1 text-sm">{item.tenants.name}</p>
        </div>
      )}
    </div>
  );
}
```

### Key Rules

1. **Use `tenantId` from `useTenantAdmin()`:**
   - `null` = super admin (global view)
   - `number` = tenant admin (scoped to that tenant)

2. **Conditional select() for joins:**
   ```typescript
   select={isSuper ? "*, tenants(id, name)" : "*"}
   ```
   - Super admin: join tenants table to show tenant names
   - Tenant admin: no join needed (RLS filters by tenant_id automatically)

3. **Conditional filters for explicit scoping:**
   ```typescript
   filters={isSuper ? undefined : [
     { field: "tenant_id", operator: "eq", value: tenantId }
   ]}
   ```
   - Super admin: no filter (see all)
   - Tenant admin: explicit filter on tenant_id

4. **Conditional permissions:**
   ```typescript
   canCreate={!isSuper}
   canEdit={!isSuper}
   canDelete={!isSuper}
   ```
   - Super admin: read-only
   - Tenant admin: full CRUD

5. **Conditional columns:**
   - Super admin column set: includes tenant column
   - Tenant admin column set: no tenant column needed

6. **Conditional subtitle/title:**
   ```typescript
   title={isSuper ? "All Pages" : "Pages"}
   subtitle={isSuper ? "Manage across all tenants" : "Manage your site"}
   ```

---

## 📁 File Organization Examples

### Tenants Page
```
/app/admin/tenants/page.tsx
└── Resource component with full CRUD, plan selector, feature flags panel
```

### Media Page
```
/app/admin/media/
├── page.tsx                    ← Resource + upload section + scope logic
└── (nothing else - keep it simple!)
```

### Pages Page
```
/app/admin/pages/page.tsx       ← Resource with page-specific columns
└── (no separate files - everything inline!)
```

---

## 🚀 API Routes

### Pattern: Admin APIs use service role (bypass RLS)
```
/api/admin/media/upload/route.ts              ← file upload to Supabase Storage
/api/admin/media/[id]/download/route.ts       ← signed URL download
/api/admin/media/[id]/associations/route.ts   ← media ↔ page links
/api/admin/tenants/route.ts                   ← tenant CRUD
/api/admin/plans/route.ts                     ← plan management
/api/admin/pages/route.ts                     ← page CRUD + seeding
/api/admin/feature-flags/route.ts             ← per-tenant flag overrides
/api/admin/metrics/dashboard/route.ts         ← unified dashboard data (parallel fetches)
/api/admin/metrics/card/route.ts              ← single KPI card data
/api/admin/metrics/chart/route.ts             ← single chart data
```

All admin routes call `authenticateRequest()` from `src/lib/api-auth.ts` which validates the session and returns `{ admin, isPlatform, userId }`.

### Pattern: Public/tenant APIs use browser client (RLS enforced)
```
/api/pages/[id]/route.ts                      ← page + sections + blocks
/api/pages/[id]/sections/route.ts             ← sections for a page
/api/sections/[id]/route.ts                   ← single section CRUD
/api/sections/[id]/blocks/route.ts            ← blocks for a section
/api/blocks/[id]/route.ts                     ← single block CRUD
/api/media/route.ts                           ← media list (RLS scoped)
/api/media/[id]/route.ts                      ← single media
/api/feature-flags/route.ts                   ← tenant flags (browser auth)
/api/events/track/route.ts                    ← analytics event tracking
/api/me/route.ts                              ← current user info
/api/contact/route.ts                         ← contact form submission (Resend)
/api/revalidate/route.ts                      ← ISR cache revalidation
```

### Pattern: Stripe APIs
```
/api/stripe/checkout/route.ts    ← create Stripe Checkout session
/api/stripe/portal/route.ts      ← Stripe billing portal redirect
/api/webhooks/stripe/route.ts    ← webhook: updates subscriptions table
```

---

## 🔄 Data Scoping Summary

### At Database Layer (RLS Policies)
- Public pages visible to all
- Draft pages visible only to tenant members
- Media visible only to tenant members
- Subscriptions auto-scoped to tenant

### At Application Layer (Filters + Permissions)
- Super admin sees all (no filter) + read-only
- Tenant admin sees own only (filter by tenant_id) + full CRUD

### At Storage Layer (Supabase Storage)
- All files stored in `media` bucket
- Organized by tenant: `media/{tenantId}/{uuid}/{filename}`
- Auto-created on first upload

---

## 🎨 `@repo/ui` — Shared Component Package

All UI primitives are pre-installed and exported from `@repo/ui`. **Never install a separate UI library** — add components here instead.

### Available exports
```typescript
import { Button }           from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@repo/ui/card";
import { Input }            from "@repo/ui/input";
import { Label }            from "@repo/ui/label";
import { Badge }            from "@repo/ui/badge";
import { Dialog, ... }      from "@repo/ui/dialog";
import { AlertDialog, ...}  from "@repo/ui/alert-dialog";
import { Table, ... }       from "@repo/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/tabs";
import { Select, ... }      from "@repo/ui/select";
import { Textarea }         from "@repo/ui/textarea";
import { Switch }           from "@repo/ui/switch";
import { DropdownMenu, ... } from "@repo/ui/dropdown-menu";
import { Sheet, ... }       from "@repo/ui/sheet";
import { Separator }        from "@repo/ui/separator";
import { Avatar, ... }      from "@repo/ui/avatar";
import { Tooltip, ... }     from "@repo/ui/tooltip";
import { Command, ... }     from "@repo/ui/command";
import { Breadcrumb, ... }  from "@repo/ui/breadcrumb";
import { Skeleton }         from "@repo/ui/skeleton";
import { ScrollArea }       from "@repo/ui/scroll-area";
import { Sidebar, ... }     from "@repo/ui/sidebar";
import { Collapsible, ... } from "@repo/ui/collapsible";
import { Progress }         from "@repo/ui/progress";
import { cn }               from "@repo/ui/cn";

// Admin layout
import { Shell }            from "@repo/ui/admin";        // via admin/index
import { ThemeToggle }      from "@repo/ui/admin/theme-toggle";
import { PageHeader }       from "@repo/ui/admin/page-header";  // deprecated
```

Recharts is a dependency of `@repo/ui` and is available in any package that consumes it:
```typescript
import { AreaChart, BarChart, PieChart, ... } from "recharts";
```

---

## ⚙️ Implementation Checklist

When building a new admin feature:

- [ ] Create page at `/app/admin/feature-name/page.tsx`
- [ ] Use `useTenantAdmin()` to get `tenantId`
- [ ] Use `Resource<T>` component as base
- [ ] Add `select` prop for joins (if super admin needs scope awareness)
- [ ] Add `filters` prop for explicit tenant filtering
- [ ] Conditional `canCreate`/`canEdit`/`canDelete` based on `isSuper`
- [ ] Conditional `columns` based on `isSuper`
- [ ] Add side panel with details view (optional)
- [ ] Inline render functions in columns (no separate Cell files)
- [ ] Verify unique `key` on all columns
- [ ] Test both super admin and tenant admin views

---

## 📝 TypeScript Interface Pattern

```typescript
interface MyRecord extends Record<string, unknown> {
  id: number;
  tenant_id: number;
  name: string;
  created_at: string;
  updated_at: string;
  tenants?: {
    id: number;
    name: string;
    domain: string;
  };
}
```

**Why `extends Record<string, unknown>`?**
- Required by Refine's `Resource<T>` type constraint
- Allows arbitrary properties from database joins
- Required for TypeScript strict mode compatibility

---

## 🎯 Design Principles

1. **Simple over clever** - avoid nested abstractions
2. **Inline patterns** - keep render logic in columns, not separate files
3. **Reuse Resource** - it's powerful enough for 90% of admin pages
4. **Props over magic** - configuration via props, not hardcoding
5. **Keep features together** - pages/{your feature}/ folder pattern

---

## 📚 Implemented Features

### Dashboard
- ✅ Unified `/api/admin/metrics/dashboard` endpoint (parallel Supabase fetches)
- ✅ Super admin view: tenant count, subs, members, pages; plan distribution donut; recent tenants
- ✅ Tenant admin view: pages, published, media, members; content breakdown with progress bars
- ✅ 30-day area charts (growth + activity), 7-day bar chart (tab-switched)
- ✅ KPI cards with trend % vs prior 30-day period
- ✅ Recent activity feed from audit_logs

### Admin Shell / Toolbar
- ✅ Auto-derived breadcrumbs from URL + nav config
- ✅ Search input in toolbar
- ✅ "View Site" button for tenant context
- ✅ Dark/light theme toggle
- ✅ Collapsible sidebar

### Tenants
- ✅ Full CRUD (add, edit, delete tenants)
- ✅ Plan selector (dropdown)
- ✅ Feature flags side panel
- ✅ Super admin only

### Pages
- ✅ Super admin: all pages (read-only) + tenant column
- ✅ Tenant admin: own pages (full CRUD)
- ✅ Details side panel with status/metadata

### Media
- ✅ Super admin: all media (read-only) + tenant column
- ✅ Tenant admin: own media (can delete) + upload feature
- ✅ File type badge, size display
- ✅ Details panel with image preview
- ✅ Auto-creates bucket on first upload
- ✅ Media-page associations (PageMediaBlock)

### Subscriptions
- ⚠️ Read-only (managed via Stripe webhooks)
- ✅ Displays tenant subscription info

### Animations / UX
- ✅ 150ms CSS transitions on all color/border/shadow changes
- ✅ Page fade-in animation (opacity + translateY, 200ms) on every route
- ✅ Recharts chart animations (600-800ms) on dashboard

---

## 🔗 Key Files Reference

### Auth & Tenancy
- `packages/lib/src/tenant/resolver.ts` — get tenant by hostname / slug / user_id
- `packages/lib/src/tenant/platform.ts` — `isPlatformAdmin()` check
- `packages/lib/src/tenant/context.ts` — TenantAdminContext provider
- `packages/lib/src/tenant/provisioning.ts` — create new tenant with defaults
- `apps/web/src/app/admin/AdminClientWrapper.tsx` — wraps children with context
- `apps/web/src/components/admin/tenants/TenantAdminContext.tsx` — `useTenantAdmin()` hook
- `apps/web/src/middleware.ts` — hostname routing + tenant resolution
- `apps/web/src/lib/api-auth.ts` — `authenticateRequest()` for API routes

### Plans & Flags
- `packages/lib/src/stripe/plans.ts` — `PLANS` config (starter/growth/pro), limits
- `packages/lib/src/flags/check.ts` — `hasFlag()`, `getAllFlags()`
- `packages/lib/src/flags/defaults.ts` — `getPlanDefaults(plan)`
- `packages/lib/src/tenant/featureFlags.ts` — tenant-scoped flag helpers

### Database
- `packages/lib/src/supabase/admin.ts` — `createAdminClient()` (service role)
- `packages/lib/src/supabase/server.ts` — `createServerClient()` (cookie auth)
- `packages/lib/src/supabase/browser.ts` — `createBrowserClient()`
- `packages/lib/src/supabase/types.ts` — generated Supabase TypeScript types
- `supabase/migrations/` — 23 migration files (0001 → 0023)
- `supabase/migrations/0012_create_rls_policies.sql` — RLS policy definitions

### Dashboard
- `apps/web/src/app/api/admin/metrics/dashboard/route.ts` — unified dashboard API
- `apps/web/src/components/admin/dashboard/DashboardLayout.tsx` — full dashboard UI

### UI Shell
- `packages/ui/src/admin/layout/Shell.tsx` — toolbar, breadcrumbs, search, theme toggle
- `packages/ui/src/admin/AppSidebar.tsx` — collapsible nav sidebar
- `packages/ui/src/globals.css` — CSS variables, transitions, page-fade-in animation

---

## 🚦 Debugging Tips

### Dev server fails to start
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Run `pnpm build` to see TypeScript errors before `pnpm dev`

### Upload issues
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (service role required for Storage)
- Routes auto-create the `media` bucket on first upload if it doesn't exist
- Storage path format: `media/{tenantId}/{uuid}/{filename}`

### Permission issues
- Check RLS policies in Supabase console (Dashboard → Authentication → Policies)
- Verify user has a `memberships` row for their tenant
- Check `platform_admins` table for super admin access
- `tenantId === null` from `useTenantAdmin()` means super admin context

### Dashboard shows no data
- Ensure `audit_logs` table exists (migration 0011)
- Verify the service role key has access to all tables
- Check browser network tab for `/api/admin/metrics/dashboard` response

### Component/TypeScript issues
- All `Resource<T>` interfaces must `extend Record<string, unknown>`
- Column `key` props must be unique per table — use `metadata_type` not `metadata` twice
- `tenantId` from context: `null` = super admin, `number` = tenant admin
- Always import UI primitives from `@repo/ui/[component]`, not local paths

