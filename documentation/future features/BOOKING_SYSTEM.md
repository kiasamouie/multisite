# Booking System — Full Implementation Guide

**Feature:** Multi-Tenant Appointment & Reservation System  
**Status:** Planned  
**Complexity:** Medium-High (~8–9 hours)  
**Design Reference:** Stitch project `11681557974546401399`, screen `442794afa7fd40b1bee82a5d7b33ae45` ("Book a Table - Sleek Redesign")  
**Design Image:** `documentation/designs/bibi-booking-design.png`

---

## Overview

A **business-agnostic booking block** that works for any service-based tenant on the platform. The block is fully configurable via Puck fields so the same component serves radically different businesses:

| Business Type | Puck Config | CTA Label |
|---|---|---|
| Restaurant | `showPartySize: true`, `availableTimes: [...]` | "Book a Table" |
| Barber / Salon | `showPartySize: false` | "Book Appointment" |
| Spa / Clinic | `showPartySize: false`, extra notes prompt | "Book Session" |
| Gym / Fitness Class | `showPartySize: true` (seats) | "Reserve a Spot" |
| Consultant / Lawyer | `showPartySize: false`, minimal times | "Schedule a Call" |

Everything visual — headline, subtitle, CTA text, time slots, address, contact — is driven by Puck editor fields. No code changes required to adapt to a new business type.

---

## Plan Tier Gating

Booking is a **Growth+ feature**. It must be added to the `PLANS` config in `packages/lib/src/stripe/plans.ts` and seeded into `feature_flag_defaults`.

| Feature Key | Starter | Growth | Pro |
|---|---|---|---|
| `booking_system` | ✗ | ✅ | ✅ |
| `booking_reminders` | ✗ | ✗ | ✅ |

- `booking_system` — unlocks the `booking_block` in Puck and the `/admin/bookings` page
- `booking_reminders` — reserved for a future cron-based 24h-before reminder email (not in this build, see Out of Scope)

Tenants on Starter who encounter the block (e.g. via a shared template) should see a disabled state with an upgrade prompt, not an error.

---

## Architecture

```
Public Site (booking_block)
  └─ POST /api/bookings
       ├─ Validate (Zod)
       ├─ Check hasFlag(tenant_id, "booking_system")
       ├─ Insert into bookings table
       ├─ Send bookingConfirmationEmail → customer (Resend)
       └─ Send bookingAlertEmail → tenant owner (Resend)

Admin Dashboard (/admin/bookings)
  └─ GET/PATCH/DELETE /api/admin/bookings
       ├─ Super Admin: all tenants
       └─ Tenant Admin: filtered by tenant_id
```

---

## Phase 1 — Database Migration

**File to create:** `supabase/migrations/0027_create_bookings.sql`

```sql
-- Create bookings table
CREATE TABLE public.bookings (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      integer not null references public.tenants(id) on delete cascade,

  -- Customer Identity
  customer_name  text not null,
  customer_email text not null,
  customer_phone text,

  -- Booking Details
  booking_date   date not null,
  booking_time   time not null,
  party_size     integer not null default 1,
  service_label  text,  -- Free text: "Haircut", "Table for 2", "Consultation" etc.
  special_notes  text,

  -- Status Management
  -- Values: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'noshow'
  status         text not null default 'pending',

  -- Metadata
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- Performance index for admin date filtering
CREATE INDEX bookings_tenant_date_idx ON public.bookings (tenant_id, booking_date);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Tenant members can read and manage their own bookings
CREATE POLICY "Tenant members can manage bookings"
  ON public.bookings FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.memberships WHERE user_id = auth.uid()
    )
  );

-- Platform admins can see everything
CREATE POLICY "Platform admins can manage all bookings"
  ON public.bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
    )
  );

-- Public can insert (the booking form on the public site)
CREATE POLICY "Public can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (true);
```

**After running migration:**
```bash
pnpm run db:migrate
pnpm run db:types
```

---

## Phase 2 — Feature Flag Wiring

### 2a. Seed feature flag defaults

**File to create:** `supabase/migrations/0028_add_booking_feature_flags.sql`

```sql
-- booking_system: Growth + Pro only
INSERT INTO public.feature_flag_defaults (plan, key, enabled) VALUES
  ('starter', 'booking_system',   false),
  ('growth',  'booking_system',   true),
  ('pro',     'booking_system',   true);

-- booking_reminders: Pro only (reserved for future cron build)
INSERT INTO public.feature_flag_defaults (plan, key, enabled) VALUES
  ('starter', 'booking_reminders', false),
  ('growth',  'booking_reminders', false),
  ('pro',     'booking_reminders', true);
```

