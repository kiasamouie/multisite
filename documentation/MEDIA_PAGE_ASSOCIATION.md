# Media-Page Association System: Complete Guide

## Overview

The Media-Page Association feature enables flexible, many-to-many relationships between uploaded media files (images, videos, documents) and pages across your tenant's website.

**Key Characteristics:**
- **Optional**: Media can be uploaded and used independently without page associations
- **Flexible**: One image can be used across multiple pages in different contexts
- **Dynamic**: Pages can reference associated media via components and blocks
- **Tenant-Scoped**: Multi-tenant isolation with RLS policies
- **Super-Admin Capable**: Administrators can manage associations across all tenant websites
- **Zero-Cache**: No caching on media queries — always fresh data on every request

---

## Architecture

### Database Schema

#### `media` Table (Existing)
```sql
- id: integer PRIMARY KEY
- tenant_id: integer REFERENCES tenants
- url: text (storage path + signed URL)
- filename: text
- metadata: jsonb (type, size, dimensions, upload date)
- created_at: timestamp
```

#### `media_page_associations` Table (New - Migration 0020)
```sql
- id: integer PRIMARY KEY
- media_id: integer REFERENCES media(id) ON DELETE CASCADE
- page_id: integer REFERENCES pages(id) ON DELETE CASCADE
- usage_type: text (hero, gallery, thumbnail, background, icon, general)
- position: integer (ordering within a page's usage context)
- created_at: timestamp
- updated_at: timestamp
- UNIQUE(media_id, page_id) -- Prevent duplicate associations
```

#### `blocks` Table (Relevant Fields)
```sql
- id: integer PRIMARY KEY
- content: jsonb (includes display_mode: "single" | "gallery" | "list")
- type: text (can be "page_media" for media blocks)
```

### Relationships

```
Media
  ↓ (many-to-many via media_page_associations)
Pages
  ↓ (one-to-many)
Sections
  ↓ (one-to-many)
Blocks
  ↓ (content: jsonb with display_mode, usage_type filters)
```

### Data Flow

```
1. User uploads media file
   ├─ File → Supabase Storage
   ├─ Record → media table
   └─ Associations → media_page_associations table (optional)

2. Frontend component renders page
   ├─ Query pages.id (fully dynamic, no cache)
   ├─ Query blocks for sections
   ├─ Query media_page_associations for that page (no cache)
   └─ Fetch media details by media_id

3. Block/Section renders media
   ├─ Filter by usage_type
   ├─ Render by display_mode (single shows assets[0], gallery shows all)
   ├─ Fetch file from Storage via signed URL
   └─ Display based on media type
```

---

## Implementation Summary

### What Was Built

#### 1. Database Migration (0020)
- **Table**: `media_page_associations` with complete schema above
- **Indexes**: On media_id, page_id, usage_type for fast queries
- **RLS Policies**: Tenant-scoped read/write with membership checks
- **Cascade Delete**: Removes associations when media or pages are deleted

#### 2. API Routes

##### POST `/api/admin/media/upload` (Enhanced)
- Accepts new optional FormData fields:
  - `pageIds`: JSON array of page IDs to associate
  - `usageType`: Type of usage (hero, gallery, etc.)
- Returns:
  - `mediaId`: For reference in further operations
  - `associatedPages`: Array of pages successfully associated
- Validates all pages belong to same tenant before associating
- **Auto-creates `page_media` blocks**: For each associated page, automatically creates a `page_media` block with the matching `usage_type` if one doesn't exist (idempotent operation via `ensurePageMediaBlock` helper)
- **Invalidates pages cache**: Calls `revalidateTag("pages")` to clear any page-related caches after block creation
- Creates associations or skips silently if validation fails

##### POST `/api/admin/media/[id]/associations` (New)
- Create page-media association programmatically
- **Auto-creates `page_media` blocks**: Same idempotent block creation with matching `usage_type`
- **Invalidates pages cache**: Calls `revalidateTag("pages")` after block creation
- Returns association record on success

##### POST `/api/admin/pages/[id]/page-media-block` (New)
- Create a `page_media` block for a specific page with a given `usage_type`
- Used by admin panel "Add Page Media Block" button for manual block creation
- Uses `ensurePageMediaBlock` helper (idempotent — no error if block already exists)
- Body: `{ usage_type: string }` (default: `"general"` if omitted)
- **Invalidates pages cache**: Calls `revalidateTag("pages")` after block creation
- Returns: `{ success: true }`
- Requires tenant membership authentication

