# Loyalty Cards Feature — Implementation Plan

## Overview

This system gives every tenant a native digital stamp-card loyalty programme.
Customers enroll via the tenant's public site, receive a digital card in **Apple Wallet** or **Google Wallet**, and collect stamps passively — the card on their phone updates silently every time a stamp is added. No third-party service, no per-tenant API keys, everything runs inside our stack.

The feature is gated behind the `loyalty_cards` feature flag, available on `growth` and `pro` plans. It builds on top of the **Tenant Contacts system** (see `TENANT_CONTACTS_AND_ACCESS.md`) — every loyalty card is attached to a `customers` record, so tenants keep a single unified contact directory rather than a separate loyalty-only data silo.

---

## How It Fits Into The Platform

```
Tenant Admin
 ├── Contacts (customers + staff)         ← TENANT_CONTACTS_AND_ACCESS.md
 └── Loyalty [feature-flagged]
      ├── Campaigns (card designs + rewards)
      ├── Cards (one per customer per campaign)
      ├── Loyalty Station (iPad QR scanner)  ← the stamping interface
      └── Events / Reporting
```

A customer who enrolls in a loyalty programme is automatically created as a `customers` row if one does not already exist for that email/phone.

---

## Feature Flag & Plan Gating

**Feature key:** `loyalty_cards`

| Plan | Loyalty Cards | Campaigns | Active cards |
|---|---|---|---|
| `starter` | ✗ | — | — |
| `growth` | ✓ | 1 | 500 |
| `pro` | ✓ | unlimited | unlimited |

Changes to `packages/lib/src/stripe/plans.ts`:
```typescript
// Add to growth.features and pro.features:
"loyalty_cards"

// Add to PlanConfig.limits:
loyaltyCampaigns: number;    // 1 for growth, -1 for pro (unlimited)
loyaltyCardLimit: number;    // 500 for growth, -1 for pro
```

---

## How Apple Wallet Passes Work (PassKit)

A `.pkpass` file is a signed ZIP archive with MIME type `application/vnd.apple.pkpass`. The device opens it directly from a browser link — no app required.

### Pass type: `storeCard`

```json
{
  "formatVersion": 1,
  "passTypeIdentifier": "pass.com.yourplatform.loyalty",
  "serialNumber": "<card UUID>",
  "teamIdentifier": "APPLE_TEAM_ID",
  "webServiceURL": "https://yourdomain.com/api/loyalty/apple/passkit/",
  "authenticationToken": "<per-card secret>",
  "organizationName": "Tenant Name",
  "description": "Campaign Name",
  "backgroundColor": "rgb(64, 26, 107)",
  "foregroundColor": "rgb(255, 255, 255)",
  "storeCard": {
    "headerFields":    [{ "key": "stamps",  "label": "STAMPS",      "value": "3 / 10" }],
    "primaryFields":   [{ "key": "name",    "label": "MEMBER",      "value": "Jane Smith" }],
    "secondaryFields": [{ "key": "reward",  "label": "NEXT REWARD", "value": "Free Coffee" }],
    "auxiliaryFields": [{ "key": "expires", "label": "EXPIRES",     "value": "Never" }],
    "backFields": [
      { "key": "terms",   "label": "Terms", "value": "..." },
      { "key": "website", "label": "Website", "value": "https://..." }
    ]
  },
  "barcode": {
    "message": "<card UUID>",
    "format": "PKBarcodeFormatQR",
    "messageEncoding": "iso-8859-1"
  }
}
```

The QR code on the pass encodes the card UUID. This is what the Loyalty Station scanner reads.

### ZIP contents

```
pass.json
manifest.json      ← SHA1 hash of every file
signature          ← DER-encoded CMS signature of manifest.json
icon.png  / @2x / @3x
logo.png  / @2x / @3x
strip.png / @2x / @3x   ← the stamp grid image, regenerated on each stamp change
```

### Platform-level signing (one-time setup)

