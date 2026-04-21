# Library & Shared Code Instructions

**Scope:** `packages/lib/**`

Use this guide when working on Supabase clients, utilities, configuration, tenant logic, feature flags, and shared code.

---

## 📋 Mandatory Reading

**Before modifying library code, read:**
1. [ARCHITECTURE.md](../../documentation/ARCHITECTURE.md) — System design and data flow
2. [CONFIG_DRIVEN_PAGES.md](../../documentation/CONFIG_DRIVEN_PAGES.md) — Feature flags, page templates

**Feature-Specific Reading (when working on these areas):**
- [BOOKING_SYSTEM.md](../../documentation/BOOKING_SYSTEM.md) — When working with `resend/booking-emails`, email templates, or booking-related utilities

---

## 🎯 Critical Rules

### Rule 1: All Exports Go Through `src/index.ts`

**ALWAYS export from the root index file, never import scattered files.**

```typescript
// ✅ DO THIS
import { getSupabaseAdminClient, getTenantContext } from "@multisite/lib";

// ❌ DON'T DO THIS
import { getSupabaseAdminClient } from "@multisite/lib/src/supabase/admin";
import { getTenantContext } from "@multisite/lib/src/tenant/context";
```

**Why:** Centralized exports make it easy to refactor internals without breaking imports across the project.

### Rule 2: Types Are Auto-Generated

**Never hand-edit `lib/supabase/types.ts`**

After any database schema change:
```bash
pnpm run db:types
```

This regenerates TypeScript definitions from your Supabase schema. Always commit the updated types.

```typescript
// ✅ Use auto-generated types
import type { Database } from "@multisite/lib/supabase/types";

type Page = Database["public"]["Tables"]["pages"]["Row"];

// ❌ Never write your own type definitions for DB tables
type PageManual = {
  id: string;
  title: string;
  // ... (wrong, will get out of sync)
};
```

---

### Rule 3: Supabase Clients Have Different Powers

#### Admin Client (Bypasses RLS)
```typescript
import { getSupabaseAdminClient } from "@multisite/lib";

const client = getSupabaseAdminClient();
// Use in: Server components, API routes, scripts
// Can read/write ANY tenant's data (super admin only)
// Bypasses Row-Level Security entirely
```

#### Browser Client (RLS-Enforced)
```typescript
import { getSupabaseClient } from "@multisite/lib";

const client = getSupabaseClient();
// Use in: Client components, browser context
// Only sees data for current logged-in user's tenant (RLS)
// Safe to use in public-facing code
```

#### Server-Side Client (Hybrid)
```typescript
import { getSupabaseServerClient } from "@multisite/lib";

const client = getSupabaseServerClient();
// Use in: Server components, Server actions
// Can bypass RLS if service_role key is used
// Better for middleware/auth flows
```

**Rule:** Always use the least-powerful client for the job.

---

### Rule 4: Tenant Resolution & Context

```typescript
import { getTenantContext, resolveTenant } from "@multisite/lib";

// In server components or API routes
const tenantContext = await getTenantContext();
// Returns: { tenantId, userId, isAdmin, role }

// For custom hostname resolution
const tenant = await resolveTenant({ hostname: "example.com" });
// Returns: { id, slug, domain, custom_domain }
```

**Rule:** Always verify tenant ID before querying or modifying data. RLS helps, but explicit checks add defense-in-depth.

---

### Rule 5: Feature Flags Must Match Database

When checking feature flags, always verify they exist in the database.

```typescript
// Check flag
const { data: hasUpload } = await checkFeatureFlag(
  tenantId, 
  "media_upload"
);

// Get all flags for tenant
const { data: flags } = await getAllFlags(tenantId);
// Returns: { feature_key: true/false } object

// Flag keys must match columns in `feature_flags` table
// (defined in CONFIG_DRIVEN_PAGES.md)
```

**Important:** Feature flags are two-tier:
1. Plan default (Starter, Growth, Pro)
2. Per-tenant override (wins over plan default)

Check actual database before using a flag.

---

### Rule 6: Stripe Integration is Centralized

```typescript
import { getStripeClient, STRIPE_PLANS } from "@multisite/lib";

const stripe = getStripeClient();

// STRIPE_PLANS defines 3-tier structure
// Starter: 5 pages, 100MB storage
// Growth: 25 pages, 1GB storage
// Pro: unlimited
```

**Rule:** All Stripe calls go through `stripe/client.ts`. Don't use raw Stripe SDK.

---

## 📦 Module Organization

