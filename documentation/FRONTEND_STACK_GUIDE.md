# Front-End Stack & Component Architecture Guide

## Overview

This document provides an in-depth guide to the **current front-end stack** implemented in this project, covering component architecture, styling patterns, data fetching hooks, and the exact conventions followed for building admin pages.

**Target Audience:** Developers building new front-end features, components, or styling. Reference this when creating anything visual or interactive.

---

## Executive Summary: Architecture Journey & Current State

### Phase 1: Tailwind v4 Migration (CSS Variable Syntax)

Tailwind CSS v4 introduced a breaking change in how CSS variables are referenced inside arbitrary values:

**Tailwind v3 (❌ No longer works):**
```css
w-[--sidebar-width]
theme(spacing.4)
```

**Tailwind v4 (✅ Current):**
```css
w-[var(--sidebar-width)]
/* CSS variable functions require explicit var() wrapper */
```

**Impact:** All existing arbitrary values using CSS variables silently stopped working. The sidebar width CSS variable (`--sidebar-width`) was not being applied, causing the spacer div to have 0 width and content to overlay the sidebar.

### Phase 2: Admin Layout Simplification

Simplified admin layout hierarchy from complex wrapper pattern to a cleaner two-component architecture:

**Before:**
```
AdminSidebar → Shell → Children
```

**After:**
```
DashboardLayout
  ├── SidebarProvider
  ├── AppSidebar
  └── SidebarInset
      ├── PageHeader (breadcrumbs + action slots)
      └── {children}
```

`Shell.tsx` has been **deleted**. It is no longer part of the layout. `DashboardLayout` and `AppSidebar` are the only layout primitives.

### Phase 3: Tailwind Source Scanning Paths

The template-based public tenant rendering system was unstyled due to incorrect `@source` directive paths.

**Root Cause:**
```css
/* ❌ WRONG - paths relative from packages/ui/src/ */
@source "../../packages/template/src"
/* Resolves to: packages/packages/template/src (non-existent) */

/* ✅ CORRECT */
@source "../../../packages/template/src"
/* Resolves to: /monorepo/packages/template/src */
```

### Phase 4: Admin UI Component Consolidation (Current Architecture)

A comprehensive restructure of the entire admin frontend was completed. The guiding rule:

> **Every admin route = `page.tsx` (list) + `[id]/page.tsx` (detail) + modals delivered via `CrudModal`. No standalone widget or component files anywhere in the route tree.**

**What was deleted:**

| Removed | Replaced By |
|---------|-------------|
| `KpiCard` | `InfoCard` with `value` prop (metric display mode) |
| `StatusPill` | `StatusBadge` |
| `ActionCtaCard` | Deleted, no replacement needed |
| `PageToolbar` | Deleted — use `PageHeader` from components |
| `Shell.tsx` | Deleted — `DashboardLayout` handles all chrome |
| `Resource<T>` | `DataView<T>` from `@repo/ui/admin/components` |
| `TenantStatBanner` | Inlined into `admin/tenants/page.tsx` using `InfoCard` |
| `MediaDetailsPanel` | Inlined into `DataView`'s `viewModal` config |
| `EditAssociations` | Inlined into `admin/media/[id]/page.tsx` via `CrudModal` |
| All dashboard widgets dir | All logic inlined into `admin/page.tsx` |
| `apps/web/src/components/admin/` | Dissolved — only `common/` + `site/` remain |
| shadcn: `collapsible`, `command`, `textarea` | Deleted (unused) |

---

## Current Front-End Stack

### Core Technologies

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 20+ | JavaScript runtime |
| **Framework** | Next.js | 15 (App Router) | Full-stack React framework with SSR/SSG |
| **View Library** | React | 19 | UI component library |
| **Language** | TypeScript | 5+ | Type-safe JavaScript |
| **Styling** | Tailwind CSS | 4 (PostCSS) | Utility-first CSS framework |
| **Component Library** | shadcn/ui | Latest | Unstyled, accessible component primitives |
| **Data/State** | TanStack React Query | v5 | Server state, caching, invalidation |
| **Client State** | Zustand | Latest | Minimal global client state |
| **Charts** | Recharts | 2 | React charting library (via `Chart` wrapper) |
| **Icons** | Lucide React | Latest | Icon library (via shadcn components) |
| **Forms** | React Hook Form + Zod | Latest | Form state management + schema validation |
| **Utilities** | clsx + tailwind-merge | Latest | Class name merging via `cn()` |

> **Note:** Refine.js has been removed. Data fetching uses custom hooks built directly on TanStack React Query + Supabase client. There is no `useList`, `useCreate`, `useDelete` from `@refinedev/core` anywhere in the codebase.

---

## Package Organization (Monorepo)

```
/packages
├── ui/                                       ← Shared components + styling
│   └── src/
│       ├── components/ui/                    ← 21 active shadcn primitives (each in folder)
│       │     alert-dialog/ avatar/ badge/ breadcrumb/ button/ card/ dialog/
│       │     dropdown-menu/ input/ label/ progress/ scroll-area/ select/
│       │     separator/ sheet/ sidebar/ skeleton/ switch/ table/ tabs/ tooltip/
│       ├── admin/
│       │   ├── components/                   ← Generic reusable admin UI primitives
│       │   │   ├── ActivityFeed/
│       │   │   ├── AlertBanner/
│       │   │   ├── Chart/
│       │   │   ├── CollapsibleSection/
│       │   │   ├── ConfirmDialog/
│       │   │   ├── CrudModal/
│       │   │   ├── DataView/
│       │   │   ├── DetailLayout/
│       │   │   ├── EmptyState/
│       │   │   ├── Filter/
│       │   │   ├── InfoCard/
│       │   │   ├── JsonBlock/
│       │   │   ├── PageHeader/
│       │   │   ├── ProgressBar/
│       │   │   ├── ReadOnlyField/
│       │   │   ├── StatusBadge/
│       │   │   └── index.ts                  ← Barrel: exports all primitives
│       │   ├── layout/
│       │   │   ├── DashboardLayout.tsx
│       │   │   ├── AppSidebar.tsx
│       │   │   ├── PageHeader.tsx
│       │   │   └── index.ts
│       │   ├── modals/
│       │   │   ├── CreateModal.tsx
│       │   │   ├── EditModal.tsx
│       │   │   └── index.ts
│       │   ├── theme/
│       │   │   └── ThemeToggle.tsx
│       │   └── index.ts                      ← Master barrel: re-exports layout + components + theme
│       ├── hooks/
│       └── styles/globals.css               ← Design tokens + Tailwind config
│
├── lib/                                      ← Core logic (auth, tenants, Stripe, validation)
├── template/                                 ← Page rendering engine (public sites)
└── typescript-config/

/apps
└── web/src/
    ├── components/
    │   ├── common/                           ← ONLY app-specific re-exports + UploadInput
    │   │   ├── index.ts                      ← Re-exports all @repo/ui admin components + UploadInput
    │   │   └── upload-input/
    │   └── site/                             ← Public-facing site components
    ├── hooks/
    │   └── useSupabase.ts                    ← useSupabaseList / useSupabaseItem / useSupabaseDelete / useCrudPanel
    └── app/admin/                            ← Routed admin pages
        ├── layout.tsx                        ← Server-side auth + DashboardLayout wrapper
        ├── page.tsx                          ← Dashboard (fully inline)
        ├── tenants/
        │   ├── page.tsx                      ← Tenant list
        │   └── [id]/page.tsx                 ← Tenant detail
        ├── media/
        │   ├── page.tsx                      ← Media list
        │   └── [id]/page.tsx                 ← Media detail
        ├── pages/
        │   ├── page.tsx
        │   └── [id]/page.tsx
        └── subscriptions/
            └── page.tsx
```