1. Apple Developer account → register `pass.com.yourplatform.loyalty` as a Pass Type ID
2. Generate a Pass Type certificate, export as `.p12`
3. Download Apple WWDR G4 intermediate certificate (expires 2030)
4. Store as environment variables (base64-encoded):

```bash
APPLE_PASS_TYPE_IDENTIFIER=pass.com.yourplatform.loyalty
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_PASS_TYPE_CERT_P12_BASE64=<base64 .p12>
APPLE_PASS_TYPE_CERT_P12_PASSWORD=<p12 password>
APPLE_WWDR_CERT_BASE64=<base64 WWDR G4 .pem>
APPLE_APNS_KEY_P8_BASE64=<base64 .p8 APNs auth key>
APPLE_APNS_KEY_ID=XXXXXXXXXX
```

### Silent push update flow

When a stamp is added:
1. DB updated (`loyalty_cards.current_stamps`)
2. Look up `loyalty_apple_registrations` for this card's serial number
3. Send silent APNs push to each registered device (empty body — Wallet fetches itself)
4. Apple Wallet calls back: `GET {webServiceURL}/v1/passes/{passTypeId}/{serial}`
5. Route regenerates `.pkpass` with new stamp count and returns it

---

## How Google Wallet Passes Work

- **LoyaltyClass** = campaign template (one per campaign, platform-managed)
- **LoyaltyObject** = individual customer card

### Platform-level setup (one-time)

1. Enable Google Wallet API in Google Cloud Console
2. Create a Service Account, download JSON key
3. Register as a Wallet Issuer at pay.google.com/business/console (requires business verification — allow several days)

```bash
GOOGLE_WALLET_SERVICE_ACCOUNT_JSON=<service account key JSON>
GOOGLE_WALLET_ISSUER_ID=<numeric issuer ID>
```

### Enrollment flow

1. Create/update LoyaltyClass for this campaign (once per campaign publish)
2. Create LoyaltyObject for the customer card
3. Return a JWT-signed URL: `https://pay.google.com/gp/v/save/{jwt}`
4. Customer taps → "Add to Google Wallet" sheet appears

### Stamp update

```
PATCH /walletobjects/v1/loyaltyObject/{objectId}
Body: { "loyaltyPoints": { "balance": { "int": currentStamps } } }
```

Google pushes the update to the device automatically — no polling needed.

---

## Database Schema

### `loyalty_campaigns`

One record per card design a tenant creates.

```sql
create table public.loyalty_campaigns (
  id              serial primary key,
  tenant_id       integer not null references public.tenants(id) on delete cascade,
  name            text not null,
  description     text,
  type            text not null default 'single',   -- 'single' | 'multi'
  status          text not null default 'draft',    -- 'draft' | 'published'
  total_stamps    integer not null default 10,

  -- Rewards: [{ position: 10, label: "Free Coffee" }]
  -- position = total_stamps for single; < total_stamps for multi milestones
  rewards         jsonb not null default '[]',

  -- Visual
  background_color  text not null default '#401A6B',
  text_color        text not null default '#FFFFFF',
  icon_image_url    text,
  logo_image_url    text,
  stamp_color       text default '#FFFFFF',
  unstamp_color     text default '#FFFFFF',
  stamp_opacity     numeric default 1.0,
  unstamp_opacity   numeric default 0.25,

  -- Enrollment form: [{ name: "email", label: "Email", type: "email", required: true }]
  fields_to_collect jsonb not null default '[]',

  -- Terms
  terms             text,
  disable_terms     boolean not null default false,

  -- Expiry: { noExpiry: true } | { expiresAfterDays: 365 } | { expiryDate: "2027-01-01" }
  expiry_settings   jsonb not null default '{"noExpiry": true}',

  -- Unique enrollment key (which collected field must be unique per card)
  unique_field_name text,

  -- Consent
  consent_enabled   boolean not null default false,
  consent_text      text,

  -- Pass config
  org_name          text,
  collect_value     text,   -- "Show your receipt to collect a stamp"
  allow_push        boolean not null default true,

  short_code        text unique,   -- 6-char, auto-generated
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
```