### 2b. Update plan features array

**File to edit:** `packages/lib/src/stripe/plans.ts`

Add `"booking_system"` to the `growth` features array and both `"booking_system"` and `"booking_reminders"` to the `pro` features array:

```typescript
// growth.features — add:
"booking_system",

// pro.features — add:
"booking_system",
"booking_reminders",
```

After this, `hasFlag(tenantId, "booking_system")` from `@repo/lib/flags/check` returns correctly for all tiers automatically — no other flag plumbing needed.

---

## Phase 3 — Notification Emails (Resend)

**File to edit:** `packages/lib/src/resend/templates.ts`

Add two new exported functions following the existing pattern (note: the file uses an `escapeHtml` helper already defined there):

### 3a. Customer Confirmation Email

```typescript
interface BookingConfirmationEmailData {
  customerName: string;
  businessName: string;
  bookingDate: string;       // e.g. "Saturday, 19 April 2026"
  bookingTime: string;       // e.g. "19:15"
  partySize: number;
  serviceLabel?: string;     // e.g. "Haircut", "Table for 2"
  specialNotes?: string;
  adminUrl: string;          // link to cancel/contact page
}

export function bookingConfirmationEmail(data: BookingConfirmationEmailData): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Booking Confirmed — ${escapeHtml(data.businessName)}</h2>
      <p>Hi ${escapeHtml(data.customerName)}, your booking is confirmed.</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold;">Date</td><td>${escapeHtml(data.bookingDate)}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Time</td><td>${escapeHtml(data.bookingTime)}</td></tr>
        ${data.partySize > 1 ? `<tr><td style="padding: 8px; font-weight: bold;">Party Size</td><td>${data.partySize}</td></tr>` : ""}
        ${data.serviceLabel ? `<tr><td style="padding: 8px; font-weight: bold;">Service</td><td>${escapeHtml(data.serviceLabel)}</td></tr>` : ""}
        ${data.specialNotes ? `<tr><td style="padding: 8px; font-weight: bold;">Notes</td><td>${escapeHtml(data.specialNotes)}</td></tr>` : ""}
      </table>
      <p style="color: #666; font-size: 14px;">
        Need to cancel? Please contact us at least 24 hours before your booking.
      </p>
    </div>
  `;
}
```

### 3b. Business Owner Alert Email

```typescript
interface BookingAlertEmailData {
  businessName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
  serviceLabel?: string;
  specialNotes?: string;
  adminBookingsUrl: string;  // direct link to /admin/bookings
}

export function bookingAlertEmail(data: BookingAlertEmailData): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Booking — ${escapeHtml(data.businessName)}</h2>
      <p>A new booking has been submitted and is awaiting confirmation.</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold;">Customer</td><td>${escapeHtml(data.customerName)}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Email</td><td>${escapeHtml(data.customerEmail)}</td></tr>
        ${data.customerPhone ? `<tr><td style="padding: 8px; font-weight: bold;">Phone</td><td>${escapeHtml(data.customerPhone)}</td></tr>` : ""}
        <tr><td style="padding: 8px; font-weight: bold;">Date</td><td>${escapeHtml(data.bookingDate)}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Time</td><td>${escapeHtml(data.bookingTime)}</td></tr>
        ${data.partySize > 1 ? `<tr><td style="padding: 8px; font-weight: bold;">Party / Group Size</td><td>${data.partySize}</td></tr>` : ""}
        ${data.serviceLabel ? `<tr><td style="padding: 8px; font-weight: bold;">Service</td><td>${escapeHtml(data.serviceLabel)}</td></tr>` : ""}
        ${data.specialNotes ? `<tr><td style="padding: 8px; font-weight: bold;">Notes</td><td>${escapeHtml(data.specialNotes)}</td></tr>` : ""}
      </table>
      <p>
        <a href="${escapeHtml(data.adminBookingsUrl)}" style="background: #1a1a1a; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          View in Admin →
        </a>
      </p>
    </div>
  `;
}
```

### How the owner email address is resolved

In the API route, fetch the tenant owner's email via a join — the `memberships` table has `user_id` + `tenant_id`. Use the Supabase admin client to get the `auth.users` email for the first member. Pattern:

```typescript
const { data: membership } = await supabaseAdmin
  .from("memberships")
  .select("user_id")
  .eq("tenant_id", tenantId)
  .order("created_at", { ascending: true })
  .limit(1)
  .single();

const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(membership.user_id);
const ownerEmail = user.email;
```