**Key point:** `apps/web/src/components/` now contains only `common/` and `site/`. There is no `admin/` subdirectory, no `dashboard/` subdirectory, no feature-specific component directories. Everything that was there has been either deleted or inlined.

---

## Import Patterns

### From `@repo/ui` (shadcn primitives)

```typescript
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select";
import { Switch } from "@repo/ui/switch";
import { Badge } from "@repo/ui/badge";
import { Skeleton } from "@repo/ui/skeleton";
import { cn } from "@repo/ui/cn";
```

### From `@repo/ui/admin/components` (admin primitives)

```typescript
import {
  DataView,
  CrudModal,
  ConfirmDialog,
  InfoCard,
  StatusBadge,
  Filter,
  PageHeader as ComponentPageHeader,
  DetailLayout,
  ReadOnlyField,
  EmptyState,
  LoadingState,
  ActivityFeed,
  Chart,
  AlertBanner,
  CollapsibleSection,
  JsonBlock,
  ProgressBar,
} from "@repo/ui/admin/components";

// Or via the master barrel:
import { DataView, InfoCard, StatusBadge } from "@repo/ui/admin";
```

### From `@/components/common` (apps/web alias — preferred)

`apps/web/src/components/common/index.ts` re-exports everything from `@repo/ui/admin/components` plus the app-specific `UploadInput`. This is the preferred import path inside `apps/web`:

```typescript
import {
  PageHeader,       // aliased from ComponentPageHeader
  DataView,
  CrudModal,
  InfoCard,
  StatusBadge,
  Filter,
  DetailLayout,
  ReadOnlyField,
  EmptyState,
  LoadingState,
  ActivityFeed,
  Chart,
  AlertBanner,
  CollapsibleSection,
  JsonBlock,
  ProgressBar,
  UploadInput,      // app-specific, lives in common/upload-input/
} from "@/components/common";
```

### From `@repo/ui/admin/layout`

```typescript
import { DashboardLayout } from "@repo/ui/admin/layout";
// DashboardLayout is used only in apps/web/src/app/admin/layout.tsx (server component)
```

### From `@repo/lib`

```typescript
import type { Database } from "@repo/lib/supabase/types";
import { createBrowserClient } from "@repo/lib/supabase/browser";
import { createServerClient } from "@repo/lib/supabase/server";
import { hasFlag } from "@repo/lib/flags/check";
import { buildTenantUrl } from "@/lib/url"; // apps/web local utility
```

---

## Data Fetching: Custom Supabase Hooks

All admin data fetching goes through `apps/web/src/hooks/useSupabase.ts`. These hooks wrap TanStack React Query and the Supabase browser client.

### `useSupabaseList<T>`

Paginated, sortable, filterable list query:

```typescript
import { useSupabaseList, type SupabaseFilter } from "@/hooks/useSupabase";

const { data, total, isLoading, isError, page, setPage, totalPages, refetch, invalidate } =
  useSupabaseList<TenantRecord>({
    resource: "tenants",
    select: "*, feature_flags(key, enabled)",
    filters: [{ field: "plan", operator: "eq", value: "pro" }],
    sorters: [{ field: "created_at", order: "desc" }],
    page: 1,
    pageSize: 20,
  });
```

**Filter operators:** `"eq" | "ne" | "lt" | "gt" | "lte" | "gte" | "in" | "contains"`

The `contains` operator maps to Supabase `.ilike(field, '%value%')`.

**Return values:**
- `data` — current page records
- `total` — total record count (for pagination)
- `isLoading`, `isError`, `error`
- `page`, `setPage`, `pageSize`, `setPageSize`, `totalPages`
- `sorters`, `setSorters`
- `refetch()` — re-runs the query
- `invalidate()` — invalidates all `["supabase-list", resource]` cache entries

### `useSupabaseItem<T>`

Fetches a single row by id:

```typescript
import { useSupabaseItem } from "@/hooks/useSupabase";

const { data: tenant, isLoading } = useSupabaseItem<TenantRecord>({
  resource: "tenants",
  id: tenantDbId,
  select: "*, feature_flags(key, enabled)",
  enabled: tenantDbId != null,
});
```

### `useSupabaseDelete`

Handles deletion with automatic query invalidation:

```typescript
import { useSupabaseDelete } from "@/hooks/useSupabase";

const { deleteRecord, deleting } = useSupabaseDelete("tenants");

// Simple delete (calls supabase.from(resource).delete().eq("id", id)):
await deleteRecord(tenant.id);

// Custom handler (e.g. soft delete or API call):
await deleteRecord(tenant.id, async (id) => {
  await fetch(`/api/admin/tenants/${id}`, { method: "DELETE" });
});
// Automatically invalidates ["supabase-list", "tenants"] after either path
```

### `useCrudPanel<T>`

Manages `CrudModal` open/close state with the active item and mode:

```typescript
import { useCrudPanel } from "@/hooks/useSupabase";

const panel = useCrudPanel<TenantRecord>();
// panel.open: boolean
// panel.mode: "view" | "create" | "edit"
// panel.item: T | null
// panel.submitting: boolean
// panel.setSubmitting(v: boolean)
// panel.openPanel(mode, item?)
// panel.closePanel()

// Open for create:
panel.openPanel("create");

// Open for editing an existing item:
panel.openPanel("edit", tenantRecord);

// Render:
<CrudModal
  open={panel.open}
  onOpenChange={panel.closePanel}
  mode={panel.mode}
  title={panel.mode === "create" ? "New Tenant" : "Edit Tenant"}
  onSubmit={handleSubmit}
  submitting={panel.submitting}
>
  {/* form fields */}
</CrudModal>
```

---

## Visual Page Editor: Puck Integration

The **Puck editor** (`@measured/puck@0.20.2`) is integrated as the visual page content builder for tenant websites. It provides a drag-and-drop interface for non-technical users to create and edit pages without touching code.

### Overview

**What it is:**
- React component-based visual editor (MIT-licensed, open-source)
- Drag-and-drop block placement and reordering
- Real-time property editing for each block
- Full undo/redo support

**What it does:**
- Loads page sections and blocks from the database
- Converts DB format to Puck's internal format (via `dbToPuck` adapter)
- Renders 27 available block types in the editor
- On publish: saves changes back to DB (via `puckToDb` adapter)
- Triggers page cache invalidation so tenant site shows new content immediately

**Access:**
- URL: `/admin/pages/[id]/edit`
- Plan-gated: Only tenant members with admin+ role can access
- Super admins can edit any tenant's pages

### Architecture: Page Editing Flow

