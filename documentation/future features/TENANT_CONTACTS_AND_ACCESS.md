# Tenant Contacts & Access — Implementation Plan

## Overview

Every tenant gets a unified **contact directory** — a single `customers` table that holds anyone associated with their business: end customers, members, loyalty card holders, and internal staff/users. Each contact can optionally be linked to a Supabase Auth account, giving them a login.

Tenants control what each contact can access through two mechanisms:
1. **Role-based access** — a `role` field on the contact row gates which parts of the admin area they can use
2. **Page-level visibility** — each page can be restricted to specific roles (public, members, staff, managers)

Everything is managed from the tenant's own admin area. There is no platform-level involvement after setup.

---

## Core Concepts

| Concept | Description |
|---|---|
| **Customer** | Anyone the tenant tracks — loyalty card holders, clients, subscribers |
| **Staff/User** | An employee or collaborator who needs admin area access |
| **Contact** | The umbrella term — customers and staff live in the same `customers` table |
| **Portal login** | Optional Supabase Auth account linked to a contact record |
| **Page visibility** | Per-page setting controlling who can see that page |

The key design decision: **one table, not two**. A person who is both a loyalty customer and a staff member has one row — the `type` and `role` fields describe their relationship.

---

## Feature Availability

| Feature | Plans |
|---|---|
| Contacts directory (customers table) | All plans |
| Staff roles + admin area access levels | All plans |
| Customer portal login (`/portal`) | `growth`, `pro` |
| Page-level visibility controls | `growth`, `pro` |
| Fine-grained per-resource permissions | `pro` |

Feature flag key for portal login: `customer_portal`

---

## Database Schema

### `customers`

The single contact directory per tenant.

```sql
create table public.customers (
  id           serial primary key,
  tenant_id    integer not null references public.tenants(id) on delete cascade,

  -- Identity
  name         text not null,
  email        text,
  phone        text,

  -- Type distinguishes the nature of the relationship
  type         text not null default 'customer',
  -- 'customer'  = end customer / loyalty card holder / member
  -- 'staff'     = employee or collaborator with admin area access
  -- 'member'    = registered user with portal access but not admin

  -- Role gates access levels within their type
  role         text not null default 'viewer',
  -- 'viewer'   = read-only portal access (for customers/members)
  -- 'member'   = portal access + loyalty card management
  -- 'staff'    = limited admin access (no billing, no settings)
  -- 'manager'  = full tenant admin except billing
  -- 'admin'    = full tenant admin including settings (for staff only)

  -- Metadata
  notes          text,
  tags           text[] not null default '{}',
  custom_fields  jsonb not null default '{}',
  -- free-form key/value pairs set by the tenant per use case

  -- Status
  is_active     boolean not null default true,
  opted_in      boolean,            -- null = not asked, true = consented, false = declined
  opted_in_at   timestamptz,

  -- Loyalty link (set automatically when loyalty card is created for this contact)
  has_loyalty_card boolean not null default false,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index on public.customers(tenant_id);
create index on public.customers(email, tenant_id);
create unique index on public.customers(tenant_id, email) where email is not null;
```

### `customer_auth_links`

Connects a contact row to a Supabase Auth user account. Created when a contact accepts an invitation or signs up via the portal.

```sql
create table public.customer_auth_links (
  id           serial primary key,
  customer_id  integer not null references public.customers(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique(customer_id),
  unique(user_id)
);
```

One `auth.users` row can only be linked to one contact. If someone is a customer at multiple tenants, they have one auth account but one `customers` row per tenant, each linked via separate `customer_auth_links` rows.

### Page visibility (extend `pages` table)

```sql
alter table public.pages
  add column visibility text not null default 'public';
  -- 'public'   = anyone can view
  -- 'members'  = must be logged-in contact with role >= 'member'
  -- 'staff'    = must have role 'staff', 'manager', or 'admin'
  -- 'managers' = must have role 'manager' or 'admin'
```

### `tenant_permissions`

Fine-grained per-resource permissions for specific contacts. Supplements the role-based system.