---

## Phase 4 — Public API Route

**File to create:** `apps/web/src/app/api/bookings/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@repo/lib/supabase/admin";
import { hasFlag } from "@repo/lib/flags/check";
import { getResend } from "@repo/lib/resend/client";
import { bookingConfirmationEmail, bookingAlertEmail } from "@repo/lib/resend/templates";

const BookingSchema = z.object({
  tenant_id: z.number().int().positive(),
  customer_name: z.string().min(1).max(200),
  customer_email: z.string().email(),
  customer_phone: z.string().max(50).optional(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),  // YYYY-MM-DD
  booking_time: z.string().regex(/^\d{2}:\d{2}$/),          // HH:MM
  party_size: z.number().int().min(1).max(100).default(1),
  service_label: z.string().max(200).optional(),
  special_notes: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = BookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking data", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const supabase = getSupabaseAdminClient();

  // Check feature flag — reject if tenant not on correct plan
  const allowed = await hasFlag(data.tenant_id, "booking_system");
  if (!allowed) {
    return NextResponse.json({ error: "Booking system not available on this plan" }, { status: 403 });
  }

  // Insert booking
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert(data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }

  // Fire-and-forget emails (do not await — don't block response on email delivery)
  sendNotificationEmails(data, booking.id, supabase).catch(() => {});

  return NextResponse.json({ success: true, bookingId: booking.id }, { status: 201 });
}

async function sendNotificationEmails(data: z.infer<typeof BookingSchema>, bookingId: string, supabase: ReturnType<typeof getSupabaseAdminClient>) {
  // Get tenant name + owner email
  const { data: tenant } = await supabase.from("tenants").select("name, slug").eq("id", data.tenant_id).single();
  const { data: membership } = await supabase.from("memberships").select("user_id").eq("tenant_id", data.tenant_id).order("created_at", { ascending: true }).limit(1).single();
  const { data: { user } } = await supabase.auth.admin.getUserById(membership.user_id);

  const resend = getResend();
  const formattedDate = new Date(data.booking_date).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const adminUrl = `https://${tenant.slug}.yourdomain.com/admin/bookings`;

  // Customer confirmation
  await resend.emails.send({
    from: "bookings@yourdomain.com",  // replace with RESEND_FROM_EMAIL env var
    to: data.customer_email,
    subject: `Booking Confirmed — ${tenant.name}`,
    html: bookingConfirmationEmail({
      customerName: data.customer_name,
      businessName: tenant.name,
      bookingDate: formattedDate,
      bookingTime: data.booking_time,
      partySize: data.party_size,
      serviceLabel: data.service_label,
      specialNotes: data.special_notes,
      adminUrl,
    }),
  });

  // Owner alert
  if (user?.email) {
    await resend.emails.send({
      from: "bookings@yourdomain.com",
      to: user.email,
      subject: `New Booking from ${data.customer_name} — ${formattedDate}`,
      html: bookingAlertEmail({
        businessName: tenant.name,
        customerName: data.customer_name,
        customerEmail: data.customer_email,
        customerPhone: data.customer_phone,
        bookingDate: formattedDate,
        bookingTime: data.booking_time,
        partySize: data.party_size,
        serviceLabel: data.service_label,
        specialNotes: data.special_notes,
        adminBookingsUrl: adminUrl,
      }),
    });
  }
}
```

**Important:** Replace `yourdomain.com` with a reference to `process.env.NEXT_PUBLIC_APP_DOMAIN` or similar. Add `RESEND_FROM_EMAIL` as an env variable.

---

## Phase 5 — Admin API Route

**File to create:** `apps/web/src/app/api/admin/bookings/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@repo/lib/supabase/admin";

const UpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed", "noshow"]).optional(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  booking_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId");
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const search = searchParams.get("search");

  const supabase = getSupabaseAdminClient();
  let query = supabase.from("bookings").select("*").order("booking_date", { ascending: false });

  if (tenantId) query = query.eq("tenant_id", parseInt(tenantId));
  if (status) query = query.eq("status", status);
  if (date) query = query.eq("booking_date", date);
  if (search) query = query.or(`customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { id, ...updates } = parsed.data;
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("bookings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

---

## Phase 6 — The Booking Block

### 6a. Block Component

**File to create:** `packages/template/src/blocks/BookingBlock.tsx`

The design (see `bibi-booking-design.png`) is a **full-width split layout**:
- **Left column (~55%):** Decorative / brand panel
  - Large ambient food/service image (full bleed)
  - Overlaid headline + subtitle
  - Location label + address text
  - Contact info (phone + email)
- **Right column (~45%):** Booking form panel
  - Section label: "Secure your journey" (or configurable)
  - Party size stepper row (hidden when `showPartySize: false`)
  - Date input
  - Time slot grid — pill buttons per time (from `availableTimes` array)
  - Full Name, Email, Phone inputs
  - Special Notes textarea
  - Submit button → POST `/api/bookings`
  - Trust badges row: "Secure" + "Atmospheric" (configurable)
  - Cancel policy note below button

Key implementation notes:
- Block receives `tenantId` as a prop (injected by the Puck renderer from page context — see how other blocks receive tenant data)
- All form state is local `useState` — no external form libraries
- On submit: validate client-side before fetch, then `POST /api/bookings`
- Show inline success message with booking reference number on success
- Show inline error message on failure — never redirect
- Tailwind v4 syntax: always `w-[var(--spacing-x)]`, never `w-[--spacing-x]`
- Colour palette uses CSS variables, not hardcoded colours:
  - Background: `var(--color-background)` / `var(--color-card)`
  - Text: `var(--color-foreground)`
  - Accent: `var(--color-primary)` for selected time slots and CTA

### 6b. Puck Fields & Defaults

**File to edit:** `apps/web/src/lib/puck/config.tsx`

Add to `BLOCK_FIELDS`:

```typescript
booking_block: {
  title:           { type: "text" },
  subtitle:        { type: "textarea" },
  sectionLabel:    { type: "text" },       // "Secure your journey"
  buttonText:      { type: "text" },
  cancelPolicy:    { type: "text" },
  showPartySize:   { type: "radio", options: [{ label: "Yes", value: "true" }, { label: "No", value: "false" }] },
  availableTimes:  { type: "array", arrayFields: { time: { type: "text" } } },
  address:         { type: "text" },
  phone:           { type: "text" },
  contactEmail:    { type: "text" },
  backgroundImageUrl: { type: "text" },    // ambient left-column image URL
},
```

Add to `BLOCK_DEFAULTS`:

```typescript
booking_block: {
  title:           "An Invitation to Our Table.",
  subtitle:        "Experience the soul of our kitchen. Family recipes through fire and tradition.",
  sectionLabel:    "Secure your journey",
  buttonText:      "Confirm Reservation",
  cancelPolicy:    "By confirming, you agree to our 24-hour cancellation policy.",
  showPartySize:   "true",
  availableTimes:  [
    { time: "18:00" }, { time: "18:30" }, { time: "19:15" },
    { time: "20:00" }, { time: "20:30" }, { time: "21:00" }, { time: "21:45" },
  ],
  address:         "124 West End Lane, London NW6 2LS",
  phone:           "+44 (0) 20 7431 0101",
  contactEmail:    "hello@yourbusiness.co.uk",
  backgroundImageUrl: "",
},
```

### 6c. Block Registry Entry

**File to edit:** `packages/template/src/blocks/registry.ts`

Add to the registry:

```typescript
booking_block: {
  label: "Booking / Reservations",
  category: "business",
  description: "Let customers book appointments or reserve tables directly on your site. Works for restaurants, barbers, salons, and more.",
  featureFlag: "booking_system",
  render: BookingBlock,
},
```

Import at top of file:
```typescript
import { BookingBlock } from "./BookingBlock";
```

---

## Phase 7 — Admin Management Page

**File to create:** `apps/web/src/app/admin/bookings/page.tsx`

Following the **Inline Rule** strictly — all logic lives in this single file.

```typescript
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/admin";
import { DataView } from "@/components/admin";
import { CrudModal } from "@/components/admin";
import { StatusBadge } from "@repo/ui/components";
import { useToast } from "@/components/ui";
import { useSupabaseList } from "@/hooks/useSupabase";
import { useTenantAdmin } from "@/hooks/useTenantAdmin"; // get current tenant scope

// Types (generated after running pnpm run db:types)
type BookingRecord = {
  id: string;
  tenant_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  booking_date: string;
  booking_time: string;
  party_size: number;
  service_label: string | null;
  special_notes: string | null;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "noshow";
  created_at: string;
};
```

**Columns:**

| Column | Field | Notes |
|---|---|---|
| Customer | `customer_name` + `customer_email` (sub-text) | Stacked |
| Service | `service_label` | Falls back to "—" |
| Date | `booking_date` | Formatted `dd/mm/yyyy` |
| Time | `booking_time` | Plain HH:MM |
| Party | `party_size` | Hidden when 1 |
| Status | `status` | `<StatusBadge />` with colour map |

**Status badge colour map:**

```typescript
const STATUS_VARIANTS = {
  pending:   "warning",
  confirmed: "success",
  cancelled: "destructive",
  completed: "default",
  noshow:    "secondary",
};
```

**Filters:**
- Text search: `customer_name` + `customer_email` (OR ilike)
- Status dropdown: all / pending / confirmed / cancelled / completed / noshow
- Date picker: filter by `booking_date`

**Modals:**

- `viewModal`: Show all fields — name, email, phone, service, date, time, party size, notes, status badge, created timestamp
- `editModal`: Update `status` (select), `booking_date` (date input), `booking_time` (select from common times)

**Dual-scope logic:**

```typescript
const { tenantId } = useTenantAdmin();
const isSuper = tenantId === null;

const filters = isSuper
  ? []
  : [{ field: "tenant_id", operator: "eq", value: tenantId }];

const { items, isLoading, refetch } = useSupabaseList<BookingRecord>("bookings", {
  filters,
  orderBy: { field: "booking_date", direction: "desc" },
});
```

---

## Phase 8 — Admin Sidebar Nav Entry

**File to edit:** `packages/lib/src/config/dashboardConfig.ts`

In `TENANT_ADMIN_CONFIG.navItems`, add after the `pages` entry:

```typescript
{
  id: "bookings",
  label: "Bookings",
  href: "/admin/bookings",
  icon: "calendar-check",
  featureFlag: "booking_system",
  requiredPlan: "growth",
},
```

The existing `filterConfigByPermissions` helper already handles `featureFlag` and `requiredPlan` filtering, so this nav item is automatically hidden for Starter tenants with zero additional logic.

---

## Post-Implementation Checklist

```bash
# 1. Run migrations
pnpm run db:migrate

# 2. Regenerate TypeScript types (critical — admin page imports DB types)
pnpm run db:types

# 3. Verify build
pnpm build

# 4. Lint
pnpm lint
```

Manual checks:
- [ ] Submit a booking on a public page → check customer receives confirmation email
- [ ] Submit a booking on a public page → check business owner receives alert email
- [ ] Starter tenant: confirm `booking_block` is locked / returns 403 from API
- [ ] Growth tenant: confirm block works end-to-end
- [ ] Admin page: Super Admin sees all bookings across tenants
- [ ] Admin page: Tenant Admin sees only their bookings
- [ ] Status update via editModal reflects immediately (refetch after PATCH)
- [ ] Bookings nav item hidden for Starter tenants

---

## Environment Variables Required

Add to `.env.local` and Vercel environment:

```bash
# Already exists — just confirming usage:
RESEND_API_KEY=...

# New — sender address for booking emails:
RESEND_FROM_EMAIL=bookings@yourdomain.com

# New — used to build the admin deep-link in notification emails:
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
```

---

## Out of Scope (Future Phases)

These are intentionally excluded from this build to avoid over-engineering:

| Feature | Notes |
|---|---|
| **Booking reminders** (24h prior) | Requires a Supabase Edge Function cron job. Feature flag `booking_reminders` is seeded and ready on Pro — just needs the cron. |
| **SMS notifications** | Add Twilio integration. Triggered same place as Resend emails in the API route. |
| **Google Calendar sync** | Export booking as `.ics` file from the confirmation email. |
| **Online deposits** | Separate Stripe PaymentIntent flow attached to the booking `id`. |
| **Staff / resource management** | e.g. "Which barber?" — requires a `staff` table + availability grid. |
| **Real-time availability** | Currently time slots are static per the Puck config. A real availability engine would need a `blocked_times` table. |
| **Upgrade prompt in Puck** | When a Starter tenant tries to add `booking_block`, show a locked state with an upgrade CTA in the editor sidebar. |

---

## Key Constraints to Remember

1. **Tailwind v4 variable syntax** — always `w-[var(--x)]`, never `w-[--x]`
2. **No side panels** — all detail views via `CrudModal` only, never a slide-over
3. **No border-only separators** — use `border-border/40` and tonal backgrounds
4. **Zero premature abstraction** — if a component is only used in `bookings/page.tsx`, keep it inline there
5. **Fire-and-forget emails** — never `await` email sends in the critical path; wrap in `.catch(() => {})`
6. **Zod at API boundary** — always validate before touching the database
7. **Never hand-edit `lib/supabase/types.ts`** — regenerate with `pnpm run db:types` after any migration
