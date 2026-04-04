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
- **Added**: `revalidateTag("media")` after successful creation to clear any tag-based caches
- Creates associations or skips silently if validation fails

##### POST `/api/admin/media/[id]/associations` (New)
- Create page-media association programmatically
- Returns association record on success

##### GET `/api/admin/pages` (New)
- Fetches pages for tenant (used in dropdown)
- Returns: `id`, `title`, `slug`, `is_published`
- Filters by tenant, ordered by title
- Respects user permissions (tenant members only, super admin can see all)

##### DELETE `/api/media/[id]` (Enhanced)
- Delete media record and storage file
- **Added**: `revalidateTag("media")` after deletion to ensure cached data clears (if any tag-based caches are added back in future)

##### DELETE `/api/admin/media/[id]/associations` (New)
- Remove a media-page association
- Validates tenant ownership

#### 3. Component Enhancement

##### MediaUploadInput
**New Features**:
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

#### 4. Caching Strategy (Critical Fix)

**Problem Identified**: Users had to hard-refresh pages to see updates after deleting media or changing block display settings.

**Root Causes Found and Fixed**:

1. **Block `display_mode: "single"` only renders `assets[0]`**
   - Multiple uploads were stored but only first shown
   - **Fixed**: Changed default in `PageMediaBlock.tsx` from `"single"` to `"gallery"`
   - Cloud DB blocks already patched via REST API during investigation

2. **`getCachedPageMedia` wrapped in `unstable_cache` with `revalidate: false`**
   - Cache never auto-cleared, only by explicit tag invalidation
   - Delete operations didn't call `revalidateTag("media")`
   - **Fixed**: Removed `unstable_cache` entirely from `getCachedPageMedia`

3. **Delete operations didn't invalidate cache**
   - **Fixed**: Added `revalidateTag("media")` to delete route

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

- **Delete route** in `apps/web/src/app/api/media/[id]/route.ts` — Added `revalidateTag("media")` import and call after deletion as a safety measure for any future tag-based caching.

- **Page route revalidation** — Existing `export const revalidate = 0` on `[slug]/page.tsx` ensures the page is fully dynamic — every request re-renders server components fresh.

**Result**: **No hard-refresh needed anywhere**. Upload media → appears immediately on refresh. Delete media → disappears immediately on refresh. Change display settings → updates immediately on refresh.

#### 5. TypeScript Types
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
└─ Call revalidateTag("media")
         ↓
Return mediaId + associatedPages
         ↓
Component callback with results
         ↓
Page visitors see updated media on next normal page refresh (no hard-refresh necessary)
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

### Tag-Based Invalidation (Backup)

Although media is not cached, `revalidateTag("media")` is called after mutations as a safety measure:
- `POST /api/admin/media/upload` — calls `revalidateTag("media")`
- `DELETE /api/media/[id]` — calls `revalidateTag("media")`

If future features add tag-based caching, these tags will be invalidated automatically.

---

## Files Changed/Created

### Database
- ✅ `supabase/migrations/0020_create_media_page_associations.sql` (NEW)
- ✅ `supabase/migrations/0021_fix_media_page_associations_rls.sql` (Refinement)
- ✅ `supabase/migrations/0022_platform_admin_media_associations_rls.sql` (Refinement)
- ✅ `supabase/migrations/0023_public_media_page_associations_rls.sql` (Refinement)

### API Routes
- ✅ `apps/web/src/app/api/admin/media/upload/route.ts` (ENHANCED - added revalidateTag)
- ✅ `apps/web/src/app/api/admin/pages/route.ts` (NEW)
- ✅ `apps/web/src/app/api/admin/media/[id]/associations/route.ts` (NEW)
- ✅ `apps/web/src/app/api/media/[id]/route.ts` (ENHANCED - added revalidateTag)

### Cache Layer
- ✅ `apps/web/src/lib/cache.ts` (FIXED - removed unstable_cache from getCachedPageMedia)

### Components
- ✅ `apps/web/src/components/admin/media/MediaUploadInput.tsx` (ENHANCED - multi-file, staging, submit button)
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

## Support & Questions

Refer to:
- This guide for detailed docs and implementation details
- `supabase/migrations/002x_*.sql` for schema and RLS policies
- `apps/web/src/components/admin/media/MediaUploadInput.tsx` for UI implementation
- `apps/web/src/lib/cache.ts` for cache strategy
- `ARCHITECTURE.md` for design patterns