```
Admin visits /admin/pages/[id]
    ↓
Clicks "Open Visual Editor" button (LayoutTemplate icon in rowActions)
    ↓
Navigates to /admin/pages/[id]/edit
    ↓
Server component fetches:
  - Page record
  - All sections and blocks (joined query)
    ↓
Server converts DB format to Puck format via dbToPuck()
    ↓
Passes initialData to client-side <PuckEditor>
    ↓
Puck renders with all 27 block types available
    ↓
User edits (drag, add, configure, reorder blocks)
    ↓
Clicks "Publish"
    ↓
<PuckEditor onPublish> converts Puck format back to DB format via puckToDb()
    ↓
POST to /api/admin/pages/[id]/puck with new data
    ↓
API deletes old sections+blocks, inserts new ones
    ↓
API calls revalidateTag("pages", "max")
    ↓
window.location.reload() — full page remount
    ↓
Puck re-initialises with fresh DB data, showing published content
    ↓
User can navigate to live tenant page at /{slug} to verify changes
```

### File Structure

| File | Purpose |
|------|---------|
| `apps/web/src/app/admin/pages/[id]/edit/page.tsx` | Server component that fetches page + sections/blocks, converts to Puck format, renders editor |
| `apps/web/src/app/admin/pages/[id]/edit/editor.tsx` | Client component that renders `<Puck>` with editor UI, handles onPublish |
| `apps/web/src/app/api/admin/pages/[id]/puck/route.ts` | POST handler that saves Puck data to database, invalidates cache |
| `apps/web/src/lib/puck/adapter.ts` | `dbToPuck()` and `puckToDb()` converters |
| `apps/web/src/lib/puck/config.tsx` | Puck configuration with all 27 block types, field definitions, defaults |

### Data Format: DB ↔ Puck Conversion

**Puck internal format (PuckData):**
```typescript
{
  content: [
    {
      type: "hero_block",
      props: {
        id: "uuid-from-db",      // block.id
        title: "Our Services",    // block.props fields
        subtitle: "...",
        // ... other block-specific fields
      }
    },
    {
      type: "text_block",
      props: {
        id: "another-uuid",
        content: "Rich text...",
      }
    },
    // ... more blocks
  ],
  root: {}
}
```

**Database format (Sections + Blocks):**
```typescript
Section[] = [
  {
    id: "section-uuid",
    position: 0,
    blocks: [
      {
        id: "block-uuid-1",
        type: "hero_block",
        props: { title: "Our Services", subtitle: "..." },
        position: 0
      },
      {
        id: "block-uuid-2",
        type: "text_block",
        props: { content: "Rich text..." },
        position: 1
      }
    ]
  }
]
```

**Adapters:**

```typescript
// packages/lib/src/lib/puck/adapter.ts

// ── Convert DB to Puck ────────────────────
export function dbToPuck(sections: Section[]): PuckData {
  const allBlocks = sections
    .flatMap((section, sIdx) =>
      section.blocks.map((block, bIdx) => ({
        ...block,
        _sectionIndex: sIdx,
        _blockIndex: bIdx,
      }))
    )
    .sort((a, b) => {
      if (a._sectionIndex !== b._sectionIndex) {
        return a._sectionIndex - b._sectionIndex;
      }
      return a._blockIndex - b._blockIndex;
    });

  return {
    content: allBlocks.map((block) => ({
      type: block.type,
      props: { id: block.id, ...block.props },
    })),
    root: {},
  };
}

// ── Convert Puck to DB ────────────────────
export function puckToDb(data: PuckData): DbSection[] {
  // Strips Puck's top-level `id` from props, reorganizes into single "default" section
  return [
    {
      blocks: data.content.map((item, idx) => ({
        type: item.type,
        props: (() => {
          const { id, ...rest } = item.props; // strip `id` prop
          return rest;
        })(),
        position: idx,
      })),
    },
  ];
}
```

**Why flatten to one section in DB?**
Pages store content as a single "default" section with ordered blocks. Sections exist mainly as a container concept; visual significance comes from block types and ordering. This simplifies both the editor and the rendering engine.

### Block Configuration: 27 Available Types

**File:** `apps/web/src/lib/puck/config.tsx`

All 27 block types are dynamically registered in the Puck config, organized into 5 categories:

```typescript
const BLOCK_DEFAULTS: Record<string, any> = {
  hero_block: { title: "Hero Title", subtitle: "", cta_text: "Learn More", cta_url: "/" },
  text_block: { content: "<p>Enter your text here</p>" },
  image_block: { src: "", alt: "", width: 600, height: 400 },
  pricing_table_block: { rows: [{ name: "Plan", price: "$0/mo", features: [] }] },
  // ... 23 more
};

const BLOCK_FIELDS: Record<string, Field> = {
  hero_block: {
    title: { type: "text" },
    subtitle: { type: "text" },
    cta_text: { type: "text" },
    cta_url: { type: "text" },
  },
  text_block: {
    content: { type: "textarea" },
  },
  image_block: {
    src: { type: "text" },
    alt: { type: "text" },
    width: { type: "number" },
    height: { type: "number" },
  },
  // ... 24 more, built from BLOCK_REGISTRY types
};

export const puckConfig: Config = {
  components: {
    // Dynamically generated from BLOCK_REGISTRY
    hero_block: { fields: BLOCK_FIELDS.hero_block, defaultProps: BLOCK_DEFAULTS.hero_block },
    text_block: { fields: BLOCK_FIELDS.text_block, defaultProps: BLOCK_DEFAULTS.text_block },
    // ... all 27
  },
  categories: {
    "Hero": ["hero_block", "hero_with_image_block"],
    "Content": ["text_block", "heading_block", "image_block", ...],
    "Business": ["pricing_table_block", "faq_block", "contact_form_block", ...],
    "Social": ["testimonials_block", "social_links_block", "newsletter_block"],
    "Info": ["address_block", "featured_posts_block", "events_block", ...],
  },
};
```

**Key point:** The config is built once at app startup and passed to Puck. Block fields and defaults are synchronized with the main `BLOCK_REGISTRY` in `packages/template/src/blocks/registry.ts`, so all 27 types are always available in the editor.

### Editor Component: `editor.tsx`

**Location:** `apps/web/src/app/admin/pages/[id]/edit/editor.tsx`

```typescript
"use client";

import { Puck, type Data as PuckData } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "@/lib/puck/config";
import { puckToDb } from "@/lib/puck/adapter";

interface PuckEditorProps {
  pageId: string;
  pageTitle: string;
  initialData: PuckData;
}

export default function PuckEditor({ pageId, pageTitle, initialData }: PuckEditorProps) {
  async function handlePublish(data: PuckData) {
    const response = await fetch(`/api/admin/pages/${pageId}/puck`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(puckToDb(data)),
    });

    if (!response.ok) throw new Error("Failed to publish");
    
    // ✅ CRITICAL: Full page reload to force Puck re-mount with fresh DB data
    window.location.reload();
  }

  return (
    <div className="relative h-screen w-full">
      <Puck
        config={puckConfig}
        data={initialData}
        onPublish={handlePublish}
      />
    </div>
  );
}
```

**Why `window.location.reload()` not `router.refresh()`?**
- `router.refresh()` runs server component again, but Puck's internal state is already initialised and ignores new props
- `window.location.reload()` triggers a full page remount, so Puck re-initialises with fresh data
- This ensures that after publish, the editor immediately reflects the saved state

### Editor Page: `[id]/edit/page.tsx`