```sql
create table public.tenant_permissions (
  id             serial primary key,
  tenant_id      integer not null references public.tenants(id) on delete cascade,
  customer_id    integer not null references public.customers(id) on delete cascade,
  resource_type  text not null,
  -- 'page' | 'section' | 'feature'
  resource_id    text not null,
  -- page slug, section id, or feature key
  can_view       boolean not null default false,
  can_edit       boolean not null default false,
  created_at     timestamptz not null default now(),
  unique(customer_id, resource_type, resource_id)
);
```

This table allows exceptions to the role rules. For example, give a `viewer`-role customer access to one specific members-only page, or restrict a `staff` user from seeing a sensitive admin section.

---

## Invitation & Registration Flow

### Sending an invite (tenant admin)

1. Tenant opens `/admin/contacts`, finds or creates a contact row
2. Clicks "Send Invite" → fills in email (pre-filled from contact), role, optional message
3. Server calls `POST /api/admin/contacts/[id]/invite`
4. Server generates a Supabase Auth invite link via `supabase.auth.admin.inviteUserByEmail()`
5. Resend delivers the email with the invite link and a branded template
6. Contact clicks link → lands on `/{tenantSlug}/portal/accept-invite`
7. Sets their password → Supabase Auth creates the `auth.users` row
8. Server creates a `customer_auth_links` row linking `auth.users.id` → `customers.id`

### Self-registration (optional, per-campaign setting)

Some campaigns (e.g. loyalty enrollment) can be configured to auto-create a portal account. When the loyalty enrollment form is submitted:

1. `POST /api/loyalty/enroll/[campaignId]` creates a `customers` row
2. If `campaign.auto_create_portal_account = true`, a magic-link sign-up is triggered
3. Welcome email sent via Resend with the portal link
4. On first visit, customer sets their password

---

## Customer Portal

### Route

```
/{tenantSlug}/portal
```

This is a **tenant-specific authenticated area** on the public site. Not the platform admin.

### Pages within the portal

```
/portal                  ← dashboard: welcome, loyalty cards, account summary
/portal/loyalty          ← view active loyalty cards, stamp history
/portal/account          ← edit profile, change password, manage consent
/portal/[pageSlug]       ← any page the tenant has set to 'members' visibility
```

### Auth flow for portal

The portal uses Supabase Auth server-side sessions. On each request:

1. Middleware resolves the tenant from hostname
2. Checks `auth.users` session via cookie
3. Looks up `customer_auth_links` → `customers` for this tenant
4. Injects `currentCustomer` into request headers / RSC context
5. For `visibility: 'members'` pages: requires `role IN ('member', 'staff', 'manager', 'admin')`
6. For `visibility: 'staff'` pages: requires `role IN ('staff', 'manager', 'admin')`
7. For `visibility: 'managers'` pages: requires `role IN ('manager', 'admin')`
8. `tenant_permissions` overrides can grant or deny access beyond the role check

### Portal vs admin area

| Area | URL | Who |
|---|---|---|
| Platform admin | `/admin` | Platform owner |
| Tenant admin | `{domain}/admin` | Tenant `memberships` (existing system) |
| Customer portal | `{domain}/portal` | Customers/staff with `customer_auth_links` |

These are three separate auth contexts. A platform admin session does not grant portal access, and vice versa.

---

## Staff Admin Access

Staff contacts (type: `staff`) can log into the tenant admin area — not the customer portal. The existing `memberships` table handles admin-level invites. The `customers` table is for the portal/loyalty side.

To give someone admin area access: create a `memberships` row (existing flow).
To give someone portal access: create a `customers` row + send invite.

A person can have both: one `memberships` row (for admin) + one `customers` row (for portal/loyalty).

This is intentional. The two systems serve different purposes and have different RLS contexts.

---

## Admin UI Pages

### `/admin/contacts` — contact directory

The main contacts management page. Standard `DataView` pattern.

**Columns:** Name, Email, Phone, Type badge, Role badge, Loyalty card status, Portal access (linked/not), Created.

**Filter bar:** Search by name/email, filter by Type, filter by Role, filter by Portal access status.

**Row actions:**
- Edit (CrudModal with tabs: Basic → Notes & Tags → Custom Fields → Permissions)
- Send Invite (if no `customer_auth_links` row yet)
- Resend Invite (if invite already sent)
- Revoke Portal Access (removes `customer_auth_links` row)
- Delete contact

**Top actions:** "New Contact" button, CSV import, CSV export.

### CrudModal tabs