```
packages/lib/src/
├── index.ts                          # ← CENTRAL EXPORT POINT
├── supabase/
│   ├── admin.ts                      # getSupabaseAdminClient()
│   ├── browser.ts                    # getSupabaseClient()
│   ├── server.ts                     # getSupabaseServerClient()
│   └── types.ts                      # AUTO-GENERATED (never edit)
├── tenant/
│   ├── context.ts                    # getTenantContext()
│   ├── resolver.ts                   # resolveTenant()
│   └── provisioning.ts               # createTenant()
├── flags/
│   ├── check.ts                      # checkFeatureFlag()
│   └── defaults.ts                   # Feature flag plan defaults
├── stripe/
│   ├── client.ts                     # getStripeClient()
│   └── plans.ts                      # STRIPE_PLANS config
├── media/
│   ├── resolve.ts                    # Media URL resolution
│   └── blocks.ts                     # Media block helpers
├── config/
│   ├── dashboard.ts                  # Admin dashboard navigation
│   ├── page-templates.ts             # 12 pre-built page templates
│   ├── block-registry.ts             # 27 block type definitions
│   └── stitch-block-map.ts          # Stitch ↔ Internal block mapping
├── domain.ts                         # Domain/hostname utilities
├── logger.ts                         # Logging service
└── ratelimit.ts                      # Rate limiting
```

---

## 🔧 Key Utility Functions

### Supabase Clients
```typescript
import {
  getSupabaseAdminClient,    // Bypasses RLS
  getSupabaseClient,         // Browser client (RLS)
  getSupabaseServerClient    // Server-side hybrid
} from "@multisite/lib";
```

### Tenant Management
```typescript
import {
  getTenantContext,         // Get current tenant + user info
  resolveTenant,            // Lookup tenant by domain
  getOrCreateTenant,        // Provision new tenant
  deleteTenant              // Soft delete
} from "@multisite/lib";
```

### Feature Flags
```typescript
import {
  checkFeatureFlag,         // Check single flag
  getAllFlags,              // Get all tenant flags
  FEATURE_FLAG_DEFAULTS     // Plan defaults
} from "@multisite/lib";
```

### Billing
```typescript
import {
  getStripeClient,          // Stripe SDK instance
  STRIPE_PLANS,             // 3-tier plan definitions
  getPlanFeatures           // Get features for plan
} from "@multisite/lib";
```

### Media
```typescript
import {
  resolveMediaUrl,          // Get signed URL for file
  getPageMedia,             // Media for page + usage type
  associateMediaToPage      // Create page association
} from "@multisite/lib";
```

### Configuration
```typescript
import {
  DASHBOARD_CONFIG,         // Admin sidebar navigation
  PAGE_TEMPLATES,           // 12 pre-built templates
  BLOCK_REGISTRY,           // Block type definitions
  STITCH_BLOCK_MAP          // Puck ↔ Internal mapping
} from "@multisite/lib";
```

---

## 🚫 Anti-Patterns (NEVER Do These)

| Anti-Pattern | Why | Fix |
|---|---|---|
| Hand-edit `types.ts` | Types auto-generated, changes lost | Run `pnpm run db:types` |
| Import from `supabase/admin.ts` directly | Breaks centralization | Import from `@multisite/lib` |
| Use browser client in server | Leaks credentials | Use admin client in server code |
| Check flags without DB | Out of sync with reality | Query `feature_flags` table first |
| Hardcode plan limits | Can't change without code | Use `STRIPE_PLANS` constant |
| Skip `getTenantContext()` | Tenant isolation breaks | Always call it first |
| Cache media URLs | Signed URLs expire | Resolve fresh each request |

---

## 🔄 Common Tasks

### Query Data in Server Component
```typescript
import { getSupabaseAdminClient } from "@multisite/lib";

const client = getSupabaseAdminClient();
const { data: pages } = await client
  .from("pages")
  .select("*")
  .eq("tenant_id", tenantId);
```

### Check Feature Flag
```typescript
import { checkFeatureFlag } from "@multisite/lib";

const { data: hasMediaUpload } = await checkFeatureFlag(
  tenantId,
  "media_upload"
);

if (!hasMediaUpload) {
  return { error: "Feature not enabled for your plan" };
}
```

### Get Current Tenant Info
```typescript
import { getTenantContext } from "@multisite/lib";

const { tenantId, userId, role } = await getTenantContext();
```

### Create Stripe Checkout
```typescript
import { getStripeClient, STRIPE_PLANS } from "@multisite/lib";

const stripe = getStripeClient();
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price: STRIPE_PLANS.Growth.price_id,
    quantity: 1,
  }],
  mode: "subscription",
  success_url: "...",
});
```

### Resolve Media URL
```typescript
import { resolveMediaUrl } from "@multisite/lib";

const signedUrl = await resolveMediaUrl(mediaId);
// Use for <img src={signedUrl} />
```

---

## 📋 Checklist: Modifying Library Code

- [ ] Changes are in `packages/lib/src/`
- [ ] Export is added to `packages/lib/src/index.ts`
- [ ] If DB schema changed: ran `pnpm run db:types`
- [ ] If types changed: updated all usages
- [ ] Types are imported from `@multisite/lib` (not `types.ts` directly)
- [ ] Ran `pnpm lint` and fixed warnings
- [ ] Ran `pnpm build` and verified no errors
- [ ] Updated imports in `apps/web` if breaking changes

---

## 📚 Related Documentation

- [ARCHITECTURE.md](../../documentation/ARCHITECTURE.md) — System design
- [CONFIG_DRIVEN_PAGES.md](../../documentation/CONFIG_DRIVEN_PAGES.md) — Feature flags, templates
