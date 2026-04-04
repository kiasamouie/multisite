# Admin UI Migration: shadcn/ui Blocks into Existing Architecture

## Purpose of This Document

This document is the complete, self-contained briefing for executing the admin UI shell migration in **one agent session**. It covers current state, exact files to change, installation steps, component contracts, and the connection to the AI provisioning system. An AI agent reading only this document (plus ARCHITECTURE.md and AI_PROVISIONING_SYSTEM.md) should be able to complete the entire migration without asking questions.

---

## What This Migration Is

Replace the custom-built admin shell primitives in `packages/ui/src/` with production-ready shadcn/ui components, while leaving the **entire data and business logic layer untouched**.

**The codebase principle carries through here too:**
> The codebase renders. The database decides what to render and how.

After this migration, the admin shell is built from shadcn/ui components. Everything that makes this platform functional — Refine data hooks, Supabase queries, RLS, tenant context, API routes, the provisioning pipeline, the BLOCK_REGISTRY — is completely unchanged.

---

## Strict Scope Boundary

### REPLACE — The admin shell in `packages/ui/src/`
These files are entirely replaced with shadcn/ui equivalents:

| Current File | Replace With |
|---|---|
| `packages/ui/src/admin/layout/Shell.tsx` | shadcn `SidebarProvider` + `SidebarInset` layout |
| `packages/ui/src/admin/layout/Sidebar.tsx` | shadcn `Sidebar` component tree |
| `packages/ui/src/admin/layout/TopBar.tsx` | shadcn `SidebarTrigger` + header bar |
| `packages/ui/src/admin/layout/PageHeader.tsx` | shadcn `Breadcrumb` + page title pattern |
| `packages/ui/src/admin/modals/CreateModal.tsx` | shadcn `Dialog` |
| `packages/ui/src/admin/modals/EditModal.tsx` | shadcn `Dialog` |
| `packages/ui/src/admin/AdminSidebar.tsx` | New `AppSidebar.tsx` using shadcn sidebar primitives |
| `packages/ui/src/button.tsx` | `shadcn add button` |
| `packages/ui/src/card.tsx` | `shadcn add card` |
| `packages/ui/src/badge.tsx` | `shadcn add badge` |
| `packages/ui/src/input.tsx` | `shadcn add input` |
| `packages/ui/src/label.tsx` | `shadcn add label` |
| `packages/ui/src/switch.tsx` | `shadcn add switch` |
| `packages/ui/src/textarea.tsx` | `shadcn add textarea` |
| `packages/ui/src/dropdown-menu.tsx` | `shadcn add dropdown-menu` |

### UPGRADE INTERNALS — `Resource<T>` (external API unchanged)

`Resource<T>` is **not replaced** — it is refactored internally to use shadcn/ui primitives while keeping its props contract identical. See the dedicated section below for exactly what changes inside it and why full replacement is the wrong move.

### DO NOT TOUCH — The engine
These are **never modified** as part of this migration:

- `apps/web/src/components/admin/tenants/TenantAdminContext.tsx` — tenant scoping context
- `apps/web/src/components/admin/media/MediaUploadInput.tsx` — media upload
- `apps/web/src/app/admin/_providers/refine.tsx` — Refine + Supabase data provider
- `apps/web/src/app/admin/AdminClientWrapper.tsx` — context provider wrapper
- All `apps/web/src/app/admin/[page]/page.tsx` files — admin page routes
- All `apps/web/src/app/api/` routes — API layer
- `packages/lib/src/config/dashboardConfig.ts` — nav config (structure kept, icons updated)
- `packages/lib/src/tenant/` — all tenant resolution logic
- `packages/lib/src/flags/` — feature flag evaluation
- `packages/lib/src/provisioner/` — provisioning pipeline
- `supabase/migrations/` — database schema
- `apps/web/src/app/[slug]/` — public tenant site renderer (completely separate)
- `packages/template/` — block registry and zone renderer

---

## Current State (What Exists Before Migration)

### Tech Stack
- **Next.js 15** App Router, **React 19**, **TypeScript**
- **Tailwind CSS** (v3), **next-themes** for dark/light toggle
- **Refine.js** (`@refinedev/core`, `@refinedev/supabase`, `@refinedev/nextjs-router`)
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`)
- **No shadcn/ui installed yet** (Radix UI primitives ARE already installed in packages/ui)

### Existing Radix UI Dependencies in `packages/ui/package.json`
Already present (shadcn/ui wraps these — no version conflicts):
```json
"@radix-ui/react-dialog": "^1.1.15",
"@radix-ui/react-dropdown-menu": "^2.1.16",
"@radix-ui/react-switch": "^1.2.6",
"class-variance-authority": "^0.7.0",
"clsx": "^2.1.0",
"tailwind-merge": "^2.5.0"
```
These are already what shadcn/ui uses internally. The migration adds the remaining Radix primitives needed for the sidebar and command components.

### Current CSS Variables in `packages/ui/src/globals.css`
The file already uses shadcn/ui's HSL variable naming convention (`--background`, `--foreground`, `--primary`, etc.). The dark theme also has admin-specific tokens (`--admin-surface`, `--admin-border`, etc.). These admin tokens need to be retained alongside the standard shadcn variables — they are used by existing admin page components that are not being replaced.

### Current Icon System
Material Symbols icon font used throughout — all icons are strings: `"dashboard"`, `"domain"`, `"image"`, `"article"`, `"payments"`, `"settings"`.

In `packages/lib/src/config/dashboardConfig.ts`, the `NavItem` type has `icon?: string`.

**After migration**: Replace Material Symbols with Lucide icons (via `lucide-react`, installed as part of shadcn/ui). The `NavItem` type icon field changes from `string` to `LucideIcon` component reference. This is one of the only changes to `dashboardConfig.ts`.

### Current Admin Layout Flow
```
apps/web/src/app/admin/layout.tsx   (Server Component)
  → reads user, platform admin check, tenant check
  → builds navItems[] from SUPER_ADMIN_CONFIG or TENANT_ADMIN_CONFIG
  → passes to <AdminSidebar> from @repo/ui/admin/sidebar
  → wraps children in <AdminClientWrapper>

