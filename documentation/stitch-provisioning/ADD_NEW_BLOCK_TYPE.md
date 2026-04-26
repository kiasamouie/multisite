# Adding a New Block Type

Follow this when the parser reports `warnings` for an unmapped Stitch component, **or** when a Stitch design has a section pattern that doesn't fit any of our existing 27 blocks.

The principle: **never write tenant-specific code.** A new pattern becomes a new generic block type that every tenant can use.

---

## When to Add a New Block Type

You see output like:

```
⚠️  1 unmapped Stitch component(s):
   • [before-after-slider] page=services pos=2 → fallback=rich_text
   Run the add-block-type prompt to extend the registry.
```

That means the Stitch design used `before-after-slider` and we have no equivalent. Add it.

---

## The 5 Files You Touch

### 1. Component (renderer)
**Create:** `packages/template/src/components/blocks/<NewBlock>.tsx`

```tsx
import type { BlockContent } from "../../types";

interface Props {
  content: BlockContent & {
    title?: string;
    // ...your block-specific content fields
  };
}

export function BeforeAfterSliderBlock({ content }: Props) {
  return (
    <section className="...">
      {/* Render your block. Use Tailwind + theme tokens. */}
    </section>
  );
}
```

Keep it stateless and config-driven. No hardcoded colours — use theme tokens.

### 2. Block Registry
**Edit:** [`packages/template/src/blocks/registry.ts`](../../packages/template/src/blocks/registry.ts)

```ts
import { BeforeAfterSliderBlock } from "../components/blocks/BeforeAfterSliderBlock";

// add to entries[]:
{ type: "before_after_slider", label: "Before / After Slider", category: "social",
  description: "Image comparison slider", component: BeforeAfterSliderBlock },
```

### 3. Puck Config
**Edit:** [`apps/web/src/lib/puck/config.tsx`](../../apps/web/src/lib/puck/config.tsx)

Add to `BLOCK_FIELDS`:

```ts
before_after_slider: {
  title:       { type: "text", label: "Title" },
  beforeImage: { type: "custom", label: "Before Image", render: null as unknown },
  afterImage:  { type: "custom", label: "After Image",  render: null as unknown },
},
```

Add to `BLOCK_DEFAULTS`:

```ts
before_after_slider: { title: "Compare", beforeImage: "", afterImage: "" },
```

If the block has image fields, register them in `MEDIA_PICKER_FIELDS`:

```ts
{ blockType: "before_after_slider", fieldKey: "beforeImage", mediaType: "image" as const },
{ blockType: "before_after_slider", fieldKey: "afterImage",  mediaType: "image" as const },
```

Add the type to a category in `buildPuckConfig`:

```ts
social: {
  title: "Social & Community",
  components: ["testimonials", "gallery", "social_links", "newsletter", "reviews_carousel", "blog_grid", "before_after_slider"],
},
```

### 4. Stitch Block Map
**Edit:** [`packages/lib/src/config/stitchBlockMap.ts`](../../packages/lib/src/config/stitchBlockMap.ts)

```ts
"before-after-slider": {
  blockType: "before_after_slider",
  description: "Image comparison slider",
  contentMapping: {
    title: "title",
    beforeImage: "beforeImage",
    afterImage: "afterImage",
  },
  imageFields: ["beforeImage", "afterImage"],
},
```

Also append a line to `STITCH_DESIGN_MD` so future Stitch designs use the right vocabulary:

```
- **before_after_slider**: Side-by-side image comparison
```

### 5. Re-run the Workflow
Restart from Step 4 in [`WORKFLOW.md`](WORKFLOW.md). The new block type will resolve cleanly.

---

## Verification Checklist

- [ ] `pnpm --filter web exec tsc --noEmit` passes
- [ ] The block renders correctly on a test page
- [ ] The block appears in the Puck editor sidebar under the right category
- [ ] Re-parsing the original Stitch screen no longer produces a warning for this type

---

## Anti-Patterns (Don't)

- ❌ Don't name the block after a tenant (`BibiHeroBlock`)
- ❌ Don't add hardcoded colours / tenant-specific content
- ❌ Don't bypass the registry and reference the component directly anywhere in the renderer
- ❌ Don't skip the Puck `BLOCK_FIELDS` entry — the block becomes uneditable in the admin UI