**Location:** `apps/web/src/app/admin/pages/[id]/edit/page.tsx`

Server component that:
1. Authenticates user (platform admin or tenant member with admin+ role)
2. Fetches page record
3. Fetches sections + blocks (joined query for efficiency)
4. Converts to Puck format via `dbToPuck()`
5. Renders `<PuckEditor>`

```typescript
import { notFound } from "next/navigation";
import { createAdminClient, createServerClient } from "@repo/lib/supabase";
import { requireTenantMembership } from "@/lib/api-auth";
import { dbToPuck } from "@/lib/puck/adapter";
import PuckEditor from "./editor";

export default async function PageEditorRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: pageId } = await params;
  const { user } = await createServerClient();
  
  if (!user) throw new Error("Unauthorized");

  // Fetch page + verify auth
  const adminClient = createAdminClient();
  const { data: page } = await adminClient
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .single();

  if (!page) notFound();

  // Verify: platform admin OR tenant member with admin+ role
  if (user.user_metadata?.is_platform_admin !== true) {
    await requireTenantMembership(page.tenant_id, ["admin", "owner"]);
  }

  // Fetch sections + blocks
  const { data: sections } = await adminClient
    .from("sections")
    .select("*, blocks(*)")
    .eq("page_id", pageId)
    .order("position");

  // Convert to Puck format
  const puckData = dbToPuck(sections || []);

  return (
    <PuckEditor
      pageId={pageId}
      pageTitle={page.title}
      initialData={puckData}
    />
  );
}
```

### API Route: POST `/api/admin/pages/[id]/puck`

**Location:** `apps/web/src/app/api/admin/pages/[id]/puck/route.ts`

Handles publishing: receives Puck data, converts to DB format, deletes old sections+blocks, inserts new ones, invalidates cache.

```typescript
import { NextResponse } from "next/server";
import { createAdminClient } from "@repo/lib/supabase";
import { requireTenantMembership } from "@/lib/api-auth";
import { puckToDb } from "@/lib/puck/adapter";
import { revalidateTag } from "next/cache";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: pageId } = await params;
  const body = await request.json();

  // Auth check (same as page editor)
  const page = await getPage(pageId);
  const { user } = await createServerClient();
  
  if (!user?.user_metadata?.is_platform_admin) {
    await requireTenantMembership(page.tenant_id, ["admin", "owner"]);
  }

  // Delete existing sections+blocks (cascade)
  await adminClient
    .from("sections")
    .delete()
    .eq("page_id", pageId);

  // Insert new sections+blocks from Puck data
  const dbSections = puckToDb(body);
  
  for (const section of dbSections) {
    const { data: [newSection] } = await adminClient
      .from("sections")
      .insert({ page_id: pageId, position: 0 })
      .select();

    for (const block of section.blocks) {
      await adminClient.from("blocks").insert({
        section_id: newSection.id,
        type: block.type,
        props: block.props,
        position: block.position,
      });
    }
  }

  // ✅ Invalidate page cache so tenant site shows fresh content
  revalidateTag("pages", "max");

  return NextResponse.json({ success: true });
}
```

### CSS Styling in Puck

Puck editor styles are imported via:
```typescript
import "@measured/puck/puck.css";
```

The editor renders in a full-screen container and integrates with the admin layout via the page route's breadcrumb + header.

### Common Patterns & Tips

**1. Adding a new block type:**
- Define the block in `BLOCK_DEFAULTS` and `BLOCK_FIELDS` in `config.tsx`
- Add corresponding component to `BLOCK_REGISTRY` in `packages/template/src/blocks/registry.ts`
- Sync definitions (field names, types, defaults must match)

**2. Debugging block rendering:**
- Check that block props match the component's expected interface
- Verify field types in `BLOCK_FIELDS` (e.g., `type: "textarea"` vs `type: "text"`)
- Use `<JsonBlock data={block.props} />` in detail pages to inspect raw props

**3. Handling rich text fields:**
- Use `type: "textarea"` for plain multiline text
- For rich text (HTML), implement a custom `RichTextEditor` field in Puck config
- Store as JSON/HTML in props, render as `dangerouslySetInnerHTML` (sanitized)

**4. Publishing updates:**
- Always call `revalidateTag("pages", "max")` after DB changes
- `window.location.reload()` ensures Puck re-mounts with latest data
- Without reload, stale prop cache can cause desync between Puck state and DB

---

## Admin Component Library (`@repo/ui/admin/components`)

Each component lives in its own subdirectory (`ComponentName/ComponentName.tsx` + `ComponentName/index.ts`). Here is the full inventory with usage:

### `DataView<T>`

The **main workhorse** for all admin list pages. Replaces the deleted `Resource<T>`. Renders a card-wrapped table with built-in filtering, sorting, pagination, and inline modal management for view / edit / delete / create actions.

```typescript
import { DataView } from "@/components/common";
import type { Column } from "@repo/ui/admin/components";

interface TenantRecord extends Record<string, unknown> {
  id: number;
  name: string;
  domain: string;
  plan: string;
  created_at: string;
}

const columns: Column<TenantRecord>[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "domain", label: "Domain" },
  {
    key: "plan",
    label: "Plan",
    render: (item) => <Badge>{item.plan}</Badge>,
  },
  {
    key: "created_at",
    label: "Created",
    render: (item) => new Date(item.created_at).toLocaleDateString(),
    hideOnMobile: true,
  },
];

<DataView<TenantRecord>
  title="Tenants"
  data={data}
  loading={isLoading}
  columns={columns}
  keyExtractor={(item) => String(item.id)}

  viewModal={{
    title: (item) => item.name,
    content: (item) => <TenantDetailsJSX tenant={item} />,
    size: "lg",
    onOpen: (item) => { /* optional: fetch extra data when modal opens */ },
  }}

  editModal={{
    title: (item) => `Edit ${item.name}`,
    content: (item) => <EditFormJSX />,
    onOpen: (item) => { setForm({ name: item.name }); },
    onSubmit: async (item) => { await saveEdit(item); },
    submitting: saving,
    size: "lg",
  }}

  deleteConfig={{
    onConfirm: async (item) => { await deleteRecord(item.id); },
    title: (item) => `Delete ${item.name}?`,
    description: "This cannot be undone.",
  }}

  createModal={{
    title: "New Tenant",
    content: () => <CreateFormJSX />,
    onSubmit: async () => { await createTenant(); },
    submitting: creating,
  }}
/>
```

**Column type:**
```typescript
interface Column<T> {
  key: string;
  label: string;
  width?: string;
  className?: string;
  hideOnMobile?: boolean;   // hidden below sm breakpoint
  sortable?: boolean;       // clicking header toggles asc/desc
  render?: (item: T) => ReactNode;  // receives the FULL item object
}
```

> **Important:** `render` receives the **full item** `(item: T)`, not `(value, row)` like the old `Resource<T>`.

### `CrudModal`

A `Dialog`-based modal for CRUD operations. Used directly in pages when `DataView`'s built-in modal system isn't flexible enough (e.g. multi-step flows, association editors, custom footers).