##### GET `/api/admin/pages` (New)
- Fetches pages for tenant (used in dropdown)
- Returns: `id`, `title`, `slug`, `is_published`
- Filters by tenant, ordered by title
- Respects user permissions (tenant members only, super admin can see all)

##### DELETE `/api/media/[id]` (Enhanced)
- Delete media record and storage file
- **Invalidates pages cache**: Calls `revalidateTag("pages")` as a safety measure

##### DELETE `/api/admin/media/[id]/associations` (New)
- Remove a media-page association
- Validates tenant ownership

##### Block Management Routes (Enhanced)
- `POST /api/pages/[id]/sections` — **Now calls `revalidateTag("pages")` after section creation**
- `POST /api/sections/[id]/blocks` — **Now calls `revalidateTag("pages")` after block creation**
- `PUT /api/blocks/[id]` — **Now calls `revalidateTag("pages")` after block update**
- `DELETE /api/blocks/[id]` — **Now calls `revalidateTag("pages")` after block deletion**

#### 3. Component Enhancements

##### MediaUploadInput
**Features**:
- Auto-loads available pages for current tenant
- Multi-select checkbox list for page association
- Usage type dropdown (hero, gallery, thumbnail, background, icon, general)
- Multi-file upload support (`pendingFiles: File[]` state)
- Submit button (no accidental drag-drop uploads)
- File list with per-item Remove buttons
- Optional: Can upload without any associations
- Shows count of selected pages
- Resets form after successful upload
- Handles both read-only (super admin) and write (tenant admin) modes

**API Response Integration**:
- Receives and uses `mediaId` for tracking
- Receives and displays `associatedPages` array

##### PageDetailsPanel (Admin Pages View)
**New Block Management UI**:
- **Blocks Section** shows all blocks on the page as badges
  - Displays block type (e.g., `page_media`)
  - Shows `usage_type` tag for `page_media` blocks (e.g., `hero`, `gallery`)
  - Per-block delete button (removes block, not media)
- **Add Page Media Block Button** (tenant admins only)
  - Expands inline form to enter `usage_type`
  - Shows help text: "Enter the usage type — it must match what was selected when uploading media to this page."
  - Submit button creates block via `POST /api/admin/pages/{id}/page-media-block`
  - Cancels and closes form on success
- **Auto-refresh**: After any block operation, re-fetches sections and calls `router.refresh()`
- **Real-time feedback**: Loading states, error messages, success confirmation

#### 4. Caching Strategy (Critical Fix)

**Problem Identified**: Users had to hard-refresh pages to see updates after deleting media or changing block display settings.

**Root Causes Found and Fixed**:

1. **Block `display_mode: "single"` only renders `assets[0]`**
   - Multiple uploads were stored but only first shown
   - **Fixed**: Changed default in `PageMediaBlock.tsx` from `"single"` to `"gallery"`
   - Cloud DB blocks already patched via REST API during investigation

2. **`getCachedPageMedia` wrapped in `unstable_cache` with `revalidate: false`**
   - Cache never auto-cleared, only by explicit tag invalidation
   - Delete operations didn't call `revalidateTag("pages")`
   - **Fixed**: Removed `unstable_cache` entirely from `getCachedPageMedia`

3. **Delete operations didn't invalidate cache**
   - **Fixed**: Added `revalidateTag("pages")` to delete and all mutation routes

**Solution Implemented**:

- **`getCachedPageMedia`** in `apps/web/src/lib/cache.ts` — Removed `unstable_cache` wrapper. Now a plain async function that hits the database on every request with zero caching:
  ```typescript
  export async function getCachedPageMedia(pageId: number): Promise<PageMediaAsset[]> {
    return getPageMedia(pageId);
  }
  ```
  This ensures media data is always fresh. Users upload, delete, or change settings → page immediately reflects changes on next normal refresh (no hard-refresh needed).

- **`PageMediaBlock.tsx`** in `packages/template/src/components/blocks/PageMediaBlock.tsx` — Changed display_mode default from `"single"` to `"gallery"`:
  ```typescript
  const mode = content.display_mode ?? "gallery";
  ```
  This allows multiple images to render, not just the first one.

