# Frontend Development Instructions

**Scope:** `apps/web/src/**`

Use this guide when working on React components, pages, user-facing features, styling, and Next.js routing.

---

## 📋 Mandatory Reading

**Before writing any frontend code, read:**
1. [FRONTEND_STACK_GUIDE.md](../../documentation/FRONTEND_STACK_GUIDE.md) — React patterns, component patterns, dark mode
2. [ARCHITECTURE.md](../../documentation/ARCHITECTURE.md) — System design, middleware flow, routing

**Feature-Specific Reading (when working on these areas):**
- [BOOKING_SYSTEM.md](../../documentation/BOOKING_SYSTEM.md) — When building booking forms, admin pages, or integrating the BookingBlock component

---

## 🎯 Critical Rules

### Rule 1: Reuse Components from packages/ui First
**ALWAYS check `packages/ui` before building new components.**

Available components:
- **Primitives:** Button, Card, Dialog, Input, Select, Checkbox, RadioGroup, Tabs, Toast, etc.
- **Admin UI:** DataView (table/list), CrudModal, ConfirmDialog, StatusBadge, InfoCard, Filter, PageHeader
- **Layout:** DashboardLayout, AppSidebar, ThemeToggle
- **Utilities:** useToast, useConfirm

Import pattern:
```typescript
import { Button, Card } from "@/components/ui";
import { DataView, CrudModal } from "@/components/admin";
import { DashboardLayout } from "@/components/admin/layout";
```

**Anti-pattern:** Building custom components that already exist in packages/ui

---

### Rule 2: All Admin Screens Follow One Pattern

```typescript
// Page Layout = PageHeader + DataView/CrudModal

"use client";
import { PageHeader } from "@/components/admin";
import { DataView } from "@/components/admin";
import { CrudModal } from "@/components/admin";
import { useToast } from "@/components/ui";

export default function ResourcePage() {
  const [items, setItems] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const { toast } = useToast();

  const handleCreate = async (data) => {
    // Create logic
    toast({ title: "Created", description: "Resource created" });
  };

  const handleEdit = async (id, data) => {
    // Edit logic
    toast({ title: "Updated" });
  };

  const handleDelete = async (id) => {
    // Delete logic
    toast({ title: "Deleted" });
  };

  return (
    <>
      <PageHeader 
        title="Resources" 
        action={{ label: "New", onClick: () => setIsCreateOpen(true) }}
      />
      <DataView 
        items={items} 
        columns={/* Define columns */}
        onEdit={setSelectedItem}
        onDelete={handleDelete}
      />
      <CrudModal 
        isOpen={isCreateOpen || !!selectedItem}
        item={selectedItem}
        onSave={selectedItem ? handleEdit : handleCreate}
        onClose={() => { setIsCreateOpen(false); setSelectedItem(null); }}
      />
    </>
  );
}
```

**Key Principle:** Every admin page looks identical because it uses the same building blocks.

**Anti-pattern:** Custom Resource components, unique page layouts

---

### Rule 3: Styling Rules

#### Use CSS Variables, Never Hardcode Colors
```typescript
// ✅ DO THIS
<div className="bg-primary text-primary-foreground">

// ❌ DON'T DO THIS
<div className="bg-blue-600 text-white">
```

Design tokens defined in `packages/ui/src/globals.css`:
```css
:root {
  --primary: 220 90% 56%;
  --secondary: 200 80% 60%;
  --destructive: 0 84% 60%;
  --muted: 210 40% 96%;
  /* ... more tokens */
}
```

#### Tailwind v4 CSS Variables (Important!)
```typescript
// ✅ CORRECT (v4 syntax)
<div className="w-[var(--custom-width)]">

// ❌ WRONG (v3 syntax, breaks in v4)
<div className="w-[--custom-width]">
```

Always wrap with `var()` function.

#### Dark Mode
```typescript
// Use class-based dark mode (automatic)
<div className="bg-white dark:bg-slate-950 text-black dark:text-white">
```

Styling handled automatically by `globals.css`. No need to set `colorScheme` in theme provider.

---

### Rule 4: Page Structure & Middleware

#### Routing Pattern
```
middleware.ts (hostname resolution)
    ↓
/admin/[resource]           → Admin pages (auth required)
/admin/[resource]/[id]      → Edit page
/[slug]/                    → Public tenant site
/[slug]/admin/[resource]    → Tenant admin (auth + tenant check)
```

**Important:** Tenant context is resolved by middleware and available via `headers().get("x-tenant-id")`

#### Page Template
```typescript
// apps/web/src/app/admin/pages/page.tsx
"use client";

import { getSupabaseClient } from "@multisite/lib";
import { PageHeader, DataView } from "@/components/admin";

export default async function PagesPage() {
  const client = getSupabaseClient();
  const { data: pages } = await client
    .from("pages")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title="Pages" />
      <DataView 
        items={pages || []}
        columns={[
          { key: "title", label: "Title" },
          { key: "slug", label: "Slug" },
        ]}
      />
    </>
  );
}
```