### `loyalty_cards`

One record per customer per campaign. References `customers` from the Contacts system.

```sql
create table public.loyalty_cards (
  id              serial primary key,
  tenant_id       integer not null references public.tenants(id) on delete cascade,
  campaign_id     integer not null references public.loyalty_campaigns(id) on delete cascade,
  customer_id     integer references public.customers(id) on delete set null,
  -- customer_id will be populated when the Contacts feature is active.
  -- Enrollment always creates or finds a customers row when contacts is enabled.

  -- Stamp state
  current_stamps          integer not null default 0,
  total_stamps_earned     integer not null default 0,
  total_rewards_earned    integer not null default 0,
  total_rewards_redeemed  integer not null default 0,

  -- Apple Wallet identifiers
  apple_serial_number  uuid not null default gen_random_uuid(),
  apple_auth_token     text not null default encode(gen_random_bytes(20), 'hex'),

  -- Google Wallet
  google_object_id     text unique,

  -- State
  pass_status   text not null default 'issued',  -- 'issued' | 'void' | 'expired'
  platform      text,                            -- 'apple' | 'google' | 'web'
  opted_out     boolean not null default false,
  expires_at    timestamptz,

  last_stamp_at  timestamptz,
  last_reward_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
```

### `loyalty_events`

Immutable audit log of every stamp, reward, and push.

```sql
create table public.loyalty_events (
  id           serial primary key,
  tenant_id    integer not null references public.tenants(id) on delete cascade,
  campaign_id  integer not null references public.loyalty_campaigns(id) on delete cascade,
  card_id      integer not null references public.loyalty_cards(id) on delete cascade,
  event_type   text not null,
  -- 'enrol' | 'stamp' | 'receive_reward' | 'redeem_reward' | 'forfeit_reward' | 'push_sent'
  quantity     integer not null default 0,
  metadata     jsonb not null default '{}',
  -- For stamps: { previousStamps, newStamps, scanLatitude?, scanLongitude?, stationScan: bool }
  -- For rewards: { rewardLabel, rewardPosition }
  created_at   timestamptz not null default now()
);
```

### `loyalty_apple_registrations`

Populated automatically by Apple's Wallet when a pass is added or removed from a device.

```sql
create table public.loyalty_apple_registrations (
  id                   serial primary key,
  device_library_id    text not null,
  push_token           text not null,
  pass_type_identifier text not null,
  serial_number        uuid not null references public.loyalty_cards(apple_serial_number) on delete cascade,
  created_at           timestamptz not null default now(),
  unique(device_library_id, pass_type_identifier, serial_number)
);
```

### Migration files

```
supabase/migrations/
  0024_create_loyalty_campaigns.sql
  0025_create_loyalty_cards.sql
  0026_create_loyalty_events.sql
  0027_create_loyalty_apple_registrations.sql
  0028_loyalty_rls_policies.sql
```

### RLS summary

- Published campaigns: readable by anyone (needed for public enrollment page)
- Campaigns: tenant members can manage their own
- Cards: tenant members read/write via service role; anonymous INSERT allowed during enrollment
- Events: tenant members read; service role writes
- Apple registrations: service role only (called by Apple infrastructure)

---

## Loyalty Station — The Stamping Interface

This is the core day-to-day use of the loyalty system. A café owner, barber, or shop assistant opens the Loyalty Station on their iPad, logs into their admin, and leaves it on the counter. When a customer arrives they hold up their phone with their wallet card open. The QR code is scanned and the stamp is applied instantly — no typing, no searching.

### Route

```
/admin/loyalty/[campaignId]/station
```

This is a **full-screen, stay-awake page** — no sidebar, no navigation chrome, just the scanner.

### Page behaviour

