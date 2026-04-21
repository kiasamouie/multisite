# Booking System Documentation

**Status:** Implemented  
**Feature Flag:** `booking_system`  
**Plan Requirement:** Growth+ (Growth, Pro)  
**Last Updated:** April 2026

---

## Overview

The booking system is a full-featured appointment/reservation system for Multisite tenants. It allows customers to book time slots on a public website while business owners manage bookings through an admin dashboard. The system integrates Resend for transactional emails, supports media uploads, and enforces availability constraints.

**Key Features:**
- Public booking form with real-time availability checking
- Tenant-branded email confirmations (customer + owner notifications)
- Admin dashboard with booking management (CRUD, resend emails)
- Cross-tenant viewing for platform admins
- Feature flag gating (Growth+ only)
- Plan-based availability (Growth/Pro tiers)

---

## Architecture

### Database Schema

**`bookings` table:**
```sql
id                    uuid primary key
tenant_id             int not null (fk: tenants.id)
customer_name         text not null
customer_email        text not null
customer_phone        text
booking_date          date not null (YYYY-MM-DD)
booking_time          time not null (HH:MM:SS)
party_size            int default 1
service_label         text (optional service/category)
special_notes         text (customer notes)
status                enum: pending|confirmed|cancelled|completed|noshow
created_at            timestamp
updated_at            timestamp
```

**Row-Level Security (RLS):**
- Tenant admins can only see/edit bookings for their tenant
- Platform admins see all bookings
- Public API has no auth but is scoped by tenant domain (via middleware-injected header)

---

## API Routes

### Public Booking API

**`POST /api/bookings` – Create Booking**

**Request:**
```json
{
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+1234567890",
  "booking_date": "2026-04-25",
  "booking_time": "14:00",
  "party_size": 2,
  "service_label": "Consultation",
  "special_notes": "Prefer window seat"
}
```

**Response (201):**
```json
{
  "success": true,
  "bookingId": "755420b9-2b39-4590-abce-0c9669ef880b"
}
```

