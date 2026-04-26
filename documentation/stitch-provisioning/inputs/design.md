```markdown
# Design System Document: High-End Editorial Strategy

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Modern Silk Road."** 

We are moving away from the "template-ready" look of standard restaurant sites. This system is designed to feel like a high-end editorial magazine—think *Vogue Mea* or *Cereal*—blending the rich, historical tapestry of Persian culture with a razor-sharp, modern digital edge. We break the grid through intentional asymmetry, where large-scale typography overlaps photography, and white space is treated as a luxury material rather than just "empty" space. The goal is to make the user feel as though they are being hosted in a premium private kitchen, not just browsing a website.

---

## 2. Colors: The Tonal Palette
The color strategy utilizes a "Deep Harvest" approach, focusing on the luxury of pomegranate and the warmth of saffron.

- **The Primary Signature:** `primary` (#6b0110) serves as our pomegranate heart. It is used sparingly for high-impact CTAs and key brand moments.
- **The Secondary Accent:** `secondary` (#775a19) provides the saffron warmth, used for interactive accents and high-level labels.
- **The Off-White Canvas:** `surface` (#fff8f3) is our creamy foundation, providing a "fine paper" feel that is softer and more premium than pure white.

### The "No-Line" Rule
To maintain an editorial feel, **1px solid borders are strictly prohibited for sectioning.** Physical boundaries must be defined solely through background color shifts. For example, a `surface-container-low` section should sit directly against a `surface` background to define its territory.

### Surface Hierarchy & Nesting
Treat the UI as a series of stacked, fine materials. Use the `surface-container` tiers (Lowest to Highest) to create depth. 
- **Tier 1:** Base background is `surface`.
- **Tier 2:** Main content areas use `surface-container-low`.
- **Tier 3:** Interactive elements or featured cards use `surface-container-high`.
This creates a "nested" depth that feels organic rather than mechanical.

### The "Glass & Gradient" Rule
To add visual "soul," use subtle gradients for primary actions. A transition from `primary` (#6b0110) to `primary_container` (#8b1d24) adds a sense of volume. For floating navigation or overlays, apply **Glassmorphism**: use semi-transparent surface colors with a `backdrop-blur` (12px–20px) to let the rich photography bleed through the UI.

---

## 3. Typography: Editorial Authority
The typography balances the literary weight of a serif with the functional clarity of a modern sans-serif.

- **Display & Headlines (Noto Serif):** These are the "voice" of the brand. Use `display-lg` (3.5rem) with tight letter-spacing for hero sections. Headlines should feel authoritative and poetic.
- **Body & Labels (Manrope):** All functional text uses Manrope. It is a workhorse font that ensures legibility against the complex imagery of Persian cuisine.
- **Hierarchy as Identity:** Create "visual rhythm" by pairing a massive `display-md` headline with a very small, uppercase `label-md` sub-header. This high-contrast scaling is the hallmark of premium design.

---

## 4. Elevation & Depth: Tonal Layering
We reject the standard "material" shadow. Depth is achieved through light and color.

- **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. The subtle shift in hex code creates a "soft lift" that feels more high-end than a shadow.
- **Ambient Shadows:** If a floating effect is necessary (e.g., a modal), use a "Sunlight Shadow." It must be extra-diffused (Blur: 40px+) and low-opacity (4%-6%). The shadow color must be a tinted version of `on-surface` (#221a0e) to mimic natural light.
- **The "Ghost Border" Fallback:** If accessibility requires a border, use the `outline-variant` token at 15% opacity. Never use 100% opaque lines.
- **Persian Accents:** Incorporate subtle Persian patterns as background masks using `surface-variant` colors. These should be nearly invisible—a "whisper" of texture that only becomes apparent upon close inspection.

---

## 5. Components

### Buttons
- **Primary:** Rounded (`xl`: 0.75rem or `full`), using a pomegranate gradient (`primary` to `primary_container`). Text is `on_primary` (#ffffff).
- **Secondary:** Saffron-tinted (`secondary_container`) with a `on_secondary_container` (#785a1a) label. No border.
- **Tertiary:** Pure text using `label-md` styling with a subtle `secondary` underline that grows on hover.

### Cards & Lists
- **Rule:** **No divider lines.**
- Separate items using vertical white space from the spacing scale (minimum 24px) or by alternating background tones (e.g., `surface-container-low` to `surface-container-lowest`).
- Card corners should follow the `xl` (0.75rem) roundedness for a soft, welcoming feel.

### Input Fields
- Use "Underline Only" or "Ghost Box" styling. A box should use `surface-container-highest` with no border. On focus, the `outline` (#8b716f) should appear as a 1px soft-glow bottom border only.

### Chips & Tags
- Use `full` roundedness. Backgrounds should be `secondary_fixed_dim` with `on_secondary_fixed` text for a sophisticated "gold leaf" effect.

### Special Component: The "Signature Accent"
Introduce a "Pattern Overlay" component—a container with a 5% opacity Persian geometric pattern mask that can be placed behind transparent product photography to anchor it to the page.

---

## 6. Do's and Don'ts

### Do:
- **Do** use large amounts of white space (negative space) to let the typography breathe.
- **Do** overlap images and text to create an editorial, non-linear flow.
- **Do** use `backdrop-blur` on all sticky navigation bars.
- **Do** ensure all "Gold" elements use the saffron `secondary` tokens to maintain warmth.

### Don't:
- **Don't** use 1px solid black or grey borders to separate content.
- **Don't** use standard "drop shadows" with 20%+ opacity.
- **Don't** use more than two different font weights in a single component.
- **Don't** crowd the layout; if a section feels busy, increase the padding by 50%.
- **Don't** use pure black (#000000) for text; always use `on_surface` (#221a0e) for a softer, premium read.

---
**Director's Final Note:** This design system is about restraint. Let the quality of the "pomegranate" and "saffron" colors do the heavy lifting. Every element should feel like it was placed with a pair of silver tweezers.```