```typescript
import { CrudModal } from "@/components/common";

<CrudModal
  open={open}
  onOpenChange={setOpen}
  mode="create"          // "view" | "create" | "edit"
  title="Add Media"
  description="Upload a new file"
  size="lg"              // "md" | "lg" | "xl" | "full"
  onSubmit={handleSubmit}
  submitting={submitting}
  submitLabel="Upload"
>
  {/* any JSX */}
</CrudModal>
```

When `mode="view"`, no footer submit button is shown. When `mode="create"` or `"edit"`, a submit button + cancel appear in the footer. `onSubmit` receives the native `FormEvent` and `CrudModal` does **not** call `preventDefault` — do it yourself or use a `<form>` inside.

### `InfoCard`

Versatile card with three rendering modes determined by which props are passed:

**1. Metric card** — when `value` prop is provided:
```typescript
import { InfoCard } from "@/components/common";
import { Building2 } from "lucide-react";

<InfoCard
  title="Total Tenants"
  value={247}
  icon={Building2}
  trend="+12%"
  trendUp={true}
  trendLabel="vs last month"
/>
```

**2. Content card** — when `children` are provided (no `value`):
```typescript
<InfoCard
  title="Tenant Growth"
  subtitle="Cumulative count — last 30 days"
  actions={<Filter type="select" value={range} onChange={setRange} options={RANGE_OPTIONS} width="w-24" />}
>
  <Chart type="area" data={growthData} xKey="date" series={[...]} height={220} showLegend />
</InfoCard>
```

**3. Panel card** — when `variant="panel"` (narrow uppercase header, children as body):
```typescript
<InfoCard variant="panel" title="Feature Flags">
  <div className="divide-y divide-border/30">
    {flags.map(flag => <FlagRow key={flag.key} flag={flag} />)}
  </div>
</InfoCard>
```

**Full props:**
```typescript
interface InfoCardProps {
  title?: string | ReactNode;
  subtitle?: string;
  actions?: ReactNode;         // right-aligned content in the header
  children?: ReactNode;
  className?: string;
  variant?: "default" | "panel";
  value?: string | number | null;  // triggers metric display mode
  icon?: LucideIcon;
  iconColor?: string;
  trend?: string;              // e.g. "+12%" — parsed for direction
  trendLabel?: string;         // e.g. "vs last month"
  trendUp?: boolean;           // overrides direction inferred from trend string
}
```

### `StatusBadge`

Color-coded status badge driven by a string key — no enum. Uses CSS variable-based colors with optional glow effect.

```typescript
import { StatusBadge } from "@/components/common";

<StatusBadge status="active" />
<StatusBadge status="disabled" />
<StatusBadge status="pending" />
<StatusBadge status="failed" />
```

**Status → color mapping:**

| Status key(s) | Color token |
|---------------|------------|
| `running`, `active`, `uploading` | Secondary (violet) with pulse |
| `online`, `enabled`, `success` | Success (green) |
| `pending`, `busy`, `paused` | Warning (amber) with pulse |
| `assigned`, `accepted`, `completed` | Primary (indigo) |
| `failed`, `error`, `timed_out` | Destructive (red) |
| `cancelled`, `skipped`, `inactive`, `disabled`, `offline` | Muted (grey) |

Any unknown status key falls back to muted grey. No enum or switch statement needed — just pass any string.

### `Chart`

Thin wrapper around Recharts that renders area, bar, donut (pie), or line charts with consistent design-system theming.

```typescript
import { Chart } from "@/components/common";

// Area chart (e.g. growth over time)
<Chart
  type="area"
  data={growthData}          // { date: string, total: number, new: number }[]
  xKey="date"
  series={[
    { key: "total", label: "Total" },
    { key: "new", label: "New" },
  ]}
  height={220}
  showLegend
/>

// Donut / pie chart
<Chart
  type="donut"
  data={planData}            // { name: string, value: number }[]
  dataKey="value"
  nameKey="name"
  centerLabel="247"
  centerSub="tenants"
  height={220}
  showLegend
/>

// Bar chart
<Chart
  type="bar"
  data={weekData}
  xKey="day"
  series={[{ key: "events", label: "Events" }]}
  height={180}
/>
```

### `Filter`

Standalone select/text/date filter control, or a full filter bar.

```typescript
import { Filter } from "@/components/common";

// Inline select — used in InfoCard actions slot
<Filter
  type="select"
  value={activityRange}
  onChange={setActivityRange}
  options={[
    { value: "30d", label: "30 Days" },
    { value: "7d", label: "7 Days" },
  ]}
  width="w-24"
/>

// Inline text search
<Filter
  type="text"
  value={search}
  onChange={setSearch}
  placeholder="Search..."
/>
```

### `PageHeader`

Simple page-level heading with optional back button and right-side action slot. Used at the top of every admin page.

```typescript
import { PageHeader } from "@/components/common";

// List page
<PageHeader
  title="Tenants"
  actions={<Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1" />New Tenant</Button>}
/>

// Detail page (with back button)
<PageHeader
  title={tenant.name}
  backHref="/admin/tenants"
  actions={<Button variant="outline" onClick={handleEdit}><Pencil className="h-4 w-4 mr-1" />Edit</Button>}
/>
```

Props: `title: string`, `actions?: ReactNode`, `backHref?: string`

### `DetailLayout`

Two-column grid for detail pages: 8-col main + 4-col sidebar on large screens, stacked on mobile.

```typescript
import { DetailLayout } from "@/components/common";

<DetailLayout
  main={
    <InfoCard variant="panel" title="Tenant Details">
      <ReadOnlyField label="Name" value={tenant.name} />
      <ReadOnlyField label="Domain" value={tenant.domain} />
    </InfoCard>
  }
  sidebar={
    <InfoCard variant="panel" title="Feature Flags">
      {/* flags list */}
    </InfoCard>
  }
/>
```

### `ReadOnlyField`

Labeled read-only field row. Designed for use inside `InfoCard variant="panel"` or `DetailLayout`. Value can be any ReactNode.

```typescript
import { ReadOnlyField } from "@/components/common";

<ReadOnlyField label="Domain" value={tenant.domain} />
<ReadOnlyField label="Plan" value={<Badge>{tenant.plan}</Badge>} />
<ReadOnlyField label="Status" value={<StatusBadge status={tenant.status} />} />
<ReadOnlyField label="Created" value={new Date(tenant.created_at).toLocaleString()} />
```

### `ConfirmDialog`

Alert dialog for destructive confirmations. Used when you need confirmation outside of `DataView`'s built-in `deleteConfig`.

```typescript
import { ConfirmDialog } from "@/components/common";

<ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title="Delete Tenant?"
  description="This will permanently remove all tenant data."
  confirmLabel="Delete"
  onConfirm={async () => {
    await deleteRecord(tenant.id);
    setConfirmOpen(false);
  }}
/>
```

### `EmptyState` / `LoadingState`

```typescript
import { EmptyState, LoadingState } from "@/components/common";

if (isLoading) return <LoadingState message="Loading tenants..." />;
if (!data.length) return <EmptyState message="No tenants yet" />;
```

### `ActivityFeed`

Activity list with colored action-type chips:

```typescript
import { ActivityFeed } from "@/components/common";
import type { ActivityFeedItem } from "@repo/ui/admin/components";

const items: ActivityFeedItem[] = [
  { id: 1, action: "created", entity_type: "tenant", created_at: "2026-04-16T10:00:00Z" },
];

<ActivityFeed items={items} />
```