**Behavior:**
1. Validates booking data via Zod schema (email, date format, time format, party_size 1–100)
2. Resolves tenant from middleware-injected `x-tenant-domain` header
3. Checks feature flag: `hasFlag(tenant.id, "booking_system")`
4. Inserts booking with status="pending"
5. **Fire-and-forget:** Sends customer confirmation + owner alert emails via `sendBookingEmails()`
6. Returns immediately (email errors logged but don't block response)

**Rate Limiting:** 10 requests per IP per 60 seconds

---

**`GET /api/bookings?date=YYYY-MM-DD` – Check Availability**

**Response (200):**
```json
{
  "bookedTimes": ["14:00", "15:30", "16:00"]
}
```

**Behavior:**
- Returns list of already-booked times for the given date (pending + confirmed only)
- Used by the BookingBlock to disable unavailable slots in the UI
- Returns empty array if tenant not found (doesn't expose tenant existence)

---

### Admin Booking API

**`GET /api/admin/bookings?tenantId=X&status=Y&date=Z&search=W` – List Bookings**

**Auth:** Logged-in user (tenant admin or platform admin)

**Response (200):**
```json
{
  "data": [
    {
      "id": "755420b9...",
      "tenant_id": 4,
      "customer_name": "Kia",
      "customer_email": "kia@example.com",
      "booking_date": "2026-04-21",
      "booking_time": "18:00:00",
      "party_size": 1,
      "status": "pending",
      "created_at": "2026-04-21T12:00:00Z",
      "tenants": { "id": 4, "name": "Kai Music", "slug": "kaimusic" }
    }
  ]
}
```

**Scoping:**
- Tenant admins: only their tenant's bookings
- Platform admins: all bookings
- Joined tenant name included for cross-tenant views

---

**`PATCH /api/admin/bookings` – Update Booking**

**Request:**
```json
{
  "id": "755420b9...",
  "status": "confirmed",
  "booking_date": "2026-04-22",
  "booking_time": "14:30"
}
```

**Response (200):**
```json
{
  "data": { ...updated booking... }
}
```

---

**`DELETE /api/admin/bookings?id=X` – Delete Booking**

**Response (200):**
```json
{
  "success": true
}
```

---

**`POST /api/admin/bookings` – Resend Booking Emails**

**Request:**
```json
{
  "id": "755420b9..."
}
```

**Behavior:**
1. Fetches booking + joined tenant data
2. Calls `sendBookingEmails()` (from `@repo/lib/resend/booking-emails`)
3. Returns 502 with error message if Resend fails (so admins see the real error)
4. Returns 200 on success

**Use Case:** Admin manually resends confirmation/alert emails if they bounced or for a customer request.

---

## Core Functions

### `sendBookingEmails()` – Generic Email Sender

**Location:** `packages/lib/src/resend/booking-emails.ts`

**Signature:**
```typescript
export async function sendBookingEmails({
  tenant: TenantEmailContext,
  booking: BookingEmailData,
  supabase: ReturnType<typeof createAdminClient>,
  appDomain?: string,
}: SendBookingEmailsOptions): Promise<void>
```

**Sends Two Emails:**
1. **Customer Confirmation** (to `booking.customer_email`)
   - Template: `bookingConfirmationEmail()` with styled HTML
   - Shows date, time, party size, service label, special notes
   - Propagates errors (so callers see if Resend rejects the send)

2. **Owner Alert** (to tenant owner's email, via memberships lookup)
   - Template: `bookingAlertEmail()` with admin dashboard link
   - Shows customer contact info + booking details
   - Failure is non-fatal (logged but not thrown — customer email already sent)

**Tenant Branding:**
- Uses `tenant.from_email` if set (requires domain verified in Resend)
- Falls back to `RESEND_FROM_EMAIL` env var (e.g., `onboarding@resend.dev`)
- In dev: redirect to `RESEND_TEST_EMAIL` env var (required with test sender)

**Exported from:** `@repo/lib/resend/booking-emails`  
**Used by:**
- `POST /api/bookings` (fire-and-forget after insert)
- `POST /api/admin/bookings` (manual resend action)

---

## Frontend Components

### BookingBlock (Puck Block)

**Location:** `packages/template/src/components/blocks/BookingBlock.tsx`

**Props (Content Interface):**
```typescript
interface BookingBlockContent {
  heading?: string;
  subheading?: string;
  availableTimeSlots?: string[]; // e.g., ["10:00", "14:00", "18:00"]
  backgroundImageUrl?: string; // (legacy, deprecated)
  backgroundImageId?: number | null; // new: media ID
  // form fields handled automatically
}
```

**Features:**
- **Real-time Availability:** Calls `GET /api/bookings?date=X` to check booked times
- **Current Time Filtering:** Hides past times on today's date (client-side clock, updates every minute)
- **Date Picker:** `min` set to today (computed from local time, not UTC)
- **Time Slots:** Disabled pills for unavailable times
- **Background Image:** 
  - New: resolves `backgroundImageId` → `/api/media/{id}/img`
  - Old: uses `backgroundImageUrl` directly (deprecated)
- **Media Picker Integration:** `backgroundImageId` field included in Puck config's `MEDIA_PICKER_FIELDS`

**Validation:**
- Customer name (1–200 chars)
- Email (valid RFC 5321)
- Date (YYYY-MM-DD, >= today)
- Time (HH:MM, 00:00–23:59)
- Party size (1–100)
- Optional: phone, service label, special notes

**Success Handling:**
- Shows success toast: `"Booking confirmed! Check your email for details."`
- Clears form
- Optional: redirect to confirmation page

---

### Admin Bookings Page

**Location:** `apps/web/src/app/admin/bookings/page.tsx`

**Features:**
- **DataView Table:** Displays bookings in paginated table (10 per page)
- **Conditional Tenant Column:** Shows "Tenant" name only in cross-tenant view (super admin)
- **Inline Actions:**
  - **Edit:** Click row → opens modal with status/date/time fields
  - **Resend:** Mail icon button → POST /api/admin/bookings → shows toast
  - **Delete:** Confirm dialog → DELETE request
- **Sorting:** By date + time (newest first)
- **Status Badge:** Color-coded (pending, confirmed, completed, etc.)

**Context:**
- `useAdmin()` to get `tenantId` — determines if single-tenant or platform-wide view
- Fetches via `/api/admin/bookings` (service-role, bypasses RLS)
- Uses React Query for caching and invalidation

---

## Feature Flags & Plans

### Feature Flag: `booking_system`

**Scope:** Per-tenant  
**Enabled By Default:** No (must be explicitly enabled in feature_flags table)  
**Plan Requirement:** Growth+

**Check Location:** `POST /api/bookings` — early return with 403 if not enabled

```typescript
const allowed = await hasFlag(tenant.id, "booking_system");
if (!allowed) {
  return NextResponse.json(
    { error: "Booking system is not available on your current plan" },
    { status: 403 }
  );
}
```

### Nav Visibility

- **Tenant Admin:** Bookings nav item appears only if `booking_system` flag enabled + Growth+ plan
  - Config: `featureFlag: "booking_system", requiredPlan: "growth"`
- **Super Admin:** Bookings nav always appears (no feature flag)

---

## Email Configuration

### Resend Setup

**In `.env.local` (dev):**
```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev  # Resend test sender
RESEND_TEST_EMAIL=your-email@example.com # Where ALL dev emails redirect
```

**In production `.env.production`:**
```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=bookings@yourplatform.com  # Your verified domain
# No RESEND_TEST_EMAIL (so emails go to real recipients)
```

### Tenant-Branded Sending (Future)

When a tenant verifies their domain in Resend, update their `from_email`:
```sql
UPDATE tenants SET from_email = 'bookings@kaimusic.com' WHERE id = 4;
```

Then `sendBookingEmails()` automatically sends from that domain (if verified in Resend).

### Error Handling

- **No API key:** `console.warn()` + return null (doesn't crash)
- **EMAIL_SKIP=true:** Logs to console + return null (dev bypass)
- **Resend rejects send:** Throws error → propagates to caller → shows error toast

---

## Data Flow

### Booking Creation Flow

```
1. Customer fills BookingBlock form (client-side validation)
2. POST /api/bookings
   ├─ Rate limit check (10/min/IP)
   ├─ Resolve tenant from x-tenant-domain header
   ├─ Feature flag check (booking_system enabled?)
   ├─ Zod validation
   ├─ INSERT booking (status=pending)
   └─ Fire-and-forget: sendBookingEmails()
       ├─ Send customer confirmation
       └─ Send owner alert (non-fatal if fails)
3. Return { success: true, bookingId: ... }
4. Client shows success toast
```

### Availability Check Flow

```
1. BookingBlock mounts / date changes
2. Calls GET /api/bookings?date=YYYY-MM-DD
3. Returns { bookedTimes: ["14:00", "15:30", ...] }
4. Filter logic:
   ├─ Disable pills for booked times
   ├─ If date=today, also hide times <= current time
   └─ Show remaining available times
```

### Admin Resend Flow

```
1. Admin clicks mail icon on a booking row
2. POST /api/admin/bookings { id: "..." }
3. Fetch booking + tenant
4. Call sendBookingEmails()
5. On success: show toast "Emails resent to kia@example.com"
6. On error: show toast with Resend error message (502)
```

---

## Security & RLS

### Tenant Isolation

- **Public bookings API:** Tenant resolved from domain header (middleware-injected)
- **Admin bookings API:** Auth-checked + allowedTenantIds validation
- **Database RLS:** Not currently enforced on bookings table (relies on app-layer filtering)

### Rate Limiting

- Public `POST /api/bookings`: 10 per IP per 60 seconds (via Upstash Redis)
- Admin routes: No rate limit (assumes authenticated users)

### Auth Requirements

- **Public:** No auth (domain-based tenant resolution)
- **Admin GET/PATCH/DELETE:** Requires login + membership in tenant (or platform admin)
- **Admin POST (resend):** Same as above

---

## Testing

### Manual Testing Checklist

**Public Booking:**
- [ ] POST to http://kaimusic.localhost:3000/api/bookings with valid data → 201
- [ ] GET http://kaimusic.localhost:3000/api/bookings?date=2026-04-25 → returns booked times
- [ ] BookingBlock form submit → success toast + email sent
- [ ] BookingBlock time filtering → past times hidden on today's date

**Admin (Tenant):**
- [ ] Login as tenant admin
- [ ] Navigate to /admin/bookings
- [ ] See bookings for their tenant only
- [ ] Click row → edit status/date/time → save
- [ ] Click mail icon → resend emails
- [ ] Click delete → confirm → booking removed

**Admin (Super Admin):**
- [ ] Login as platform admin
- [ ] Navigate to /admin/bookings
- [ ] See "Tenant" column with tenant names
- [ ] See bookings from all tenants
- [ ] Same CRUD + resend operations

**Email (Dev):**
- [ ] Set RESEND_TEST_EMAIL to your email
- [ ] Create booking
- [ ] Check inbox: should have 2 emails (confirmation + alert)
- [ ] Admin resend: should see 2 new emails

---

## Known Limitations

1. **Owner Lookup:** Requires membership row for the tenant owner. If tenant has no memberships, owner alert silently skips (non-fatal).
2. **Domain Verification:** Tenant-branded sending requires manual Resend domain setup + DNS verification. Plan: automate via Resend Domains API.
3. **No Cancellation/Rescheduling UI:** Customers can't self-service; must contact business. Consider adding future.
4. **No Custom Availability:** Business can't set recurring hours or blackout dates yet. Currently all slots during service hours are available.

---

## Future Enhancements

- [ ] Automated Resend domain verification flow for tenants
- [ ] Custom service/availability configuration (hours, blackout dates)
- [ ] Customer-facing cancellation/reschedule portal
- [ ] SMS notifications (SMS via Twilio)
- [ ] Calendar sync (Google Calendar, iCal)
- [ ] Booking reminders (email, SMS, 24h before)
- [ ] Analytics dashboard (booking trends, conversion rate)
- [ ] Multi-location support (different service slots per location)

---

## References

- **Database Schema:** See `supabase/migrations/` for full schema
- **Resend Integration:** `packages/lib/src/resend/`
- **Feature Flags:** `packages/lib/src/flags/` and `lib/tenant/featureFlags.ts`
- **Email Templates:** `packages/lib/src/resend/templates.ts`
- **Admin Context:** `apps/web/src/context/admin-context.tsx`
- **Puck Block Config:** `apps/web/src/lib/puck/config.tsx` (MEDIA_PICKER_FIELDS)