1. Page loads → requests camera permission
2. Displays a large scanning viewport (device camera feed)
3. Continuously decodes QR codes from the camera feed
4. On a valid scan (UUID matching a loyalty card):
   - Calls `POST /api/admin/loyalty/station/scan`
   - Body: `{ qrValue, campaignId }`
   - Backend resolves the card, adds the configured stamp amount (default 1)
5. **Result overlay** appears for 3 seconds:
   - Customer name + avatar initial circle
   - Animated stamp counter: "4 / 10 stamps"
   - Green success banner if reward triggered: "🎉 Reward unlocked — Free Coffee"
   - Red error state if card not found, voided, or wrong campaign
6. Overlay fades → scanner resumes for next customer

### Backend scan endpoint

```
POST /api/admin/loyalty/station/scan
Body: { qrValue: string, campaignId: number, stampsToAdd?: number }

Steps:
1. Validate tenant admin session (authenticateRequest)
2. Parse qrValue → it's the card's apple_serial_number UUID
3. Look up loyalty_cards by apple_serial_number + campaign_id
4. Assert card.tenant_id === session tenant (security)
5. Call addStamps(cardId, stampsToAdd ?? 1)
6. Return { customerName, currentStamps, totalStamps, rewardTriggered, reward? }
```

### QR code format

The QR on every wallet pass (both Apple and Google) encodes the card's `apple_serial_number` UUID. This is set in `pass.json → barcode.message`. Same UUID is used for both platforms, so one scanner handles everything.

### UI implementation

Use the **Web BarcodeDetector API** (supported in Chrome 88+ and Safari 17+) with `html5-qrcode` as a fallback for older browsers. On iPad (the primary device) Safari 17+ is standard.

```typescript
// apps/web package.json
"html5-qrcode": "^2.x"
```

Station page is `"use client"`. It:
- Requests `navigator.wakeLock.request("screen")` (Wake Lock API — prevents iPad sleep)
- Hides the Shell sidebar via a layout effect
- Shows a minimal `h-14` header: campaign name + "Exit" button
- Full remaining viewport is the camera scanner

```
apps/web/src/app/admin/loyalty/[campaignId]/station/page.tsx
```

---

## Enrollment Flow (Customer-Facing)

1. Customer finds the loyalty section on the tenant's public site
   - Via the `loyalty_enrollment` block on any page, OR
   - Via the standalone URL: `/{tenantSlug}/loyalty/{shortCode}`