- **All mutation routes** — Added `revalidateTag("pages")` import and call after all block/section/page modifications to ensure cache is invalidated when structure changes.

- **Page route revalidation** — Existing `export const revalidate = 0` on `[slug]/page.tsx` ensures the page is fully dynamic — every request re-renders server components fresh.

**Result**: **No hard-refresh needed anywhere**. Upload media → appears immediately on refresh. Delete media → disappears immediately on refresh. Change display settings → updates immediately on refresh.

#### 5. Auto Block Creation Helper

**New file**: `packages/lib/src/media/blocks.ts`

Exports `ensurePageMediaBlock(supabase, pageId, usageType)` — Idempotent helper that:
1. Fetches all sections for a page
2. If the page has no sections, creates a default section with `type: "page_media"`
3. Checks if a `page_media` block with the exact `usage_type` already exists
4. If not, appends a new `page_media` block to the last section with `{ usage_type, display_mode: "gallery", content: { usage_type } }`
5. Returns silently (no error) if the block already exists — safe to call multiple times

Used by:
- `POST /api/admin/media/upload` — after creating media_page_associations
- `POST /api/admin/media/[id]/associations` — after inserting association
- `POST /api/admin/pages/[id]/page-media-block` — manual admin trigger

**Why this matters**: Pages now automatically get the required `page_media` block structure when media is associated, ensuring the page renderer can display media without manual DB intervention.

#### 6. TypeScript Types
Updated `packages/lib/src/supabase/types.ts`:
- Added `media_page_associations` table definition
- Includes Row/Insert/Update types
- Relationship references to media and pages

---

## How It Works: Upload Flow

```
User selects files + optional pages
         ↓
MediaUploadInput validates & stages files
         ↓
User clicks Submit button (staged files uploaded sequentially)
         ↓
POST /api/admin/media/upload (per file)
├─ Validate user permissions
├─ Upload file to Storage
├─ Create media record
├─ Validate selected pages (same tenant)
├─ Create media_page_associations records
├─ For each associated page:
│  └─ Call ensurePageMediaBlock(pageId, usageType)
│     ├─ Create default section if page has no sections
│     └─ Create page_media block with matching usage_type
└─ Call revalidateTag("pages") ⚡ Cache cleared
         ↓
Return mediaId + associatedPages
         ↓
Component callback with results
         ↓
Next page request:
├─ Re-renders [slug]/page.tsx (export const revalidate = 0)
├─ PageRenderer queries blocks (includes new page_media block)
├─ PageMediaProvider populates context with media_page_associations
└─ PageMediaBlock renders media filtered by usage_type
         ↓
Page visitors see media appear immediately (no hard-refresh necessary)
```

## Admin Block Management Flow

```
Admin visits Admin Panel → Pages → Selects page
         ↓
PageDetailsPanel loads:
├─ Fetches GET /api/pages/{id}/sections
├─ Displays all blocks as badges (type + usage_type)
└─ Shows "Add Page Media Block" button
         ↓
Admin clicks "Add Page Media Block"
         ↓
Inline form appears:
├─ Text input for usage_type (e.g., "hero", "gallery")
└─ Submit button
         ↓
Admin enters usage_type and clicks Submit
         ↓
POST /api/admin/pages/{id}/page-media-block
├─ Validate tenant membership
├─ Call ensurePageMediaBlock(pageId, usageType)
└─ Call revalidateTag("pages") ⚡ Cache cleared
         ↓
PageDetailsPanel auto-refreshes:
├─ Re-fetches sections
├─ Adds new block badge to list
└─ Admin can now see the page_media block
         ↓
Next time a user uploads media to this page,
the block already exists with matching usage_type,
so media appears immediately (idempotent operation)
```

---

## Usage: Component Integration

### In a Block Component

When building a block renderer (e.g., `packages/template/src/renderer/`), you can fetch associated media:

```typescript
// In a Gallery Block component
import { createServerClient } from "@repo/lib/supabase/server";

interface GalleryBlockProps {
  pageId: number;
  usageType?: string;
}

export async function GalleryBlock({ pageId, usageType = "gallery" }: GalleryBlockProps) {
  const supabase = createServerClient();

  // Fetch media associated with this page
  const { data: associations } = await supabase
    .from("media_page_associations")
    .select("media:media_id(id, url, filename, metadata)")
    .eq("page_id", pageId)
    .eq("usage_type", usageType)
    .order("position", { ascending: true });

  if (!associations || associations.length === 0) {
    return <div>No media found</div>;
  }

  return (
    <div className="gallery">
      {associations.map((assoc: any) => {
        const media = assoc.media[0]; // Nested select result
        return (
          <img
            key={media.id}
            src={media.url}
            alt={media.filename}
            className="gallery-item"
          />
        );
      })}
    </div>
  );
}
```

