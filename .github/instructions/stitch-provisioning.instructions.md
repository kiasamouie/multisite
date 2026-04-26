---
applyTo: "documentation/stitch-provisioning/**,packages/lib/src/stitch/**,packages/lib/src/config/stitchBlockMap.ts,scripts/download-stitch-images.mjs,scripts/provision-from-stitch.mjs"
---

# Stitch → Puck Provisioning Instructions

When the user references Stitch designs, the `documentation/stitch-provisioning/` folder, or asks you to provision a website from a Google Stitch project / MCP / screen export — follow the canonical workflow.

## Mandatory Reading (in order)

1. [documentation/stitch-provisioning/README.md](../../documentation/stitch-provisioning/README.md) — overview + folder map
2. [documentation/stitch-provisioning/WORKFLOW.md](../../documentation/stitch-provisioning/WORKFLOW.md) — the 10-step canonical sequence
3. [documentation/stitch-provisioning/ADD_NEW_BLOCK_TYPE.md](../../documentation/stitch-provisioning/ADD_NEW_BLOCK_TYPE.md) — when parser produces warnings
4. [documentation/stitch-provisioning/EXAMPLE_BIBI_KITCHEN.md](../../documentation/stitch-provisioning/EXAMPLE_BIBI_KITCHEN.md) — worked example

## Trigger Phrases

If the user says any of:
- "Run the Stitch provisioning workflow"
- "Build this Stitch design on `<tenant>`"
- "Use the Stitch MCP for this project"
- mentions a Stitch project ID + screen ID + tenant

→ Open `documentation/stitch-provisioning/inputs/request.md` and execute `WORKFLOW.md` end-to-end.

## Hard Rules

- **Always download images as PNG** — `scripts/download-stitch-images.mjs` enforces this; do not bypass it. If images use `lh3.googleusercontent.com/aida/` (NOT `aida-public/`) they require Google auth and cannot be downloaded server-side — leave `imageUrl` fields empty and note this to the user.
- **No tenant-specific React code.** New visual patterns become new generic block types in `BLOCK_REGISTRY` (see `ADD_NEW_BLOCK_TYPE.md`).
- **Re-running overwrites** — `scripts/provision-from-stitch.mjs` deletes existing sections/blocks for the target page. Confirm with the user before running if `request.md` notes existing custom edits.
- **Use the existing scripts** — don't write inline ad-hoc DB writes. Use `scripts/download-stitch-images.mjs` and `scripts/provision-from-stitch.mjs`.
- **Stop on warnings** — if `parseStitchScreen` returns any unmapped components, follow `ADD_NEW_BLOCK_TYPE.md` before continuing.
- **Always resolve tenant ID from DB** — query `tenants` by slug or domain. Never trust the numeric ID written in `request.md`; it may be stale or wrong.
- **Stitch MCP requires canonical `name` path** — `mcp_stitch_get_screen` takes `name: "projects/<projectId>/screens/<screenId>"`, NOT a bare hex screen ID. Project IDs > 15 decimal digits (> 2^53) must be sent via raw `curl` JSON-RPC to avoid JS number precision loss in the VS Code MCP wrapper.
- **Write BOTH branding locations** — after provisioning, `scripts/provision-from-stitch.mjs` only writes `tenants.branding` (which sets `--tenant-primary` for the nav component). Tailwind semantic tokens (`bg-primary`, `text-foreground`, `bg-card`, etc.) come from `site_settings.theme.palette` processed by `paletteToCssVars()`. You MUST also write `site_settings.theme` with `palette`, `mode`, and `font` — otherwise the public site renders with the wrong (often dark) colours.
- **Create real pages for navbar items** — when the Stitch design shows internal nav links, create `pages` rows (`page_type: "custom"`, `is_published: true`) and use `NavPageRef` with `kind: "page"` and the real `pages.id`. Never use `kind: "external"` with `#anchor` hrefs for internal site pages.
- **Update the site_header page** — there is a separate `page_type: "site_header"` page per tenant that holds `site_header` and `site_footer` blocks. `provision-from-stitch.mjs` does NOT touch it. After provisioning the content page, also update the site_header block's `logoText`, `navPages`, `ctaText`, `ctaLink`, and the site_footer block's content.
- **Set per-section backgrounds** — use `content.sectionStyle.backgroundColor` (hex) on each block for sections that have a distinct background colour in the design. `sectionAttrs()` in `packages/template/src/lib/styled-block.ts` applies this to every block type automatically.

## Code Surfaces You Touch

| Concern | File |
|---|---|
| Stitch component → block mapping + image fields | [packages/lib/src/config/stitchBlockMap.ts](../../packages/lib/src/config/stitchBlockMap.ts) |
| Parser + token extractor | [packages/lib/src/stitch/](../../packages/lib/src/stitch/) |
| Block renderers | [packages/template/src/blocks/registry.ts](../../packages/template/src/blocks/registry.ts) |
| Puck editor fields/defaults | [apps/web/src/lib/puck/config.tsx](../../apps/web/src/lib/puck/config.tsx) |
| Image downloader | [scripts/download-stitch-images.mjs](../../scripts/download-stitch-images.mjs) |
| DB writer | [scripts/provision-from-stitch.mjs](../../scripts/provision-from-stitch.mjs) |

## When Adding a New Block Type

Strictly follow [ADD_NEW_BLOCK_TYPE.md](../../documentation/stitch-provisioning/ADD_NEW_BLOCK_TYPE.md). All 5 files (block component, registry, Puck fields, Puck defaults, stitch map + design MD) must be updated together.