---

### Rule 5: Supabase Client Usage

#### Server Components (Recommended)
```typescript
// Always use server client for queries
import { getSupabaseAdminClient } from "@multisite/lib";

export default async function Page() {
  const client = getSupabaseAdminClient();
  const { data } = await client.from("pages").select("*");
  return <div>{/* render data */}</div>;
}
```

#### Client Components (Use Hooks)
```typescript
"use client";
import { useSupabase } from "@/hooks/useSupabase"; // or similar

export default function Component() {
  const { client } = useSupabase();
  const [data, setData] = useState(null);

  useEffect(() => {
    client.from("pages").select("*").then(({ data }) => setData(data));
  }, [client]);

  return <div>{/* render data */}</div>;
}
```

**Rule:** Use server components when possible. Browser client only when you need real-time or interactivity.

---

### Rule 6: Cache Invalidation

After any data mutation (create/edit/delete), invalidate Next.js cache:

```typescript
import { revalidateTag } from "next/cache";

export async function updatePage(id: string, updates: any) {
  const client = getSupabaseAdminClient();
  await client.from("pages").update(updates).eq("id", id);
  
  // ✅ CRITICAL: Invalidate cache so new data appears immediately
  revalidateTag("pages");
  
  return { success: true };
}
```

**Important:** Without `revalidateTag`, users will see stale data until they hard-refresh.

Cache tags to remember:
- `pages` — Page, section, block changes
- `media` — Media upload/delete
- `subscriptions` — Billing changes
- `feature-flags` — Feature flag changes

---

## 🏗️ File Structure

```
apps/web/src/
├── app/
│   ├── admin/                          # Super admin interface
│   │   ├── [resource]/
│   │   │   ├── page.tsx                # List page (DataView)
│   │   │   └── [id]/page.tsx           # Edit page (CrudModal)
│   │   └── layout.tsx                  # Admin layout
│   ├── [slug]/                         # Public tenant site
│   │   ├── page.tsx                    # Tenant homepage
│   │   ├── [page-slug]/page.tsx        # Tenant page
│   │   └── admin/                      # Tenant admin (private)
│   └── middleware.ts                   # Hostname resolution
├── components/
│   ├── ui/                             # shadcn/ui primitives (don't modify)
│   ├── admin/                          # Admin-specific components
│   │   ├── DataView.tsx
│   │   ├── CrudModal.tsx
│   │   ├── layout/
│   │   │   └── DashboardLayout.tsx
│   │   └── index.ts
│   └── public/                         # Public-facing components
├── hooks/
│   └── useSupabase.ts                  # Supabase client hook
├── lib/
│   └── utils.ts                        # Utility functions
└── middleware.ts                       # Next.js middleware (hostname → tenant)
```

---

## 🔌 Key Imports

```typescript
// UI Components
import { 
  Button, 
  Card, 
  Dialog, 
  Input, 
  Select,
  useToast 
} from "@/components/ui";

// Admin Components
import { 
  DataView, 
  CrudModal, 
  PageHeader,
  DashboardLayout 
} from "@/components/admin";

// Shared Library
import { 
  getSupabaseAdminClient,
  getSupabaseClient,
  getTenantContext,
  checkFeatureFlag,
  getStripeClient 
} from "@multisite/lib";

// Next.js
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
```

---

## 🚫 Anti-Patterns (NEVER Do These)

| Anti-Pattern | Why | Fix |
|---|---|---|
| Hardcoded colors | Breaks dark mode, branding | Use CSS variables |
| Custom admin components | Inconsistent UI/UX | Use DataView + CrudModal |
| `w-[--var]` syntax | v4 Tailwind breaks | Use `w-[var(--var)]` |
| No cache invalidation | Stale data for users | Call `revalidateTag()` |
| Importing from `packages/lib/src/` | Breaks exports | Import from `@multisite/lib` |
| `<any>` types | Bypasses TypeScript | Type properly or use `unknown` |
| Modifying globals.css styles | Breaks consistency | Add new CSS variables instead |

---

---

## 🎨 Settings Form Patterns

### Theme Settings Form
**Location:** `apps/web/src/app/admin/settings/theme/theme-form.tsx`

The theme form displays:
1. **Preset themes grid** — 10 named presets (Default, Ocean, Forest, Sunset, Rose, Violet, Midnight, Slate, Amber, Ruby) that apply all palette colours on click
2. **Colour customization section** — Individual hex + colour picker inputs for Primary, Accent, Background, Foreground
3. **Typography section** — Font family selector

**Pattern:**
```typescript
"use client";

interface PresetTheme {
  id: string;
  name: string;
  palette: { primary, accent, background, foreground };
}

const PRESETS: PresetTheme[] = [/* ... */];

export function ThemeForm({ initial }: ThemeFormProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setPrimary(preset.palette.primary);
    // ... set other colours
  };

  // Render preset grid with highlight on active
  // Render colour inputs (clicking any = clear activePreset)
  // Save calls saveSettingsAction("theme", {...})
}
```