### In page_config

Store media associations in `pages.page_config` (JSONB):

```json
{
  "hero": {
    "media_id": 42,
    "usage_type": "hero"
  },
  "gallery": {
    "media_ids": [10, 11, 12],
    "usage_type": "gallery",
    "columns": 3
  }
}
```

Then query in your block:

```typescript
// page_config already has media IDs - no need to query associations
const { data: pages } = await supabase
  .from("pages")
  .select("page_config")
  .eq("id", pageId)
  .single();

const heroMediaId = pages.page_config.hero?.media_id;
```

---

## API Reference

### Upload with Page Association

**POST `/api/admin/media/upload`**

Request (FormData):
```
- file: File
- tenantId: string (number)
- pageIds: string (JSON array of page IDs, optional)
- usageType: string (optional, default: "general")
```

Response:
```json
{
  "filename": "photo.jpg",
  "url": "https://signed-url.com/...",
  "mediaId": 42,
  "associatedPages": [1, 5, 12]
}
```

### Fetch Pages for Dropdown

**GET `/api/admin/pages`**

Query params:
```
- tenantId: number (required)
- fields: string (comma-separated, optional, default: "id, title, slug, is_published")
```

Response:
```json
{
  "pages": [
    { "id": 1, "title": "Home", "slug": "home", "is_published": true },
    { "id": 2, "title": "Events", "slug": "events", "is_published": true }
  ]
}
```

### Query Associations (Direct)

```typescript
// Get all media associated with a page
const { data } = await supabase
  .from("media_page_associations")
  .select("media:media_id(id, url, filename, metadata)")
  .eq("page_id", 1)
  .order("position");

// Get all pages using specific media
const { data } = await supabase
  .from("media_page_associations")
  .select("page:page_id(id, title, slug, tenant_id)")
  .eq("media_id", 42);

// Filter by usage type
const { data } = await supabase
  .from("media_page_associations")
  .select("*")
  .eq("page_id", 1)
  .eq("usage_type", "hero");
```

---

## Admin UI: MediaUploadInput Component

Located: `apps/web/src/components/admin/media/MediaUploadInput.tsx`

### Features

1. **Drag-and-Drop Upload**
   - Drop files or click to select
   - File size limit: 100MB
   - Auto-detects MIME type
   - Multi-file support with file list display

2. **File Staging**
   - Files added to queue (`pendingFiles: File[]`)
   - Remove individual files before submission
   - See list of staged files before uploading

3. **Page Association (Optional)**
   - Multi-select checkbox list
   - Loads all pages for current tenant
   - Usage type selector (hero, gallery, thumbnail, etc.)
   - Shows count of selected pages

4. **Submit Button**
   - Only enabled when files staged
   - Prevents accidental uploads
   - Uploads all staged files sequentially
   - Returns results for each file

5. **Response Handling**
   - Returns media ID for further operations
   - Returns list of successfully associated pages
   - Can be uploaded without associations

### Example Usage in Page

```typescript
"use client";

import { useState } from "react";
import { MediaUploadInput } from "@/components/admin/media";

export default function MediaAdminPage() {
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <div>
      <MediaUploadInput
        onUploadComplete={(filename, url, mediaId, pages) => {
          console.log(`Uploaded: ${filename}`);
          console.log(`Media ID: ${mediaId}`);
          console.log(`Associated with ${pages?.length || 0} pages`);
          // Refresh media list, etc.
        }}
        onError={(error) => setUploadError(error)}
      />
      {uploadError && <p className="text-red-600">{uploadError}</p>}
    </div>
  );
}
```

---

## RLS Policies

### media_page_associations Policies

**SELECT**: Members can read associations for their tenant
```sql
create policy "Members can read media-page associations"
  on public.media_page_associations for select
  using (
    exists (
      select 1 from public.media
      join public.pages on pages.id = media_page_associations.page_id
      where media.id = media_page_associations.media_id
      and media.tenant_id = pages.tenant_id
      and public.is_member_of(media.tenant_id)
    )
  );
```