AdminSidebar (packages/ui/src/admin/AdminSidebar.tsx)
  → renders <Shell> from @repo/ui/admin
  → Shell renders <Sidebar> + <TopBar> + children

Shell.tsx   → flex h-screen layout container
Sidebar.tsx → fixed 256px left panel, usePathname() for active state
TopBar.tsx  → user email, sign-out, theme toggle
```

### Current `NavItem` Type (in packages/lib/src/config/dashboardConfig.ts)
```typescript
export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon?: string;              // ← Material Symbols string name
  requiredPlan?: "starter" | "growth" | "pro";
  requiredRole?: DashboardRole[];
  featureFlag?: string;
};
```

### Current Nav Config (packages/lib/src/config/dashboardConfig.ts)
**Super Admin nav:**
```
overview  → /admin         icon: "dashboard"
tenants   → /admin/tenants icon: "domain"
subscriptions → /admin/subscriptions icon: "payments"
media     → /admin/media   icon: "image"
pages     → /admin/pages   icon: "article"
```

**Tenant Admin nav:**
```
dashboard → /admin         icon: "dashboard"
media     → /admin/media   icon: "image"
pages     → /admin/pages   icon: "article"
settings  → /admin/settings icon: "settings"
```

### Current `Resource<T>` Component Imports
`apps/web/src/components/admin/Resource/index.tsx` imports from `@repo/ui/admin`:
```typescript
import { PageHeader, CreateModal, EditModal } from "@repo/ui/admin";
```
These three must exist with compatible props after migration (replace implementations with shadcn Dialog, keep the prop contract stable so Resource doesn't need changes).

---

## Installation Steps

All commands run from the **monorepo root** unless noted.

### Step 1: Initialize shadcn/ui in `packages/ui`

```bash
cd packages/ui
npx shadcn@latest init
```

When prompted:
- Style: **Default** (or New York — pick one and be consistent)
- Base color: **Slate** (matches the existing dark theme palette)
- CSS variables: **Yes**
- Config file location: `packages/ui/components.json`
- Tailwind config: `packages/ui/tailwind.config.js` (create if not present)
- Components directory: `packages/ui/src/`
- Utils path: `packages/ui/src/cn.ts` (already exists with `clsx` + `tailwind-merge`)

The `components.json` this generates controls where `shadcn add` puts components.

### Step 2: Install the full component set

From `packages/ui`:

```bash
npx shadcn@latest add sidebar
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add switch
npx shadcn@latest add textarea
npx shadcn@latest add dropdown-menu
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add separator
npx shadcn@latest add avatar
npx shadcn@latest add tooltip
npx shadcn@latest add command
npx shadcn@latest add breadcrumb
npx shadcn@latest add collapsible
npx shadcn@latest add skeleton
npx shadcn@latest add scroll-area
```

The `sidebar` component brings in additional Radix deps automatically (`@radix-ui/react-tooltip`, `@radix-ui/react-slot`, etc.). The `command` component brings in `cmdk` for the command palette.

Also install lucide-react in packages/ui:
```bash
pnpm add lucide-react
```

### Step 3: Update `packages/ui/package.json` exports

After shadcn drops components into `packages/ui/src/components/ui/`, update the exports map:

```json
{
  "exports": {
    "./button": "./src/components/ui/button.tsx",
    "./card": "./src/components/ui/card.tsx",
    "./input": "./src/components/ui/input.tsx",
    "./label": "./src/components/ui/label.tsx",
    "./badge": "./src/components/ui/badge.tsx",
    "./dialog": "./src/components/ui/dialog.tsx",
    "./sheet": "./src/components/ui/sheet.tsx",
    "./separator": "./src/components/ui/separator.tsx",
    "./avatar": "./src/components/ui/avatar.tsx",
    "./tooltip": "./src/components/ui/tooltip.tsx",
    "./command": "./src/components/ui/command.tsx",
    "./breadcrumb": "./src/components/ui/breadcrumb.tsx",
    "./skeleton": "./src/components/ui/skeleton.tsx",
    "./scroll-area": "./src/components/ui/scroll-area.tsx",
    "./sidebar": "./src/components/ui/sidebar.tsx",
    "./collapsible": "./src/components/ui/collapsible.tsx",
    "./switch": "./src/components/ui/switch.tsx",
    "./textarea": "./src/components/ui/textarea.tsx",
    "./dropdown-menu": "./src/components/ui/dropdown-menu.tsx",
    "./cn": "./src/cn.ts",
    "./globals.css": "./src/globals.css",
    "./admin": "./src/admin/index.ts",
    "./admin/sidebar": "./src/admin/AppSidebar.tsx",
    "./admin/top-bar": "./src/admin/layout/TopBar.tsx",
    "./admin/page-header": "./src/admin/layout/PageHeader.tsx",
    "./admin/theme-toggle": "./src/admin/theme/ThemeToggle.tsx"
  }
}
```

---

## Component Replacement Guide

### 1. Update `NavItem` type and icon mapping

**`packages/lib/src/config/dashboardConfig.ts`** — Change the icon field type:

```typescript
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon?: LucideIcon;           // ← Changed from string to LucideIcon
  requiredPlan?: "starter" | "growth" | "pro";
  requiredRole?: DashboardRole[];
  featureFlag?: string;
};
```

Update the nav item definitions to use Lucide icons:

```typescript
import {
  LayoutDashboard,
  Globe,
  CreditCard,
  Image,
  FileText,
  Settings,
  Users,
} from "lucide-react";