### `AlertBanner`

Informational / warning / error banner strip:

```typescript
import { AlertBanner } from "@/components/common";

<AlertBanner
  variant="warning"
  title="Domain not verified"
  description="DNS changes can take up to 24 hours to propagate."
/>
```

### `CollapsibleSection`

Expandable/collapsible content section (does not use the deleted shadcn `collapsible` primitive — implemented with local state):

```typescript
import { CollapsibleSection } from "@/components/common";

<CollapsibleSection title="Advanced Settings">
  {/* hidden until expanded */}
</CollapsibleSection>
```

### `JsonBlock`

Syntax-highlighted JSON viewer, useful in detail pages for raw metadata or config objects:

```typescript
import { JsonBlock } from "@/components/common";

<JsonBlock data={media.metadata} />
<JsonBlock data={tenant.config} variant="compact" />
```

### `ProgressBar`

Labeled progress bar:

```typescript
import { ProgressBar } from "@/components/common";

<ProgressBar label="Storage used" value={42} max={100} unit="GB" />
```

---

## Layout Components (`@repo/ui/admin/layout`)

### `DashboardLayout`

The entire admin chrome. Used **only** in `apps/web/src/app/admin/layout.tsx` (a server component). Every admin page is automatically wrapped.

```typescript
// apps/web/src/app/admin/layout.tsx
import { DashboardLayout } from "@repo/ui/admin";

<DashboardLayout
  navItems={navConfig}            // NavItem[] from dashboardConfig
  isSuperAdmin={isPlatformAdmin}
  userEmail={user.email}
  userName={user.user_metadata?.full_name}
  signOutHref="/admin/auth/signout"
  siteUrl={siteUrl}               // optional: enables "View Site" button
  tenantName={tenantName}
  initial={initial}
>
  <AdminClientWrapper tenantId={tenantId} isPlatformAdmin={isPlatformAdmin}>
    {children}
  </AdminClientWrapper>
</DashboardLayout>
```

**What `DashboardLayout` provides:**
- Collapsible sidebar navigation (via `AppSidebar` internally)
- Sticky top bar with auto-derived breadcrumbs (from pathname + navConfig), theme toggle, "View Site" button
- CSS variable–driven sizing: `var(--sidebar-width)` / `var(--sidebar-width-icon)`
- Full mobile responsiveness

### `AppSidebar`

Used internally by `DashboardLayout`. Not instantiated directly in pages.

---

## Admin Page Architecture: The Inline Rule

### Page Structure

Every admin route follows this exact structure — no exceptions:

```
apps/web/src/app/admin/
├── page.tsx                    ← Dashboard (fully inline, no companion files)
├── tenants/
│   ├── page.tsx                ← Tenant list (DataView + inline modal content)
│   └── [id]/page.tsx           ← Tenant detail (DetailLayout + inline CrudModal)
├── media/
│   ├── page.tsx                ← Media list (DataView + inline viewModal)
│   └── [id]/page.tsx           ← Media detail (inline association editor via CrudModal)
├── pages/
│   ├── page.tsx
│   └── [id]/page.tsx
└── subscriptions/
    └── page.tsx
```

**The rules:**
1. **One or two files per route** — `page.tsx` and optionally `[id]/page.tsx`. Nothing else.
2. **All types, constants, and helpers are defined inline** at the top of the file.
3. **All modal content is inline JSX** — passed to `DataView viewModal.content` / `editModal.content`, or to a `CrudModal`'s children prop.
4. **No dedicated component files per route.** If something needs reuse across pages, it goes into `@repo/ui/admin/components/` as a generic primitive.
5. **No feature-specific directories** in `apps/web/src/components/`. Only `common/` (re-exports + UploadInput) and `site/` (public site components) remain.

### Anatomy of a List Page (`page.tsx`)

```typescript
"use client";

import { useState } from "react";
import { createBrowserClient } from "@repo/lib/supabase/browser";
import { useAdmin } from "@/context/admin-context";
import { useSupabaseList, useSupabaseDelete } from "@/hooks/useSupabase";
import { PageHeader, DataView, StatusBadge, InfoCard } from "@/components/common";
import type { Column } from "@repo/ui/admin/components";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Plus, DollarSign } from "lucide-react";
import { toast } from "sonner";

// ── Types (inline, not extracted) ─────────────────────────────────────
interface MyRecord extends Record<string, unknown> {
  id: number;
  name: string;
  status: string;
  created_at: string;
}

// ── Constants (inline) ────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

// ── Page component ────────────────────────────────────────────────────
export default function MyPage() {
  const { tenantId } = useAdmin();
  const isSuper = tenantId === null;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "" });

  const filters = isSuper ? [] : [{ field: "tenant_id", operator: "eq" as const, value: tenantId }];

  const { data, total, isLoading, invalidate } = useSupabaseList<MyRecord>({
    resource: "my_table",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
  });

  const { deleteRecord } = useSupabaseDelete("my_table");

  const columns: Column<MyRecord>[] = [
    { key: "name", label: "Name", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "created_at",
      label: "Created",
      render: (item) => new Date(item.created_at).toLocaleDateString(),
      hideOnMobile: true,
    },
  ];

  async function handleSave(item: MyRecord) {
    setSaving(true);
    try {
      const supabase = createBrowserClient();
      await supabase.from("my_table").update(form).eq("id", item.id);
      invalidate();
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-2">
      {/* Optional metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <InfoCard title="Total Items" value={total} icon={DollarSign} />
      </div>

      <DataView<MyRecord>
        title="Items"
        data={data}
        loading={isLoading}
        columns={columns}
        keyExtractor={(item) => String(item.id)}
        viewModal={{
          title: (item) => item.name,
          content: (item) => (
            // Inline detail JSX — no component file needed
            <div className="space-y-3">
              <p className="text-sm"><span className="text-muted-foreground">Status:</span> {item.status}</p>
            </div>
          ),
        }}
        editModal={{
          title: (item) => `Edit ${item.name}`,
          content: () => (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            </div>
          ),
          onOpen: (item) => setForm({ name: item.name }),
          onSubmit: handleSave,
          submitting: saving,
        }}
        deleteConfig={{
          onConfirm: async (item) => { await deleteRecord(item.id); toast.success("Deleted"); },
          title: (item) => `Delete ${item.name}?`,
          description: "This cannot be undone.",
        }}
      />
    </div>
  );
}
```

### Anatomy of a Detail Page (`[id]/page.tsx`)

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@repo/lib/supabase/browser";
import {
  PageHeader, DetailLayout, InfoCard, ReadOnlyField, StatusBadge, CrudModal
} from "@/components/common";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Skeleton } from "@repo/ui/skeleton";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

// ── Types (inline) ────────────────────────────────────────────────────
interface MyRecord {
  id: number;
  name: string;
  status: string;
  created_at: string;
}