2. Fills in the enrollment form (fields defined by the campaign's `fields_to_collect`)
3. Submits → `POST /api/loyalty/enroll/[campaignId]`
4. Backend:
   - Creates or finds a `customers` row by email/phone (contacts system)
   - Creates a `loyalty_cards` row
   - Generates the Apple `.pkpass` or Google Wallet save URL
5. Response: `{ applePassUrl, googleSaveUrl, platform }`
6. Frontend:
   - iOS → redirect to `applePassUrl` → Wallet add prompt
   - Android → redirect to `googleSaveUrl` → Google Wallet save sheet
   - Desktop → show QR code to scan on mobile

### Platform detection

```typescript
export function detectWalletPlatform(ua: string): 'apple' | 'google' | 'web' {
  if (/iPad|iPhone|iPod/.test(ua)) return 'apple';
  if (/Android/.test(ua)) return 'google';
  return 'web';
}
```

---

## Stamp Strip Image

The stamp grid on the wallet card face is generated server-side as an SVG then converted to PNG.

```typescript
// packages/lib/src/loyalty/stripImage.ts
export function generateStampStripSVG(config: {
  totalStamps: number;
  currentStamps: number;
  backgroundColor: string;
  stampColor: string;
  unstampColor: string;
  stampOpacity: number;
  unstampOpacity: number;
  rewardPositions?: number[];
}): string  // returns SVG string
```

A row of circles — filled for stamped, hollow/faded for remaining. Reward milestones use a star shape. The SVG is converted to PNG via `sharp` and embedded as `strip.png` in the `.pkpass` ZIP. Regenerated every time stamps change.

---

## Core Library: `packages/lib/src/loyalty/`

```
packages/lib/src/loyalty/
  types.ts          ← LoyaltyCampaign, LoyaltyCard, LoyaltyEvent interfaces
  shortcode.ts      ← generateShortCode() — 6-char alphanumeric, no confusable chars
  stripImage.ts     ← generateStampStripSVG() → SVG string
  passkit.ts        ← generateApplePass(campaign, card, tenant) → Buffer
                       pushApplePassUpdate(serialNumber, client) → void
  googlewallet.ts   ← upsertGoogleLoyaltyClass(campaign, tenant) → classId
                       createGoogleLoyaltyObject(campaign, card, tenant) → saveUrl
                       updateGoogleStamps(googleObjectId, currentStamps) → void
  stamps.ts         ← addStamps(cardId, n, client, opts?) → { card, rewardTriggered, reward? }
  enroll.ts         ← enrollCustomer(campaignId, formData, userAgent, client) → { card, urls }
  index.ts          ← barrel export
```

### `addStamps()` — the core mutation

```typescript
export async function addStamps(
  cardId: number,
  stampsToAdd: number,      // positive = add, negative = deduct
  adminClient: SupabaseClient,
  opts?: { scanLatitude?: number; scanLongitude?: number; stationScan?: boolean }
): Promise<{
  card: LoyaltyCard;
  rewardTriggered: boolean;
  reward?: { label: string; position: number };
}>
```

Internally: validates bounds → updates card → checks reward thresholds → logs event → fires Apple push → patches Google Wallet. Returns updated state.

---

## API Routes

### Public (no auth)

```
GET  /api/loyalty/campaigns/[id]/public       ← campaign info for enrollment form render
POST /api/loyalty/enroll/[campaignId]          ← enroll customer → { applePassUrl, googleSaveUrl }
GET  /api/loyalty/pass/apple/[serial]          ← serve .pkpass file download (?token= required)
```

### Apple PassKit Web Service (called by Apple's Wallet — not users)

```
POST   /api/loyalty/apple/passkit/v1/devices/[deviceId]/registrations/[passTypeId]/[serial]
DELETE /api/loyalty/apple/passkit/v1/devices/[deviceId]/registrations/[passTypeId]/[serial]
GET    /api/loyalty/apple/passkit/v1/passes/[passTypeId]/[serial]
GET    /api/loyalty/apple/passkit/v1/devices/[deviceId]/registrations/[passTypeId]
```

### Tenant Admin (auth required)

```
POST/GET   /api/admin/loyalty/campaigns
GET/PATCH/DELETE  /api/admin/loyalty/campaigns/[id]
POST       /api/admin/loyalty/campaigns/[id]/publish
POST       /api/admin/loyalty/campaigns/[id]/push
POST       /api/admin/loyalty/campaigns/[id]/message
GET        /api/admin/loyalty/campaigns/[id]/events
GET        /api/admin/loyalty/campaigns/[id]/export

POST       /api/admin/loyalty/station/scan     ← Loyalty Station QR endpoint

GET        /api/admin/loyalty/cards
GET/DELETE /api/admin/loyalty/cards/[id]
POST       /api/admin/loyalty/cards/[id]/stamp
POST       /api/admin/loyalty/cards/[id]/redeem
POST       /api/admin/loyalty/cards/[id]/message
```

---

## Admin UI Pages

All pages follow the standard `DataView + CrudModal + useTenantAdmin` pattern.

### `/admin/loyalty` — campaign list

Columns: Name, Type badge (single/multi), Status badge, Stamps, Active Cards, Created.
Row actions: View Cards, Edit, **Open Station**, Publish/Unpublish, Delete.

### `/admin/loyalty/[campaignId]/cards` — card list

Columns: Customer Name, Email, Stamp progress ("4 / 10"), Platform icon, Status, Last Stamp date.
Row actions: Add Stamp (inline dialog), Redeem, Send Message, Delete.
Top bar: "Open Loyalty Station" button.

### `/admin/loyalty/[campaignId]/station` — Loyalty Station

Full-screen QR scanner. No sidebar. Camera viewport fills screen. Result overlay on scan. Wake Lock. Minimal header.

### Upsell state

If `loyalty_cards` flag is disabled, all loyalty admin routes render a full-width upsell card (illustration + bullet points + "Upgrade to Growth" CTA).

---

## Template Block: `loyalty_enrollment`

```typescript
// packages/template/src/types/index.ts
interface LoyaltyEnrollmentBlockContent {
  campaignId: string;
  heading?: string;
  subheading?: string;
  buttonLabel?: string;
  showStampPreview?: boolean;
}
```

Renders: campaign name, stamp strip preview, enrollment form, platform-aware CTA button.
Registered in `packages/template/src/blocks/registry.ts` as `type: "loyalty_enrollment"`.

**Standalone enrollment page:** `apps/web/src/app/[slug]/loyalty/[shortCode]/page.tsx`
SSR page showing only the enrollment block — suitable target for QR codes on printed materials.

---

## Required Packages

```json
"passkit-generator": "^3.2.x",
"@googleapis/walletobjects": "^2.x",
"jsonwebtoken": "^9.x",
"html5-qrcode": "^2.x",
"sharp": "^0.33.x"
```

---

## Implementation Phases

| Phase | Scope |
|---|---|
| **0** | DB migrations (0024–0028) + plan config + env vars setup |
| **1** | `packages/lib/src/loyalty/` core library (types → strip → passkit → google → stamps → enroll) |
| **2** | API routes: public enrollment + Apple PassKit web service + admin CRUD + station scan |
| **3** | Loyalty Station: full-screen QR scanner page (`/station`) |
| **4** | Admin UI: campaigns list, cards list, upsell card, nav item |
| **5** | Template block + standalone enrollment page |
| **6** | Push & silent updates: APNs (Apple) + Google PATCH on every stamp |
| **7** | Reporting: event log viewer, CSV export, loyalty stats in dashboard API |

---

## Risks & Blockers

| Risk | Severity | Notes |
|---|---|---|
| Apple Developer account | HIGH | Must register Pass Type ID + export certificate before any testing |
| Google Wallet Issuer approval | HIGH | Business verification required — apply early |
| APNs HTTP/2 | MEDIUM | Use `node-apn` package to manage persistent connection |
| Pass ZIP rebuild on stamp | MEDIUM | Cache static assets; only regenerate dynamic fields + strip.png |
| Anonymous enrollment RLS | MEDIUM | Server enforces flag + plan card limits before INSERT |
| Wake Lock API | LOW | Graceful degradation if unsupported |

---

## File Checklist

```
supabase/migrations/
  0024_create_loyalty_campaigns.sql          [NEW]
  0025_create_loyalty_cards.sql              [NEW] — has customer_id FK
  0026_create_loyalty_events.sql             [NEW]
  0027_create_loyalty_apple_registrations.sql [NEW]
  0028_loyalty_rls_policies.sql              [NEW]

packages/lib/src/stripe/plans.ts             [MODIFY]
packages/lib/src/supabase/types.ts           [MODIFY]
packages/lib/src/config/dashboardConfig.ts   [MODIFY]
packages/lib/src/loyalty/                    [NEW DIR — 8 files]

apps/web/src/app/api/loyalty/                [NEW — 6 routes]
apps/web/src/app/api/admin/loyalty/          [NEW — 14 routes]
apps/web/src/app/admin/loyalty/
  page.tsx                                   [NEW]
  [campaignId]/cards/page.tsx                [NEW]
  [campaignId]/station/page.tsx              [NEW]
apps/web/src/app/[slug]/loyalty/
  [shortCode]/page.tsx                       [NEW]
packages/template/src/
  components/blocks/LoyaltyEnrollmentBlock.tsx [NEW]
  blocks/registry.ts                         [MODIFY]
  types/index.ts                             [MODIFY]
```