**INSERT/UPDATE/DELETE**: Members can manage associations for their tenant
```sql
create policy "Members can manage media-page associations"
  on public.media_page_associations for all
  using (
    exists (
      select 1 from public.media
      join public.pages on pages.id = media_page_associations.page_id
      where media.id = media_page_associations.media_id
      and media.tenant_id = pages.tenant_id
      and public.is_member_of(media.tenant_id)
    )
  );
```

**Service Role Bypass**: Admin API routes use service role key to bypass RLS when needed.

---

## Multi-Tenant Scoping

### Tenant Admin

- Can upload media with tenant isolation (media.tenant_id = their tenant)
- Can associate media only to their own tenant's pages
- Cannot see other tenants' media or pages
- RLS policies enforce this automatically

### Super Admin (Platform Admin)

- Can upload/manage media for any tenant
- Can associate media across any tenant's pages
- Can view associations across all tenants
- Service role used in admin API routes bypasses RLS
- `useTenantAdmin()` returns `tenantId === null`

### Frontend (Public)

- Public pages are accessible to anyone
- Media in published pages is accessible via signed URLs
- RLS allows reading media in published pages via sections/blocks

---

## Critical Cache Behavior

### ⭐ Zero Caching on Media Queries

**IMPORTANT**: `getCachedPageMedia()` does NOT cache. It directly calls `getPageMedia()` on every request.

```typescript
// In apps/web/src/lib/cache.ts
export async function getCachedPageMedia(pageId: number): Promise<PageMediaAsset[]> {
  return getPageMedia(pageId);  // Direct DB call, no unstable_cache wrapper
}
```

**Why This Matters**: Caching media associated with pages leads to stale data when users delete media. With zero caching:
- Upload media → appears on page refresh immediately (no hard-refresh)
- Delete media → disappears on page refresh immediately (no hard-refresh)
- Change block display_mode → updates on page refresh immediately (no hard-refresh)

### Page Route is Fully Dynamic

```typescript
// In apps/web/src/app/[slug]/page.tsx
export const revalidate = 0;  // Always dynamic, never cached
```

Every request re-renders the page, fetches fresh page data, blocks, and media associations.

### Tag-Based Invalidation (Comprehensive)

**Pages Cache**: `revalidateTag("pages")` is called after **all** block/section mutations and media associations:
- `POST /api/admin/media/upload` — calls `revalidateTag("pages")` after block creation
- `POST /api/admin/media/[id]/associations` — calls `revalidateTag("pages")` after block creation
- `POST /api/admin/pages/[id]/page-media-block` — calls `revalidateTag("pages")` after block creation
- `POST /api/pages/[id]/sections` — calls `revalidateTag("pages")` after section creation
- `POST /api/sections/[id]/blocks` — calls `revalidateTag("pages")` after block creation
- `PUT /api/blocks/[id]` — calls `revalidateTag("pages")` after block update
- `DELETE /api/blocks/[id]` — calls `revalidateTag("pages")` after block deletion
- `DELETE /api/media/[id]` — calls `revalidateTag("pages")` as a safety measure

**Why this matters**: The page data (including all sections and blocks) is extracted from cache with `tags: ["pages"]`. Any mutation to pages, sections, or blocks invalidates this tag, ensuring the next page render gets fresh data with all updates applied.

---

## Files Changed/Created

### Database
- ✅ `supabase/migrations/0020_create_media_page_associations.sql` (NEW)
- ✅ `supabase/migrations/0021_fix_media_page_associations_rls.sql` (Refinement)
- ✅ `supabase/migrations/0022_platform_admin_media_associations_rls.sql` (Refinement)
- ✅ `supabase/migrations/0023_public_media_page_associations_rls.sql` (Refinement)

### Helper Libraries
- ✅ `packages/lib/src/media/blocks.ts` (NEW - `ensurePageMediaBlock` idempotent helper)
- ✅ `packages/lib/package.json` (UPDATED - added `./media/blocks` export)