// ── Page ───────────────────────────────────────────────────────────────
export default function MyDetailPage() {
  const { id } = useParams();
  const [record, setRecord] = useState<MyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createBrowserClient();
    const { data } = await supabase.from("my_table").select("*").eq("id", id).single();
    setRecord(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!record) return <div>Not found</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-2">
      <PageHeader
        title={record.name}
        backHref="/admin/my-section"
        actions={
          <Button variant="outline" onClick={() => { setForm({ name: record.name }); setEditing(true); }}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        }
      />

      <DetailLayout
        main={
          <InfoCard variant="panel" title="Details">
            <ReadOnlyField label="Name" value={record.name} />
            <ReadOnlyField label="Status" value={<StatusBadge status={record.status} />} />
            <ReadOnlyField label="Created" value={new Date(record.created_at).toLocaleString()} />
          </InfoCard>
        }
        sidebar={
          <InfoCard variant="panel" title="Metadata">
            {/* sidebar content */}
          </InfoCard>
        }
      />

      {/* Edit modal — fully inline, no component file */}
      <CrudModal
        open={editing}
        onOpenChange={setEditing}
        mode="edit"
        title={`Edit ${record.name}`}
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            const supabase = createBrowserClient();
            await supabase.from("my_table").update(form).eq("id", record.id);
            await load();
            setEditing(false);
            toast.success("Saved");
          } finally {
            setSaving(false);
          }
        }}
        submitting={saving}
      >
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
        </div>
      </CrudModal>
    </div>
  );
}
```

---

## Dashboard Page (`admin/page.tsx`) — Fully Inline

The dashboard is the most complex page and demonstrates the inline philosophy at full scale. Everything is self-contained in one file:

**Types defined at top:**
`StatCard`, `ChartPoint`, `PlanPoint`, `ActivityItem`, `RecentTenant`, `DashboardSummary`, `DashboardData`

**Constants defined inline:**
- `ICON_MAP` — maps API icon string keys to Lucide icon components
- `ACTION_CHIP` — maps action type strings to `{ label, className }` for colored chips
- `PLAN_CHIP` — maps plan strings to Tailwind class strings

**Helper functions inline:**
- `actionChip(action: string)` — looks up action chip config with fallback
- `timeAgo(date: string)` — formats relative time string

**Skeleton inline:**
```typescript
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-card p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Data fetching:** Direct `fetch("/api/admin/metrics/dashboard")` in a `useCallback` — not a hook, just a plain async function.

**KPI cards:** `InfoCard` with `value` prop:
```typescript
<InfoCard
  title={stat.title}
  value={stat.value.toLocaleString()}
  icon={ICON_MAP[stat.icon] ?? LayoutDashboard}
  trend={`${stat.change >= 0 ? "+" : ""}${stat.change}%`}
  trendUp={stat.change >= 0}
  trendLabel={stat.changeLabel}
/>
```

**Chart sections:** `InfoCard` as wrapper with `Chart` as child:
```typescript
<InfoCard
  title="Tenant Growth"
  subtitle="Cumulative count — last 30 days"
  actions={<Filter type="select" value={range} onChange={setRange} options={RANGE_OPTIONS} width="w-24" />}
>
  <Chart type="area" data={data.charts.growth} xKey="date" series={[...]} height={220} showLegend />
</InfoCard>
```

---

## Styling System

### Design Tokens

All colors, spacing, and sizing use CSS variables in `packages/ui/src/styles/globals.css`:

```css
/* Deep Space dark palette (applied under .dark class) */
--color-background: hsl(222 72% 8%);    /* #060e20 — base */
--color-foreground: hsl(0 0% 100%);
--color-primary: hsl(238 100% 82%);     /* #a3a6ff — indigo accent */
--color-secondary: hsl(258 100% 77%);   /* #ac8aff — violet accent */
--color-muted: hsl(217 33% 17%);
--color-card: hsl(222 47% 11%);
--color-border: hsl(217 33% 17% / 0.4);
--sidebar-width: 240px;
--sidebar-width-icon: 60px;
```

### Tailwind v4: Always Use `var()`

```tsx
// ✅ CORRECT — explicit var() wrapper required
<div className="w-[var(--sidebar-width)] h-[var(--header-height)]">

// ❌ WRONG — v3 syntax, silently fails in v4
<div className="w-[--sidebar-width]">
```

### Tailwind Source Scanning

Paths in `globals.css` are relative from `packages/ui/src/`:

```css
@source "./";                              /* @repo/ui components */
@source "../../../apps/web/src";           /* Next.js app */
@source "../../../packages/template/src"; /* Template engine */
```

If classes are missing from compiled output, verify these resolve correctly from `packages/ui/src/`.

### Custom CSS Utilities (`@layer components`)

```css
.glass-panel      { @apply bg-white/80 backdrop-blur-sm border border-white/20; }

.admin-header     { @apply sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2
                          border-b bg-background/95 px-4 backdrop-blur
                          supports-[backdrop-filter]:bg-background/60; }

.btn-kinetic      { @apply bg-gradient-to-r from-primary to-secondary text-white
                          font-medium rounded-lg px-4 py-2
                          hover:shadow-lg hover:shadow-primary/50 transition-all duration-200; }

.nav-active-accent { @apply border-l-2 border-primary bg-sidebar-accent; }
```

### No-Line Design Rule

No hard borders. Instead:
- Soft dividers: `border border-border/40` (40% opacity)
- Elevation via `bg-card/60 backdrop-blur-sm rounded-xl`
- Visual separation through spacing and background contrast

```tsx
// ✅ Soft divider
<div className="border-b border-border/40">Content</div>

// ✅ Elevated surface
<div className="bg-card/60 backdrop-blur-sm rounded-xl p-4">Content</div>

// ❌ Hard border
<div className="border border-white">Content</div>
```

### Avatar Gradient Pattern

Consistent pattern used in sidebar, tenants list, dashboard:

```tsx
<Avatar className="bg-gradient-to-br from-primary/30 to-secondary/30">
  <AvatarImage src={imageUrl} />
  <AvatarFallback className="font-bold text-primary">{initials}</AvatarFallback>
</Avatar>
```

### Transitions

Global smooth transitions (150ms ease) applied to all elements via `globals.css`. Excluded from transitions: `input`, `[data-radix-popper-content-wrapper]`, `[data-sidebar]` to prevent jank.