export const SUPER_ADMIN_CONFIG: DashboardConfig = {
  navItems: [
    { id: "overview",       label: "Overview",       href: "/admin",                icon: LayoutDashboard },
    { id: "tenants",        label: "Tenants",        href: "/admin/tenants",        icon: Globe },
    { id: "subscriptions",  label: "Subscriptions",  href: "/admin/subscriptions",  icon: CreditCard },
    { id: "media",          label: "Media",          href: "/admin/media",          icon: Image },
    { id: "pages",          label: "Pages",          href: "/admin/pages",          icon: FileText },
  ],
  // ... rest unchanged
};

export const TENANT_ADMIN_CONFIG: DashboardConfig = {
  navItems: [
    { id: "dashboard", label: "Dashboard", href: "/admin",          icon: LayoutDashboard },
    { id: "media",     label: "Media",     href: "/admin/media",    icon: Image },
    { id: "pages",     label: "Pages",     href: "/admin/pages",    icon: FileText },
    { id: "settings",  label: "Settings",  href: "/admin/settings", icon: Settings },
  ],
  // ... rest unchanged
};
```

---

### 2. Build the new `AppSidebar.tsx`

**`packages/ui/src/admin/AppSidebar.tsx`** — New file replacing `AdminSidebar.tsx`:

This component takes the same props the current `AdminSidebar` receives from `admin/layout.tsx` and renders using shadcn's `Sidebar` component tree. Key contract:

```typescript
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
} from "../components/ui/sidebar";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@repo/lib/config/dashboardConfig";

interface AppSidebarProps {
  navItems: NavItem[];
  bottomNavItems?: NavItem[];
  header: { title: string; subtitle?: string; initial?: string };
  userEmail: string;
  userName?: string;
  signOutHref: string;
  siteUrl?: string;
  isSuperAdmin?: boolean;
}