**Basic tab:**
- Name, Email, Phone
- Type (customer / staff / member)
- Role (viewer / member / staff / manager / admin)
- Active toggle

**Notes & Tags tab:**
- Rich text notes field
- Tag input (comma-separated, stored as `text[]`)
- Opted-in consent status

**Custom Fields tab:**
- Dynamic key-value pairs
- Tenant can define field labels in settings

**Permissions tab** (growth/pro):
- Table of page-level overrides
- Toggle can_view / can_edit per page

### Settings: Contact fields

`/admin/settings/contacts`

Tenant can define:
- Custom field labels (shown in the CrudModal custom fields tab)
- Default role for new portal registrations
- Whether self-registration is allowed
- Portal welcome message

---

## Middleware Integration

The existing `middleware.ts` resolves tenant from hostname. Extend it with portal session handling:

```typescript
// After tenant resolution, for /portal routes:
if (pathname.startsWith('/portal')) {
  const session = await getCustomerSession(request, tenantId);
  if (!session && pathname !== '/portal/login') {
    return NextResponse.redirect(new URL('/portal/login', request.url));
  }
  // Check page visibility for /portal/[pageSlug] routes
  if (session && isPageRoute) {
    const allowed = await checkPageVisibility(pageSlug, session.customer, tenantId);
    if (!allowed) return NextResponse.redirect(new URL('/portal', request.url));
  }
}
```

---

## Loyalty Integration

When a customer enrolls in a loyalty campaign:

```typescript
// In enroll.ts
async function enrollCustomer(campaignId, formData, tenantId, client) {
  // 1. Find or create customers row
  const customer = await findOrCreateCustomer({
    tenantId,
    email: formData.email,
    name: formData.name,
    phone: formData.phone,
  }, client);

  // 2. Create loyalty_cards row with customer_id
  const card = await createLoyaltyCard({ campaignId, customerId: customer.id, tenantId }, client);

  // 3. Update has_loyalty_card flag on customer
  await client.from('customers').update({ has_loyalty_card: true }).eq('id', customer.id);

  // 4. Generate pass URLs
  return { card, applePassUrl, googleSaveUrl };
}
```

This ensures every loyalty card holder automatically appears in the tenant's contacts directory.

---

## Database Migrations

```
supabase/migrations/
  0029_create_customers.sql              [NEW]
  0030_create_customer_auth_links.sql    [NEW]
  0031_add_page_visibility.sql           [NEW]
  0032_create_tenant_permissions.sql     [NEW]
  0033_contacts_rls_policies.sql         [NEW]
```

### RLS summary

- `customers`: tenant members (via `memberships`) can read/write all contacts for their tenant
- `customer_auth_links`: linked user can read their own row; tenant members can manage all
- `tenant_permissions`: tenant members read/write; linked customer can read their own

---

## File Checklist

```
supabase/migrations/
  0029_create_customers.sql              [NEW]
  0030_create_customer_auth_links.sql    [NEW]
  0031_add_page_visibility.sql           [NEW]
  0032_create_tenant_permissions.sql     [NEW]
  0033_contacts_rls_policies.sql         [NEW]

packages/lib/src/stripe/plans.ts         [MODIFY] — add 'customer_portal' feature
packages/lib/src/supabase/types.ts       [MODIFY] — add customers + related tables
packages/lib/src/config/dashboardConfig.ts [MODIFY] — add Contacts nav item

apps/web/src/app/api/admin/contacts/
  route.ts                               [NEW] — list + create
  [id]/route.ts                          [NEW] — get + update + delete
  [id]/invite/route.ts                   [NEW] — send/resend invite

apps/web/src/app/admin/contacts/
  page.tsx                               [NEW] — contacts DataView page

apps/web/src/app/[slug]/portal/
  layout.tsx                             [NEW] — portal shell (minimal, no admin sidebar)
  page.tsx                               [NEW] — portal dashboard
  login/page.tsx                         [NEW] — portal sign-in page
  accept-invite/page.tsx                 [NEW] — password set after invite
  loyalty/page.tsx                       [NEW] — customer's loyalty cards
  account/page.tsx                       [NEW] — profile + password management
  [pageSlug]/page.tsx                    [NEW] — visibility-gated public pages

apps/web/src/middleware.ts               [MODIFY] — add portal session + visibility checks
```
