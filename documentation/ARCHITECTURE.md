# Multisite SaaS Platform - Architecture & Development Guidelines

## Quick Context
This is a **full SaaS website builder platform** (like lightweight Webflow/Squarespace), not just a website. It includes multi-tenant architecture, admin systems, billing, and a page/section/block content engine.

---

## 🏗️ System Architecture

### Technology Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Refine.js (data/state management)

**Backend & Database:**
- Supabase (PostgreSQL + Auth + RLS + Storage)

**Infrastructure:**
- Vercel (hosting)
- Cloudflare (DNS/domains)
- Stripe (billing)
- Resend (email)

### Monorepo Structure
```
/apps/web                  → main app (sites + admin)
/packages/ui               → shared UI components
/packages/template         → page/section/block renderer
/packages/lib              → core logic (auth, tenant, config)
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
- `tenant.com/admin` → tenant admin (tenant-scoped)
- `tenant.com` → public site

---

## 🧩 Component Organization & Reusability

### Folder Structure
```
/components/
  ├── admin/
  │   ├── tenants/              (feature folder)
  │   │   ├── TenantAdminContext.tsx
  │   │   ├── TenantFlagsView.tsx
  │   │   └── index.ts           (barrel export)
  │   ├── media/                (feature folder)
  │   │   ├── MediaUploadInput.tsx
  │   │   └── index.ts
  │   ├── pages/                (future - feature folder)
  │   ├── Resource/             (shared component)
  │   │   ├── index.tsx
  │   │   ├── types.ts
  │   │   ├── cells.tsx
  │   │   ├── SidePanel.tsx
  │   │   └── ...
  │   └── index.ts              (barrel export)
  └── site/
      ├── SiteNav.tsx
      └── ...
```

### Component Philosophy

**✅ DO:**
- Use Refine.js for data/state logic (useTable, useCreate, etc.)
- Write lean UI layer in React + Tailwind (no Material-UI, no bloat)
- Favor composition: pass props for config
- One concern per file: separate data, render, style
- Extract to `/packages/ui` or `/packages/lib` only if shared
- Use barrel exports (index.ts) for folder imports

**❌ DON'T:**
- Hardcode behavior in components
- Create unnecessary wrapper/Cell functions
- Call Supabase directly from components
- Over-engineer simple features
- Build complex custom state when Resource can handle it

---

## 📊 Resource Component - The Universal CRUD Pattern

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
/api/admin/media/upload/route.ts
/api/admin/tenants/route.ts
/api/admin/plans/route.ts
/api/admin/metrics/...
```

### Pattern: Public/tenant APIs use browser client (RLS enforced)
```
/api/pages/[id]/route.ts
/api/media/[id]/route.ts
/api/feature-flags/route.ts
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

## 📚 Example Features

### Tenants
- ✅ Full CRUD (add, edit delete tenants)
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

### Subscriptions
- ⚠️ Read-only (managed via Stripe webhooks)
- ✅ Displays tenant subscription info

---

## 🔗 Related Files

- `packages/lib/src/tenant/resolver.ts` - get tenants by user_id
- `packages/lib/src/tenant/platform.ts` - check if platform admin
- `packages/lib/src/tenant/context.ts` - TenantAdminContext provider
- `apps/web/src/app/admin/AdminClientWrapper.tsx` - context provider wrapper
- `apps/web/src/components/admin/tenants/TenantAdminContext.tsx` - context hook
- `supabase/migrations/0012_create_rls_policies.sql` - RLS policy definitions

---

## 🚦 Debugging Tips

### Upload issues
- Check `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars
- Ensure admin client can access storage (service role required)
- Routes auto-create buckets on first upload

### Permission issues
- RLS policies in Supabase console
- Verify user has `memberships` record for tenant
- Check if platform admin role exists

### Component issues
- Unique column keys (use `metadata_type` not `metadata` twice)
- `tenantId` from context (null = super admin, number = tenant)
- Verify typeScript `Record<string, unknown>` interface extends
