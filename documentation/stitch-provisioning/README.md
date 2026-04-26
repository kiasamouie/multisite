# Stitch → Puck Provisioning

This folder contains everything needed to take a Google **Stitch** design (provided via MCP tools or pasted screen JSON) and provision it into this project's Puck/config-driven website architecture for a specific tenant + page.

The entire workflow runs **inside VS Code with Copilot** — no website-side AI integration, no extra hosting cost.

---

## How to Use (the short version)

1. Drop the inputs into [`inputs/`](inputs/):
   - **Required:** `request.md` — what to build (tenant, page, screen IDs). Use [`inputs/request.template.md`](inputs/request.template.md).
   - **Recommended:** `design.md` — colour palette / typography (free-form markdown).
   - **Optional:** `screens/<screenId>.json` — pre-fetched Stitch screen JSON if you already have it.
2. Open Copilot Chat in VS Code and say:
   > Run the Stitch provisioning workflow using `documentation/stitch-provisioning/inputs/request.md`.
3. Copilot follows [`WORKFLOW.md`](WORKFLOW.md) end-to-end.

That's it. Copilot reads the request, fetches the Stitch screens, downloads images as PNG, parses the design tokens, writes blocks to the DB, and reports back.

---

## Files in this Folder

| File | Purpose |
|---|---|
| [`README.md`](README.md) | This file — entry point |
| [`WORKFLOW.md`](WORKFLOW.md) | The canonical step-by-step Copilot follows |
| [`ADD_NEW_BLOCK_TYPE.md`](ADD_NEW_BLOCK_TYPE.md) | What to do when a Stitch design uses an unmapped component |
| [`EXAMPLE_BIBI_KITCHEN.md`](EXAMPLE_BIBI_KITCHEN.md) | Worked example with real inputs |
| [`inputs/request.template.md`](inputs/request.template.md) | Template you copy + fill in for each provisioning run |
| [`inputs/`](inputs/) | Drop zone for `request.md`, `design.md`, screen JSON exports |

---

## How the Pieces Fit Together

```
┌──────────────────────────────────────────────────────────────────────┐
│  inputs/request.md           ← you write this                        │
│  inputs/design.md            ← you paste design tokens               │
│  Stitch MCP tools            ← Copilot calls these                   │
│           │                                                          │
│           ▼                                                          │
│  packages/lib/src/stitch/parser.ts                                   │
│    parseStitchScreen() → ParsedPage { blocks, warnings, imageRefs }  │
│           │                                                          │
│           ▼                                                          │
│  packages/lib/src/stitch/token-extractor.ts                          │
│    extractBrandingFromDesignMd() → TenantBranding                    │
│           │                                                          │
│           ▼                                                          │
│  scripts/download-stitch-images.mjs                                  │
│    curl -L → media/<tenantId>/*.png + media table rows               │
│           │                                                          │
│           ▼                                                          │
│  scripts/provision-from-stitch.mjs                                   │
│    Patches tenants.branding, writes pages/sections/blocks            │
│    Calls /api/revalidate                                             │
└──────────────────────────────────────────────────────────────────────┘
```

All of the underlying code is **generic** — it operates on the existing `BLOCK_REGISTRY`, `STITCH_BLOCK_MAP`, and Puck config. No tenant-specific code is ever written.

---

## Conventions

- **Images are always saved as PNG.** This is non-negotiable for the workflow — see `scripts/download-stitch-images.mjs`.
- **Re-running the workflow overwrites the page.** Sections + blocks for the target page are deleted and re-inserted. Branding is patched (merged), not replaced.
- **Unmapped components fall back to `rich_text`** with a warning. Follow [`ADD_NEW_BLOCK_TYPE.md`](ADD_NEW_BLOCK_TYPE.md) before re-running to get a proper block.
- **No new React tenant-specific components.** If a new visual pattern is needed, it goes in `BLOCK_REGISTRY` so all tenants benefit.

---

## Related Code

| Path | Role |
|---|---|
| [`packages/lib/src/config/stitchBlockMap.ts`](../../packages/lib/src/config/stitchBlockMap.ts) | Stitch component → block type + field mapping |
| [`packages/lib/src/stitch/`](../../packages/lib/src/stitch/) | Parser + token extractor + types |
| [`packages/template/src/blocks/registry.ts`](../../packages/template/src/blocks/registry.ts) | Block component registry (renderers) |
| [`apps/web/src/lib/puck/config.tsx`](../../apps/web/src/lib/puck/config.tsx) | Puck editor config (BLOCK_FIELDS, BLOCK_DEFAULTS) |
| [`scripts/download-stitch-images.mjs`](../../scripts/download-stitch-images.mjs) | Image downloader + media uploader |
| [`scripts/provision-from-stitch.mjs`](../../scripts/provision-from-stitch.mjs) | DB writer (pages/sections/blocks/branding) |