Page enter animation on `<main>`:
```css
@keyframes page-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## File Organization

### The Rules

1. **Route logic stays in `page.tsx`** — all types, constants, helpers, modal content, skeleton components.
2. **Generic primitives go in `packages/ui/src/admin/components/`** — only when truly reusable across multiple pages with no app-specific logic.
3. **`apps/web/src/components/` has only `common/` and `site/`** — there is no `admin/` directory.
4. **Each primitive in its own subdirectory with barrel `index.ts`** — this is the shadcn convention and it's followed for all admin components too.

### When to extract to `@repo/ui/admin/components/`

- Used in 3+ different pages/contexts
- Pure UI primitive with no app-specific logic (no API calls, no tenant context, no auth)
- Could conceivably be used in a different app

**Extraction pattern:**
```
packages/ui/src/admin/components/MyPrimitive/
├── MyPrimitive.tsx
├── index.ts              ← export { MyPrimitive } from "./MyPrimitive";
└── my-primitive-types.ts ← (only if interfaces are complex or shared)
```

Then add to `packages/ui/src/admin/components/index.ts` and `apps/web/src/components/common/index.ts`.

### Adding New shadcn Primitives

```bash
cd packages/ui
pnpm dlx shadcn@latest add <component-name>
```

The component lands in `packages/ui/src/components/ui/<name>/`. Add the export to `packages/ui/package.json`:
```json
"./my-component": "./src/components/ui/my-component/index.ts"
```

Import via `import { ... } from "@repo/ui/my-component"`.

**Currently active shadcn primitives (21):**
`alert-dialog` `avatar` `badge` `breadcrumb` `button` `card` `dialog` `dropdown-menu` `input` `label` `progress` `scroll-area` `select` `separator` `sheet` `sidebar` `skeleton` `switch` `table` `tabs` `tooltip`

**Deleted (unused):** `collapsible` `command` `textarea`

---

## How to Build a New Admin Page

### Step 1: Create the route files

```
apps/web/src/app/admin/invoices/
├── page.tsx          ← list
└── [id]/page.tsx     ← detail (if needed)
```

### Step 2: Pick the right component for each concern

| Concern | Component |
|---------|-----------|
| Page title + action button | `<PageHeader title="..." actions={<Button />} />` |
| KPI / metric number | `<InfoCard value={n} title="..." icon={Icon} trend="..." />` |
| Table with pagination | `<DataView<T> data={...} columns={...} />` |
| Row view modal | `DataView viewModal.content` — inline JSX |
| Row edit modal | `DataView editModal.content` — inline JSX |
| Row delete confirm | `DataView deleteConfig` |
| Custom modal flow | `<CrudModal>` + `useCrudPanel()` |
| Detail page layout | `<DetailLayout main={...} sidebar={...} />` |
| Read-only field rows | `<ReadOnlyField label="..." value={...} />` |
| Status indicators | `<StatusBadge status="active" />` |
| Charts | `<Chart type="area|bar|donut" ...>` inside `<InfoCard>` |
| Inline filter | `<Filter type="select|text" ...>` in InfoCard `actions` slot |
| Empty state | `<EmptyState message="..." />` |
| Loading state | `<LoadingState />` or inline `<Skeleton>` |
| Back navigation | `<PageHeader backHref="/admin/..." />` |

### Step 3: Common patterns

**Tenant-aware filtering:**
```typescript
const { tenantId } = useAdmin();
const isSuper = tenantId === null;
const filters = isSuper ? [] : [{ field: "tenant_id", operator: "eq" as const, value: tenantId }];
```

**Toast notifications:**
```typescript
import { toast } from "sonner";
toast.success("Saved");
toast.error("Failed to save");
```

**Conditional columns (super admin only):**
```typescript
const columns: Column<MyRecord>[] = [
  { key: "name", label: "Name" },
  ...(isSuper ? [{ key: "tenants", label: "Tenant", render: (item) => item.tenants?.name ?? "—" }] : []),
];
```

---

## Debugging & Common Issues

### Missing CSS Classes

**Symptom:** A Tailwind class in code doesn't apply.

**Fix:**
1. Check `@source` paths in `packages/ui/src/styles/globals.css`
2. Clear build cache:
   ```bash
   rm -rf apps/web/.next
   pnpm build
   ```

### CSS Variable Not Rendering

**Symptom:** `w-[--my-var]` produces 0 width.

**Fix:**
```tsx
className="w-[var(--sidebar-width)]"  // ✅
className="w-[--sidebar-width]"       // ❌ v3 syntax
```

### Module Not Found: `@/components/admin`

That directory was dissolved. Import from `@/components/common`:
```typescript
import { DataView, InfoCard } from "@/components/common";
```

### Deleted Component References

| Old import | Correct import |
|------------|---------------|
| `KpiCard` | `InfoCard` with `value` prop |
| `StatusPill` | `StatusBadge` from `@/components/common` |
| `ActionCtaCard` | Implement inline with `Card` + gradient utility classes |
| `PageToolbar` | `PageHeader` from `@/components/common` |
| `Shell` | Deleted — `DashboardLayout` in `layout.tsx` handles all chrome |
| `Resource<T>` | `DataView<T>` from `@/components/common` |
| `useList` from `@refinedev/core` | `useSupabaseList` from `@/hooks/useSupabase` |
| `TenantStatBanner` | Inline `InfoCard` metric grid |
| `MediaDetailsPanel` | Inline JSX inside `DataView viewModal.content` |
| `EditAssociations` | Inline `CrudModal` in `[id]/page.tsx` |

### Stale Build Artifacts

If TypeScript references a deleted file (e.g. "Return statement not allowed here" in a component that was reorganized into a subdirectory):

```bash
rm -rf apps/web/.next packages/ui/.turbo
pnpm build
```

This is caused by both `InfoCard.tsx` (stale flat file) and `InfoCard/InfoCard.tsx` (new location) existing simultaneously. Delete the stale flat file.

---

## Quick Reference Checklist

When building a new admin feature:

- [ ] Import all components from `@/components/common` (never deep-path into `@repo/ui/src/`)
- [ ] Import shadcn primitives from `@repo/ui/<primitive>` (e.g. `@repo/ui/button`)
- [ ] Use `useSupabaseList` / `useSupabaseDelete` / `useCrudPanel` from `@/hooks/useSupabase`
- [ ] Wrap CSS variables in `var()` for Tailwind arbitrary values
- [ ] Use `useAdmin()` to get `tenantId`; derive `isSuper = tenantId === null`
- [ ] Use `DataView<T>` for list pages with `viewModal`, `editModal`, `deleteConfig` inline
- [ ] Use `CrudModal` + `useCrudPanel` for standalone modal flows
- [ ] Use `DetailLayout` + `ReadOnlyField` + `InfoCard variant="panel"` for detail pages
- [ ] Use `InfoCard` with `value` prop for metric cards (not a separate KpiCard)
- [ ] Use `StatusBadge` for status display (not StatusPill)
- [ ] Use `PageHeader` for page title with optional `backHref` and `actions`
- [ ] Keep all types, constants, helpers, and modal content inline in the page file
- [ ] Do NOT create component files per route
- [ ] Do NOT create a `components/admin/` directory — it does not exist
- [ ] Verify TypeScript: `pnpm exec tsc --noEmit -p apps/web/tsconfig.json`
- [ ] Test in both light and dark modes

---

## Architecture Philosophy

### The Three Laws

**1. Every route = `page.tsx` + `[id]/page.tsx`. Nothing else.**
Types, constants, helpers, modal content, skeleton states — all inline in the page file. If it's only used in one page, it lives in that page's file.

**2. Generic primitives belong in `@repo/ui/admin/components/`.**
Only extract when: used in 3+ places, has no app-specific logic, and is a pure UI primitive. Each primitive gets its own subdirectory with a barrel `index.ts`.

**3. `apps/web/src/components/` has only `common/` and `site/`.**
`common/index.ts` is a re-export barrel for `@repo/ui/admin/components` plus `UploadInput`. No feature-specific subdirectories. No `dashboard/`, `tenants/`, `media/`, or `admin/` directories.

### Why Inline?

- **Zero cognitive overhead** — everything for a page is in one file
- **No component-hunting** — no tracing through 4 layers of imports to understand one modal
- **Easy refactoring** — deleting a page is a single file deletion
- **Explicit dependencies** — all imports visible at the top of the file
- **No premature abstraction** — components are only extracted when reuse is real, not hypothetical

Pages can be 200–500 lines. That is deliberate. A 400-line file containing everything for a page is easier to understand than 8 files of 50 lines each that are connected through props and imports.