**Key Design:** Presets are TypeScript constants, not DB-stored. Active preset is detected client-side by comparing current palette values. Manual edits clear the active state.

---

## 📦 Public Site Styling: Header & Footer Blocks

### Background & Opacity Controls

Both `site_header` and `site_footer` Puck blocks now support per-block styling:

**In Puck Editor Config** (`apps/web/src/lib/puck/config.tsx`):
```typescript
site_header: {
  // ... existing fields (sticky, borderBottom, etc.)
  backgroundColor: { type: "text", label: "Background colour (hex)" },
  backgroundOpacity: { type: "number", label: "Opacity (0-100)" },
  backdropBlur: { type: "radio", label: "Backdrop blur" },  // header only
},
site_footer: {
  // ... existing fields
  backgroundColor: { type: "text", label: "Background colour (hex)" },
  backgroundOpacity: { type: "number", label: "Opacity (0-100)" },
},
```

**Type Definition** (`packages/lib/src/tenant/context.ts`):
```typescript
export interface SiteHeaderConfig {
  // ... existing
  backgroundColor?: string;      // hex (#rrggbb)
  backgroundOpacity?: number;    // 0-100
  backdropBlur?: boolean;
}
```

**Block Cache Mapping** (`apps/web/src/lib/cache.ts`):
```typescript
function coerceNumber(v: unknown, fallback: number): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  return fallback;
}

function coerceString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return undefined;
}

// In getHeaderConfig() / getFooterConfig():
return {
  // ...
  backgroundColor: coerceString(c.backgroundColor),
  backgroundOpacity: coerceNumber(c.backgroundOpacity, 100),
  backdropBlur: coerceBool(c.backdropBlur, true),
};
```

**Styling Composition** (`apps/web/src/components/site/_compose-bg.ts`):
```typescript
export function composeBackground(
  color: string | undefined,
  opacity: number | undefined,
): string | undefined {
  if (!color) return undefined;     // Inherit tenant theme
  if (opacity <= 0) return "transparent";
  if (opacity >= 100) return color; // Return hex as-is
  
  // Parse hex (#rgb or #rrggbb) and convert to rgba
  const hex = color.startsWith("#") ? color.slice(1) : color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = opacity / 100;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
```

**Component Application** (`apps/web/src/components/site/site-nav.tsx`):
```typescript
export function SiteNav({ headerConfig }: SiteNavProps) {
  const blur = headerConfig?.backdropBlur ?? true;
  const customBg = composeBackground(
    headerConfig?.backgroundColor,
    headerConfig?.backgroundOpacity,
  );

  return (
    <header
      className={[
        isSticky ? "sticky top-0 z-50" : "",
        blur ? "backdrop-blur" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: customBg ?? "var(--tenant-bg, #fff)",
      }}
    >
```

**Defaults:** If no custom background is set, falls back to `var(--tenant-bg, #fff)` (the tenant's theme palette background colour).

---

## 📋 Checklist: Adding a New Admin Page

- [ ] Created route in `apps/web/src/app/admin/[resource]/`
- [ ] Used `PageHeader` + `DataView` + `CrudModal` pattern
- [ ] Imported components from `packages/ui` (not custom built)
- [ ] Used server-side Supabase queries where possible
- [ ] Added `revalidateTag()` after mutations
- [ ] Used CSS variables for colors (no hardcoded colors)
- [ ] Tested in dark mode
- [ ] Ran `pnpm lint` and fixed warnings
- [ ] Ran `pnpm build` and verified no errors

---

## 🔄 Common Tasks

### Display a List of Items
```typescript
import { DataView } from "@/components/admin";

<DataView 
  items={items}
  columns={[
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
  ]}
  onEdit={(item) => setSelected(item)}
  onDelete={(item) => handleDelete(item.id)}
/>
```

### Show Create/Edit Modal
```typescript
import { CrudModal } from "@/components/admin";

<CrudModal
  isOpen={isOpen}
  item={selectedItem} // null = create mode, item = edit mode
  fields={[
    { name: "name", label: "Name", type: "text" },
    { name: "email", label: "Email", type: "email" },
  ]}
  onSave={async (data) => {
    // Handle create or update
  }}
  onClose={() => setSelectedItem(null)}
/>
```

### Make Server-Side Query
```typescript
import { getSupabaseAdminClient } from "@multisite/lib";

const client = getSupabaseAdminClient();
const { data, error } = await client
  .from("pages")
  .select("*")
  .eq("tenant_id", tenantId);
```

### Invalidate Cache After Changes
```typescript
import { revalidateTag } from "next/cache";

// After any data change
revalidateTag("pages");
revalidateTag("media");
```

---

## 📚 Related Documentation

- [FRONTEND_STACK_GUIDE.md](../../documentation/FRONTEND_STACK_GUIDE.md) — Detailed patterns
- [ARCHITECTURE.md](../../documentation/ARCHITECTURE.md) — System design
- [packages/ui/](../../packages/ui/) — Component library