### API Routes
- ✅ `apps/web/src/app/api/admin/media/upload/route.ts` (ENHANCED - auto-block creation + revalidateTag pages)
- ✅ `apps/web/src/app/api/admin/pages/route.ts` (NEW)
- ✅ `apps/web/src/app/api/admin/media/[id]/associations/route.ts` (ENHANCED - auto-block creation + revalidateTag pages)
- ✅ `apps/web/src/app/api/admin/pages/[id]/page-media-block/route.ts` (NEW - manual block creation endpoint)
- ✅ `apps/web/src/app/api/pages/[id]/sections/route.ts` (ENHANCED - added revalidateTag pages)
- ✅ `apps/web/src/app/api/sections/[id]/blocks/route.ts` (ENHANCED - added revalidateTag pages)
- ✅ `apps/web/src/app/api/blocks/[id]/route.ts` (ENHANCED - added revalidateTag pages to PUT and DELETE)
- ✅ `apps/web/src/app/api/media/[id]/route.ts` (ENHANCED - added revalidateTag pages)

### Cache Layer
- ✅ `apps/web/src/lib/cache.ts` (FIXED - removed unstable_cache from getCachedPageMedia)

### Admin Components
- ✅ `apps/web/src/components/admin/media/MediaUploadInput.tsx` (ENHANCED - multi-file, staging, submit button)
- ✅ `apps/web/src/app/admin/pages/page.tsx` (ENHANCED - added PageDetailsPanel blocks UI with add/delete functionality)

### Core Components
- ✅ `packages/template/src/components/blocks/PageMediaBlock.tsx` (FIXED - changed default display_mode to "gallery")

### Types
- ✅ `packages/lib/src/supabase/types.ts` (UPDATED - added media_page_associations)

---

## Implementation Checklist

When adding media association to a new feature:

- [ ] Run migration 0020 (creates table and policies)
- [ ] Create page/feature in admin
- [ ] Use MediaUploadInput component
- [ ] Handle upload response (mediaId, associatedPages)
- [ ] Query media_page_associations to fetch media
- [ ] Render media in block/component using display_mode
- [ ] Test both upload with/without associations
- [ ] Test multi-page associations
- [ ] Test multi-file uploads
- [ ] Verify RLS policies restrict access
- [ ] Test with super admin and tenant admin roles
- [ ] Verify no hard-refresh needed after upload/delete

---

## Testing Checklist

### Upload Flow
- [ ] Upload without pages (standalone media)
- [ ] Upload with single page
- [ ] Upload with multiple files at once
- [ ] Upload with multiple pages
- [ ] Try invalid page IDs (should silently ignore)
- [ ] Try pages from different tenant (should ignore)

### Display & Caching (Zero-Cache Verification)
- [ ] Upload image → normal page refresh → image appears (no hard-refresh needed)
- [ ] Delete image → normal page refresh → image disappears (no hard-refresh needed)
- [ ] Upload 2 images to same page → both appear in gallery mode
- [ ] Change block display_mode in DB → normal page refresh → setting applies (no hard-refresh needed)

### Permissions
- [ ] Tenant admin can upload to own tenant
- [ ] Tenant admin cannot upload to other tenants
- [ ] Super admin can see all pages in dropdown
- [ ] Super admin can associate across tenants

### Queries
- [ ] Query associations by page_id
- [ ] Query associations by media_id
- [ ] Filter by usage_type
- [ ] Order by position
- [ ] Join with media details

### RLS Policies
- [ ] Member can read own tenant's associations
- [ ] Member cannot see other tenant's associations
- [ ] Service role can bypass (API routes)

---

## Known Limitations / Future Work

1. **No Bulk Operations Yet**
   - Individual uploads work
   - Bulk upload would optimize UX

2. **No Media Reordering UI**
   - `position` field exists but not exposed
   - Drag-to-reorder could be added

3. **No Auto-cleanup**
   - Deleting a page leaves associations
   - Cascade DELETE on migration handles this
   - Could add validation on page deletion

4. **No Media Versioning**
   - Updates create new records
   - Historic media not preserved
   - Could add timestamps/versions

5. **No Search/Filter in Component**
   - Dropdown doesn't filter
   - Could add search by title/slug

---

## Generic Media Display: How It Works Everywhere

### The Problem (Solved)

Previously, media would not display on pages across all tenants due to:
1. **Missing block structure**: No `page_media` block created when media was associated to a page
2. **Permanent stale cache**: `revalidateTag("pages")` was never called, so cache changes were invisible to users
3. **Single-image display**: Block display mode defaulted to "single" showing only the first image in galleries

### The Solution (Implemented)

Media now displays **generically** on any page, any tenant, any website **without manual intervention**:

#### 1. **Automatic Block Creation** ✅
When media is uploaded and associated with page(s):
- `POST /api/admin/media/upload` → automatically calls `ensurePageMediaBlock()` for each associated page
- `POST /api/admin/media/[id]/associations` → automatically calls `ensurePageMediaBlock()` 
- The `page_media` block is created with the matching `usage_type` if one doesn't exist
- The operation is **idempotent** — safe to call multiple times without side effects

#### 2. **Comprehensive Cache Invalidation** ✅
All block/section mutations trigger page cache invalidation:
- Block created → `revalidateTag("pages")`
- Block updated → `revalidateTag("pages")`
- Block deleted → `revalidateTag("pages")`
- Section created → `revalidateTag("pages")`
- Section modified → `revalidateTag("pages")`
- Media associated → `revalidateTag("pages")`

Result: **Page reflects all changes on next normal refresh — no hard-refresh needed** ✅

#### 3. **Multi-Image Display** ✅
The `PageMediaBlock` now defaults to `display_mode: "gallery"`:
- Gallery mode renders all images for a usage_type
- Single mode renders only the first image (selectable via block config)

#### 4. **Fully Generic Implementation**
No tenant-specific or page-specific code:
- Media associations stored in `media_page_associations` table (tenant-scoped via RLS)
- Block structure identical across all pages, all tenants, all websites
- Rendering logic in `PageMediaBlock` uses only block content, no hardcoded paths
- Admin controls in `PageDetailsPanel` work for all tenants and pages

### Real-World Example: Multi-Tenant Scenario

**Setup**: 3 tenants (proplumb.com, kaimusic.com, example.com)

**Scenario**: Admin on proplumb uploads business photo and associates it to Contact page

```
POST /api/admin/media/upload
├─ File: business.jpg
├─ Associated page: 42 (proplumb.com/contact)
├─ Usage type: "hero"
└─ Backend flow:
   ├─ Upload to Storage
   ├─ Create media record (tenant_id = proplumb)
   ├─ Create media_page_associations record
   ├─ Call ensurePageMediaBlock(42, "hero")
   │  ├─ Create default section if needed
   │  └─ Create page_media block with usage_type: "hero"
   ├─ Call revalidateTag("pages") 
   └─ Return mediaId, associatedPages
         ↓
➜ Next page visit: /contact
   ├─ Re-fetches page data
   ├─ Re-fetches blocks (includes page_media block)
   ├─ Re-fetches media_page_associations
   ├─ Image rendered in PageMediaBlock filtered by usage_type: "hero"
   └─ User sees photo ✅

Meanwhile:
- Admin on kaimusic.com does same with hero photo on music page → Works ✅
- Admin on example.com uses gallery mode → Works ✅
- All isolated by tenant_id, all use same code, no conflicts
```

### Testing the Generic Implementation

✅ **Verified behaviors**:
1. Upload media to Page A with usage_type "hero" → block created automatically
2. Upload media to Page B with usage_type "gallery" → different block created (no collision)
3. Visit Page A → media displays (filtered by "hero")
4. Visit Page B → different media displays (filtered by "gallery")
5. Delete image from storage → disappeared on next refresh (no hard-refresh)
6. Change block display_mode in DB → applies on next refresh (no hard-refresh)
7. Delete page_media block → media no longer displays (idempotent re-add via upload)
8. Multiple tenants, different websites, same codebase → All work independently ✅

### Admin UI Features

**PageDetailsPanel Blocks Section**:
- View all blocks on a page
- See block type and usage_type
- Delete individual blocks
- Manually add page_media blocks with custom usage_type
- Get real-time feedback on success/errors

**MediaUploadInput**:
- Select multiple pages during upload
- Choose usage_type (hero, gallery, etc.)
- Auto-creates page_media blocks with matching usage_type
- Works across all tenants and page types

---

## Support & Questions

Refer to:
- This guide for detailed docs and implementation details
- `supabase/migrations/002x_*.sql` for schema and RLS policies
- `packages/lib/src/media/blocks.ts` for auto-block creation logic
- `apps/web/src/app/api/admin/pages/[id]/page-media-block/route.ts` for manual block API
- `apps/web/src/app/admin/pages/page.tsx` for admin UI
- `apps/web/src/lib/cache.ts` for cache strategy
- `ARCHITECTURE.md` for design patterns