export function AppSidebar({ navItems, header, userEmail, signOutHref, siteUrl, isSuperAdmin }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* Brand / logo area — links to public site if siteUrl provided */}
        {siteUrl ? (
          <a href={siteUrl} target="_blank" rel="noopener noreferrer">
            <div className="flex items-center gap-2 px-2 py-1">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                  {header.initial ?? header.title.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{header.title}</span>
                {header.subtitle && (
                  <span className="truncate text-xs text-muted-foreground">{header.subtitle}</span>
                )}
              </div>
            </div>
          </a>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                {header.initial ?? header.title.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{header.title}</span>
              {header.subtitle && (
                <span className="truncate text-xs text-muted-foreground">{header.subtitle}</span>
              )}
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.id === "dashboard" || item.id === "overview"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        {Icon && <Icon />}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {/* User dropdown with sign-out */}
        <SidebarMenu>
          <SidebarMenuItem>
            {/* User avatar button → dropdown with sign-out */}
            {/* Use shadcn DropdownMenu pattern from shadcn-admin reference */}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
```

Reference the shadcn-admin repo at https://github.com/satnaing/shadcn-admin for the exact footer user dropdown pattern — it uses `DropdownMenu` inside `SidebarMenuButton` for the user avatar/email/sign-out. Adapt to use `href={signOutHref}` for sign-out (Next.js Link, not a button click, since the current sign-out is a route).

---

### 3. Delete old `TopBar.tsx` and fold its functionality into Shell

**`packages/ui/src/admin/layout/TopBar.tsx`** — DELETE THIS FILE

After migration, the header bar (sidebar trigger + user area) is rendered inline in Shell.tsx's header. TopBar.tsx is no longer needed.

---

### 4. Build the new Admin Shell layout

**`packages/ui/src/admin/layout/Shell.tsx`** — New layout wrapping `SidebarProvider`:

```typescript
"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "../../components/ui/sidebar";
import { Separator } from "../../components/ui/separator";
import { AppSidebar } from "../AppSidebar";
import type { NavItem } from "@repo/lib/config/dashboardConfig";

interface ShellProps {
  navItems: NavItem[];
  bottomNavItems?: NavItem[];
  header: { title: string; subtitle?: string; initial?: string };
  userEmail: string;
  userName?: string;
  signOutHref: string;
  siteUrl?: string;
  isSuperAdmin?: boolean;
  children: React.ReactNode;
  // These props from old Shell are deprecated — TopBar is now inline
  topBarSearchPlaceholder?: string;
  topBarOnSearch?: (query: string) => void;
  newItemLabel?: string;
  newItemHref?: string;
}

export function Shell({ navItems, ...props }: ShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar navItems={navItems} {...props} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {/* Breadcrumb / page title slot — rendered by child pages via PageHeader */}
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">
          {props.children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
```

---

### 5. Replace `CreateModal` and `EditModal`

These are imported by `Resource<T>` from `@repo/ui/admin`. The prop contract must remain stable.

**Current contract** (from `Resource/index.tsx` usage):
```typescript
<CreateModal
  open={showCreateModal}
  onClose={() => setShowCreateModal(false)}
  title={`Create ${title}`}
  onSubmit={handleCreate}
  isSubmitting={isCreating}
>
  {/* FieldRenderer children */}
</CreateModal>

<EditModal
  open={!!editingRow}
  onClose={() => setEditingRow(null)}
  title={`Edit ${title}`}
  onSubmit={handleUpdate}
  isSubmitting={isUpdating}
>
  {/* FieldRenderer children */}
</EditModal>
```

**New implementation** using shadcn `Dialog`:

```typescript
// packages/ui/src/admin/modals/CreateModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: () => void;
  isSubmitting: boolean;
  children: React.ReactNode;
}

export function CreateModal({ open, onClose, title, onSubmit, isSubmitting, children }: CreateModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">{children}</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

`EditModal` is identical — only the submit button label changes to "Save Changes".

---

### 6. Replace `PageHeader`

**Current contract** (used in Resource and admin pages):
```typescript
<PageHeader title="Tenants" subtitle="12 records" action={<Button>+ Add</Button>} />
```

**New implementation** using shadcn `Breadcrumb` + heading:
```typescript
// packages/ui/src/admin/layout/PageHeader.tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumb?: Array<{ label: string; href?: string }>;
}

export function PageHeader({ title, subtitle, action, breadcrumb }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        {breadcrumb && (
          <Breadcrumb className="mb-1">
            <BreadcrumbList>
              {breadcrumb.map((crumb, i) => (
                <BreadcrumbItem key={i}>
                  {crumb.href ? (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbList>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
```

---

### 7. Update `packages/ui/src/admin/index.ts` barrel export

```typescript
// Layout
export { Shell } from "./layout/Shell";
export { Sidebar } from "../../components/ui/sidebar"; // re-export for any direct consumers
export { PageHeader } from "./layout/PageHeader";
export { TopBar } from "./layout/TopBar";
export type { NavItem } from "@repo/lib/config/dashboardConfig";

// Theme
export { ThemeToggle } from "./theme/ThemeToggle";

// Modals
export { CreateModal } from "./modals/CreateModal";
export { EditModal } from "./modals/EditModal";

// App Sidebar (new)
export { AppSidebar } from "./AppSidebar";
```

---

### 8. Update CSS variables in `packages/ui/src/globals.css`

The file already has shadcn-compatible CSS variables. Two things to do:

1. **Add missing shadcn/ui sidebar variables** to the `:root` and `.dark` blocks. The shadcn sidebar component needs these:
```css
:root {
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 240 5.3% 26.1%;
  --sidebar-primary: 240 5.9% 10%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 240 4.8% 95.9%;
  --sidebar-accent-foreground: 240 5.9% 10%;
  --sidebar-border: 220 13% 91%;
  --sidebar-ring: 217.2 91.2% 59.8%;
}

.dark {
  --sidebar-background: 224 55% 8%;     /* matches --admin-surface */
  --sidebar-foreground: 226 100% 93%;
  --sidebar-primary: 239 100% 82%;      /* matches --primary in dark */
  --sidebar-primary-foreground: 248 100% 32%;
  --sidebar-accent: 224 40% 15%;
  --sidebar-accent-foreground: 226 100% 93%;
  --sidebar-border: 224 18% 30%;        /* matches --admin-border */
  --sidebar-ring: 239 100% 82%;
}
```

2. **Keep all existing `--admin-*` tokens** — they are used by admin pages that are not being replaced.

---

### 10. Update `apps/web/src/app/admin/layout.tsx`

The server component currently imports `AdminSidebar` from `@repo/ui/admin/sidebar`. After migration, it still imports from the same path but receives the new `AppSidebar` (which is exported from the admin/sidebar path via the updated package.json exports).

**Key changes:**
1. Import `getTenantNavItems` from `@repo/lib/config/dashboardConfig`
2. Fetch feature flags for tenant (if using provisioning mode filtering)
3. Call `getTenantNavItems()` to filter nav items by provisioning mode
4. No other structural changes — same auth logic, same `AdminClientWrapper` wrapping

**Exact code changes:**

At the top of the file, add this import:
```typescript
import { getTenantNavItems } from "@repo/lib/config/dashboardConfig";
```

**In the Tenant Admin section**, replace this:
```typescript
const navItems: NavItem[] = TENANT_ADMIN_CONFIG.navItems.map((item) => ({
  label: item.label,
  href: item.href,
  icon: item.icon,
  id: item.id,
}));
```

With this:
```typescript
// Fetch feature flags for the tenant (used by getTenantNavItems for filtering)
const { data: flags } = await supabase
  .from("feature_flags")
  .select("flag_name")
  .eq("tenant_id", activeTenant.id)
  .eq("enabled", true);

const featureFlagsMap = (flags ?? []).reduce(
  (acc, f) => {
    acc[f.flag_name] = true;
    return acc;
  },
  {} as Record<string, boolean>
);

// Build nav items filtered by provisioning mode
const navItems: NavItem[] = getTenantNavItems(
  activeTenant.provisioning_mode ?? "free",
  featureFlagsMap
);
```

The rest of the `AdminSidebar` call stays exactly the same.

**For Super Admin blocks** (both the platform domain and tenant subdomain cases for platform admins):
- No change needed — these continue to use `SUPER_ADMIN_CONFIG.navItems` directly, which do not need provisioning mode filtering

---

### 10. Update `apps/web/src/app/admin/AdminClientWrapper.tsx`

Add `CommandPalette` mount. The component is simple; just add the import and mount it.:

**Before:**
```typescript
"use client";

import { RefineProvider } from "./_providers/refine";
import { TenantAdminContext } from "@/components/admin";

interface AdminClientWrapperProps {
  children: React.ReactNode;
  tenantId?: number | null;
}

export function AdminClientWrapper({ children, tenantId = null }: AdminClientWrapperProps) {
  return (
    <TenantAdminContext.Provider value={{ tenantId }}>
      <RefineProvider>{children}</RefineProvider>
    </TenantAdminContext.Provider>
  );
}
```

**After:**
```typescript
"use client";

import { RefineProvider } from "./_providers/refine";
import { TenantAdminContext } from "@/components/admin";
import { CommandPalette } from "@/components/admin/CommandPalette";

interface AdminClientWrapperProps {
  children: React.ReactNode;
  tenantId?: number | null;
}

export function AdminClientWrapper({ children, tenantId = null }: AdminClientWrapperProps) {
  return (
    <TenantAdminContext.Provider value={{ tenantId }}>
      <RefineProvider>
        <CommandPalette />
        {children}
      </RefineProvider>
    </TenantAdminContext.Provider>
  );
}
```

---

### 11. Replace the `Resource<T>` internal table with shadcn Table

The `Resource` component renders a `<table>` currently using Tailwind utility classes directly. Optionally (this can be done in a follow-up), replace the table markup with shadcn's `Table` component:

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/table";
```

This is **optional for the initial migration** — the table will render fine with existing Tailwind classes. Prioritize it if the table appearance needs improvement.

---

### 12. Build `apps/web/src/components/admin/CommandPalette.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@repo/ui/command";
import { useTenantAdmin } from "@/components/admin";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { tenantId } = useTenantAdmin();
  const isSuper = tenantId === null;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/admin")}>Dashboard</CommandItem>
          {isSuper && (
            <CommandItem onSelect={() => navigate("/admin/tenants")}>
              Tenants
            </CommandItem>
          )}
          <CommandItem onSelect={() => navigate("/admin/pages")}>Pages</CommandItem>
          <CommandItem onSelect={() => navigate("/admin/media")}>Media</CommandItem>
          {isSuper && (
            <CommandItem onSelect={() => navigate("/admin/subscriptions")}>
              Subscriptions
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

---

## Dashboard Page Replacement

The current `/admin/page.tsx` renders `DashboardLayout` with `MetricCard` and `MetricChart` (using chart.js). Replace this with shadcn/ui card and chart components.

### Current dashboard component location
`apps/web/src/components/admin/dashboard/DashboardLayout.tsx` — renders modules (cards + charts)
`apps/web/src/components/admin/dashboard/MetricCard.tsx` — individual metric card component
`apps/web/src/components/admin/dashboard/MetricChart.tsx` — chart using react-chartjs-2

### Replacement approach

**Step 1: Replace MetricChart with shadcn's chart component (wraps Recharts):**
```bash
cd packages/ui
npx shadcn@latest add chart
```

Then install Recharts in apps/web:
```bash
cd apps/web
pnpm add recharts
```

**Step 2: Update `apps/web/src/components/admin/dashboard/MetricChart.tsx`**

Current: Uses `chart.js` + `react-chartjs-2` with raw canvas rendering
New: Use `recharts` + shadcn chart primitives

```typescript
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { ChartContainer, ChartLegend, ChartTooltip } from "@repo/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DashboardChartProps } from "./DashboardLayout";

// Generate randomized chart data for different metric types
function generateChartData(metric: DashboardChartProps["metric"], period: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return months.map((month) => ({
    month,
    value: Math.floor(Math.random() * 100),
  }));
}

export function MetricChart({ metric, type, period = "6m", title, height = 300 }: DashboardChartProps) {
  const data = generateChartData(metric, period);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title || metric}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            value: {
              label: metric,
              color: "hsl(var(--primary))",
            },
          }}
          className="h-[300px]" style={{ height: `${height}px` }}
        >
          {type === "line" ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Update `apps/web/src/components/admin/dashboard/MetricCard.tsx`**

Use shadcn `Card` composition:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import type { MetricCardProps } from "./DashboardLayout";

export function MetricCard({ context, title }: MetricCardProps) {
  // Placeholder data — in real implementation, these would be dynamic based on context
  const stats = {
    tenants: { value: 42, trend: 12 },
    subscriptions: { value: 128, trend: 8 },
  };

  const stat = context === "tenants" ? stats.tenants : stats.subscriptions;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title || context}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stat.value}</div>
        <p className="text-xs text-muted-foreground">
          {stat.trend > 0 ? "+" : ""}{stat.trend}% from last period
        </p>
      </CardContent>
    </Card>
  );
}
```

**Step 4: Remove old dependencies**

After all MetricChart replacements are complete:
```bash
cd apps/web
pnpm remove chart.js react-chartjs-2
```

---

## Complete Icon Imports for Lucide

In `packages/lib/src/config/dashboardConfig.ts`, add this import block at the top:

```typescript
import {
  LayoutDashboard,   // dashboard / home
  Globe,             // tenants / domain
  CreditCard,        // subscriptions / payments
  Image,             // media
  FileText,          // pages / articles
  Settings,          // settings
  Users,             // users / members (future)
  Palette,           // branding (future)
  Layout,            // layout editor (future)
  BarChart3,         // analytics (future)
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
```

---

## Mode-Aware Admin UI (Provisioning System Integration)

This is critical: the admin UI must adapt based on tenant `provisioning_mode` and feature flags. This is not new functionality — it is the existing `useTenantAdmin()` + feature flag pattern extended through the new shadcn shell.

### How it works after migration (unchanged logic, new UI)

The `filterConfigByPermissions()` function in `dashboardConfig.ts` already filters nav items by feature flag. After migration, the same function drives which nav items appear in the new `AppSidebar`.

**`packages/lib/src/config/dashboardConfig.ts`** — `filterConfigByPermissions()` is called in `admin/layout.tsx` before passing navItems to the sidebar. This remains unchanged.

### Mode-specific nav sets (driven from DB)

Add this helper to `packages/lib/src/config/dashboardConfig.ts`:

```typescript
export function getTenantNavItems(
  provisioningMode?: "ai_locked" | "template" | "free" | null,
  featureFlags?: Record<string, boolean>
): NavItem[] {
  const base = TENANT_ADMIN_CONFIG.navItems;
  const flags = featureFlags ?? {};

  // If no provisioning mode info available, return full filtered nav
  if (!provisioningMode) {
    return filterConfigByPermissions(TENANT_ADMIN_CONFIG, "pro", flags).navItems;
  }

  if (provisioningMode === "ai_locked") {
    // Mode A: read-only, minimal nav \u2014 only dashboard
    return base.filter(item => ["dashboard"].includes(item.id));
  }

  if (provisioningMode === "template") {
    // Mode B: limited editing \u2014 dashboard + media + pages
    return base.filter(item => ["dashboard", "media", "pages"].includes(item.id));
  }

  // Mode C (\"free\"): full access, filter by feature flags
  return filterConfigByPermissions(TENANT_ADMIN_CONFIG, \"pro\", flags).navItems;
}
```\n\nThis function is called in `admin/layout.tsx` when building tenant admin nav items (see the \"Update admin/layout.tsx\" section above for exact usage).\n\n### Future nav items (added as provisioning features are built)\n\nThese items will be added to `TENANT_ADMIN_CONFIG.navItems` behind feature flags:\n```typescript\n{ id: \"branding\",  label: \"Branding\",  href: \"/admin/branding\",  icon: Palette,    featureFlag: \"can_edit_branding\" },\n{ id: \"layout\",    label: \"Layout\",    href: \"/admin/layout\",    icon: Layout,     featureFlag: \"can_edit_layout\" },\n{ id: \"analytics\", label: \"Analytics\", href: \"/admin/analytics\", icon: BarChart3,  featureFlag: \"analytics\" },\n```\n\nWhen added, they automatically appear in tenant admin sidebars if the tenant has the feature flag enabled."

---

## Why `Resource<T>` Is Not Replaced by shadcn's Data Table

This is an important architectural decision worth stating explicitly so future agents don't undo it.

### What shadcn/ui's Data Table actually is

shadcn/ui provides a "Data Table" block (https://ui.shadcn.com/docs/components/data-table) that combines:
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` — styled HTML table components
- TanStack Table (`@tanstack/react-table`) — column management, client-side sorting, client-side filtering, client-side pagination

**That's it.** shadcn's data table is a display component. It has no data fetching, no mutations, no modals, no form generation, no side panels.

### What `Resource<T>` actually does

`Resource<T>` is not a table. It is a **full-stack CRUD orchestration layer** that happens to include a table in its output. Specifically:

| Responsibility | Powered by | If removed, you lose |
|---|---|---|
| Server-side pagination | Refine `useTable` | Real pagination against Supabase |
| Server-side sorting | Refine `useTable` + `setSorters` | Sorting hits the DB, not just the loaded page |
| Server-side search/filter | Refine `setFilters` | Filter queries hit Supabase via PostgREST |
| URL sync for page/filters | Refine `syncWithLocation` | Browser back/forward breaks pagination state |
| Create mutations | Refine `useCreate` | Have to wire per-page |
| Update mutations | Refine `useUpdate` | Have to wire per-page |
| Delete mutations | Refine `useDelete` + `onDeleteRow` | Have to wire per-page |
| Join table read/write | `JoinDef[]` + `splitFormData()` | Subscriptions join on tenants would break |
| Auto-generated forms | `FieldDef[]` + `FieldRenderer` | Every admin page needs its own form markup |
| Form state management | `formData` + `setField` | Have to manage per-page |
| `transformValues` | Pre-save hook | Data transformation before Supabase write |

### The cost of full replacement

If you deleted `Resource<T>` and used raw shadcn data table + manual Refine hooks in each admin page, every page would grow from ~60 lines of config to ~400–600 lines of imperative code — and you'd be writing the same boilerplate six times (tenants, pages, media, subscriptions, and any future resource). That is the opposite of the "database drives everything, no per-resource code" principle.

### The correct approach: upgrade internals, keep external API

The `Resource<T>` component's external API (all its props: `resource`, `columns`, `createFields`, `FieldDef`, `ColumnDef`, `sidePanel`, etc.) stays **100% identical**. No admin page files change.

What changes is that the internal rendering switches from raw HTML + custom Tailwind classes to shadcn/ui primitives:

| Before | After |
|---|---|
| `<table className="w-full text-sm">` | `<Table>` |
| `<thead className="border-b bg-muted/50">` | `<TableHeader>` |
| `<th className="px-4 py-3 ...">` | `<TableHead>` |
| `<tbody>` | `<TableBody>` |
| `<tr className="border-b hover:bg-muted/50">` | `<TableRow>` |
| `<td className="px-4 py-3">` | `<TableCell>` |
| `<button className="rounded-lg bg-blue-600 ...">` | `<Button>` |
| `<input type="text" className="...">` | `<Input>` |
| `<span class="material-symbols-outlined">refresh</span>` | `<RefreshCw />` (Lucide) |
| `<button className="... text-destructive">Delete</button>` | `<Button variant="ghost" size="sm">` |

The Refine hooks (`useTable`, `useCreate`, `useUpdate`, `useDelete`), all the state management, pagination logic, sort handlers, search handlers, join logic — none of it changes. Only the JSX markup swaps to shadcn components.

This is done by adding these imports at the top of `Resource/index.tsx`:
```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/table";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { RefreshCw } from "lucide-react";
```

Then replacing the corresponding JSX tags one-for-one. The result: `Resource<T>` looks polished, uses the design system, and every admin page automatically inherits the upgrade with zero changes.

---

## `SidePanel` Component Update

The `Resource<T>` component has a side panel (`apps/web/src/components/admin/Resource/SidePanel.tsx`) that slides in from the right to show record details. Currently implemented as a custom positioned div.

Replace with shadcn `Sheet`:

```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@repo/ui/sheet";

// SidePanel.tsx — replace custom implementation with Sheet
export function SidePanel<T>({ row, config, onClose }: SidePanelProps<T>) {
  const widthClass = {
    sm: "w-[380px]",
    md: "w-[480px]",
    lg: "w-[640px]",
  }[config.width ?? "md"];

  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={widthClass} side="right">
        <SheetHeader>
          <SheetTitle>{config.title}</SheetTitle>
          {config.subtitle && (
            <SheetDescription>
              {typeof config.subtitle === "function" ? config.subtitle(row!) : config.subtitle}
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="mt-4">
          {row && config.view(row)}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## `SkeletonRows` Update

The `Resource<T>` skeleton loading state uses custom gray divs. Replace with shadcn `Skeleton`:

```typescript
import { Skeleton } from "@repo/ui/skeleton";

export function SkeletonRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: columns }).map((_, j) => (
        <td key={j} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  ));
}
```

---

## `FieldRenderer` Component Updates

`apps/web/src/components/admin/Resource/FieldRenderer.tsx` renders form fields in create/edit modals. Update all field types to use shadcn primitives:

```typescript
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { Switch } from "@repo/ui/switch";
// Select → use shadcn select component (add: npx shadcn@latest add select)
```

The `FieldDef` type contract in `Resource/types.ts` is unchanged — only the rendering implementation updates.

---

## `ConfirmDialog` Update

`apps/web/src/components/admin/Resource/ConfirmDialog.tsx` — replace custom modal with shadcn `AlertDialog`:

```bash
cd packages/ui
npx shadcn@latest add alert-dialog
```

```typescript
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@repo/ui/alert-dialog";
```

---

## Folder Structure After Migration

```
packages/ui/src/
  components/
    ui/                           ← shadcn-generated components (owned by us)
      sidebar.tsx
      button.tsx
      card.tsx
      badge.tsx
      input.tsx
      label.tsx
      switch.tsx
      textarea.tsx
      dropdown-menu.tsx
      dialog.tsx
      sheet.tsx
      command.tsx
      breadcrumb.tsx
      skeleton.tsx
      scroll-area.tsx
      separator.tsx
      avatar.tsx
      tooltip.tsx
      collapsible.tsx
      chart.tsx
      alert-dialog.tsx
      select.tsx
      table.tsx
  admin/
    AppSidebar.tsx                ← NEW: replaces AdminSidebar.tsx
    index.ts                      ← updated barrel export
    layout/
      Shell.tsx                   ← REPLACED: SidebarProvider layout
      TopBar.tsx                  ← SIMPLIFIED: just SidebarTrigger + user area
      PageHeader.tsx              ← REPLACED: Breadcrumb + heading
      Sidebar.tsx                 ← DELETED (functionality moved to AppSidebar.tsx)
    modals/
      CreateModal.tsx             ← REPLACED: uses Dialog
      EditModal.tsx               ← REPLACED: uses Dialog
    theme/
      ThemeToggle.tsx             ← UNCHANGED
  cn.ts                           ← UNCHANGED
  globals.css                     ← UPDATED: add sidebar CSS variables

apps/web/src/components/admin/
  Resource/
    index.tsx                     ← INTERNAL UPGRADE: raw HTML table → shadcn Table + Button + Input
    types.ts                      ← UNCHANGED (ColumnDef, FieldDef, ResourceProps — all identical)
    cells.tsx                     ← UNCHANGED
    SidePanel.tsx                 ← UPDATED: uses Sheet instead of custom div
    SkeletonRows.tsx              ← UPDATED: uses Skeleton
    FieldRenderer.tsx             ← UPDATED: uses shadcn Input/Label/Textarea/Select
    ConfirmDialog.tsx             ← UPDATED: uses AlertDialog
  dashboard/
    DashboardLayout.tsx           ← UPDATED: uses Card + new chart component
    MetricCard.tsx                ← REPLACED: uses Card
    MetricChart.tsx               ← REPLACED: uses shadcn Chart (Recharts)
  CommandPalette.tsx              ← NEW: ⌘K global search
  tenants/                        ← UNCHANGED
  media/                          ← UNCHANGED
```

---

## Implementation Order (for the agent session)

Execute in this sequence to always have a working state:

1. **`shadcn init` in packages/ui** — sets up tooling
2. **`shadcn add` all components** — drops files into src/components/ui/
3. **Update packages/ui/package.json exports** — wire up the new paths
4. **Update globals.css** — add sidebar CSS variables, keep admin tokens
5. **Update dashboardConfig.ts NavItem type** — string → LucideIcon
6. **Build AppSidebar.tsx** — new sidebar using shadcn primitives
7. **Rebuild Shell.tsx** — SidebarProvider layout
8. **Rebuild CreateModal + EditModal** — Dialog replacements
9. **Rebuild PageHeader** — Breadcrumb + heading
10. **Update admin/index.ts barrel** — wire all exports
11. **Update SidePanel.tsx** — Sheet replacement
12. **Update SkeletonRows.tsx** — Skeleton replacement
13. **Update FieldRenderer.tsx** — shadcn form primitives
14. **Update ConfirmDialog.tsx** — AlertDialog replacement
15. **Upgrade `Resource/index.tsx` internals** — replace raw HTML table/button/input with shadcn Table, Button, Input (Refine hooks and all props stay identical)
16. **Update admin/layout.tsx** — replace TENANT_ADMIN_CONFIG.navItems with getTenantNavItems() call
17. **Update admin/AdminClientWrapper.tsx** — add CommandPalette import and mount
18. **Create CommandPalette.tsx** — new command palette component
19. **Replace dashboard components** — MetricCard and MetricChart using Card + Recharts
16. **Build CommandPalette** — add to AdminClientWrapper
17. **Replace MetricCard + MetricChart** — shadcn Card + Chart (Recharts)
18. **Build getTenantNavItems()** — mode-aware nav helper
20. **Run `pnpm build`** — verify no TypeScript errors across the monorepo
21. **Delete old custom files** — Sidebar.tsx (old), AdminSidebar.tsx (old), TopBar.tsx (old), chart.js/react-chartjs-2

---

## Invariants to Verify After Migration

Run through this checklist before calling the migration complete:

- [ ] Super admin: all 5 nav items visible, active state correct on each route
- [ ] Tenant admin: 4 nav items visible, scoped correctly
- [ ] Sidebar collapses on mobile to icon-only mode
- [ ] `⌘K` opens command palette from any admin page
- [ ] Dark/light toggle still works
- [ ] `Resource<T>` create modal opens, form submits, row appears in table
- [ ] `Resource<T>` edit modal opens pre-filled, update works
- [ ] `Resource<T>` delete confirm dialog works
- [ ] `Resource<T>` side panel slides in from right on row click
- [ ] `/admin/tenants` — super admin view, read-only
- [ ] `/admin/pages` — tenant admin view, full CRUD
- [ ] `/admin/media` — upload works, images display
- [ ] Auth redirect still works (unauthenticated → /admin/login)
- [ ] Public tenant site rendering (apps/web/src/app/[slug]/) is completely unaffected
- [ ] `pnpm build` produces zero TypeScript errors

---

## Connection to AI Provisioning System

The provisioning system (see AI_PROVISIONING_SYSTEM.md) feeds data into the admin UI in two ways:

### 1. Mode-aware nav (reads `provisioning_mode` from DB at page load)
`admin/layout.tsx` will call `getTenantNavItems(tenant.provisioning_mode, featureFlags)` to build the nav array passed to `AppSidebar`. The sidebar renders whatever nav it receives — it has no opinion about modes.

### 2. Future admin routes (provisioning UI)
As the provisioning pipeline is built, new nav items come online via feature flags:
- `BrandingEditor` page → `/admin/branding` — behind `can_edit_branding` flag
- `PageLayoutBuilder` page → `/admin/layout` — behind `can_edit_layout` flag
- Provisioning control panel → `/admin/provision` — super admin only

These are added to `dashboardConfig.ts` navItems with their `featureFlag` property. The sidebar filters them automatically via `filterConfigByPermissions()`.

### 3. `Resource<T>` receives `canCreate`/`canEdit`/`canDelete` from provisioning mode
This is already implemented in the current system. After migration, these props still flow from the admin page components through `Resource<T>` to the shadcn Dialog/Button components. Nothing changes here — the new UI primitives just look better.

---

## What This Does NOT Change

Repeat for absolute clarity — the following are never touched during this migration:

- Supabase schema, migrations, RLS policies
- All API routes (`/api/admin/*`, `/api/pages/*`, etc.)
- Refine data provider setup
- Session/auth/middleware logic
- Public tenant site renderer (`[slug]/page.tsx`)
- BLOCK_REGISTRY and zone renderer in packages/template
- Provisioning pipeline in packages/lib/src/provisioner
- TenantAdminContext and useTenantAdmin hook
- Any admin page `page.tsx` files (tenants, pages, media, subscriptions)
- The `Resource<T>` component's **external API** — all props (`resource`, `columns`, `createFields`, `FieldDef`, `ColumnDef`, `sidePanel`, `filters`, `joins`, `transformValues`, etc.) are identical. Only its internal JSX rendering is upgraded.

---

## Reference Links

- shadcn/ui sidebar docs: https://ui.shadcn.com/docs/components/sidebar
- shadcn/ui blocks (dashboard layouts): https://ui.shadcn.com/blocks
- shadcn-admin visual reference: https://shadcn-admin.netlify.app/
- shadcn-admin source (layout patterns): https://github.com/satnaing/shadcn-admin
- Lucide icon search: https://lucide.dev/icons/
