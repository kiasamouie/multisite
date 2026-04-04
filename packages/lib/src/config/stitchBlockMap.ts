/**
 * Mapping from Stitch screen component patterns → block registry types.
 *
 * When reading a Stitch screen, we identify UI patterns by their
 * descriptive names / structure and map them to our block types.
 * The seeder script uses this to convert Stitch output → DB records.
 *
 * Each entry maps a Stitch component pattern (as it appears in the screen
 * description or component tree) to the block type string used in our
 * BLOCK_REGISTRY and the expected content shape.
 */
export const STITCH_BLOCK_MAP: Record<
  string,
  { blockType: string; description: string }
> = {
  // Hero / Promo
  hero: { blockType: "hero", description: "Full-width hero with title, subtitle, CTA" },
  "call-to-action": { blockType: "cta", description: "CTA section" },
  "pricing-table": { blockType: "pricing_table", description: "Pricing tiers" },

  // Content
  "rich-text": { blockType: "rich_text", description: "Freeform text content" },
  heading: { blockType: "heading", description: "Section heading" },
  image: { blockType: "image", description: "Single image with caption" },
  video: { blockType: "video", description: "Embedded video player" },
  "two-column": { blockType: "two_column", description: "Side-by-side layout" },

  // Business
  services: { blockType: "services", description: "Service cards grid" },
  team: { blockType: "team", description: "Team member profiles" },
  statistics: { blockType: "stats", description: "Key numbers and metrics" },
  "opening-hours": { blockType: "opening_hours", description: "Business hours" },
  faq: { blockType: "faq", description: "Frequently asked questions" },
  portfolio: { blockType: "portfolio", description: "Project showcase grid" },

  // Social
  testimonials: { blockType: "testimonials", description: "Customer testimonials" },
  gallery: { blockType: "gallery", description: "Image gallery grid" },
  "social-links": { blockType: "social_links", description: "Social media links" },
  newsletter: { blockType: "newsletter", description: "Email signup form" },
  reviews: { blockType: "reviews_carousel", description: "Customer review carousel" },

  // Info
  about: { blockType: "about", description: "About section with image" },
  contact: { blockType: "contact", description: "Contact info and form" },
  map: { blockType: "map", description: "Embedded map location" },
  events: { blockType: "events_list", description: "Upcoming events listing" },
  "blog-grid": { blockType: "blog_grid", description: "Blog post cards grid" },
  features: { blockType: "features_list", description: "Feature list with icons" },

  // Dynamic
  "page-media": { blockType: "page_media", description: "Media from DB associations" },
};

/**
 * The Stitch Design System markdown that describes our platform's block
 * library. This is embedded when creating a Stitch design system so the
 * AI generates screens using our component vocabulary.
 */
export const STITCH_DESIGN_MD = `
# Multisite Platform Block Library

When generating screens, structure them as vertical sections.
Each section maps to one of these block types:

## Available Block Types
- **hero**: Full-width hero with title, subtitle, CTA button, optional background image
- **cta**: Call to action section with title, subtitle, button
- **pricing_table**: Pricing tier comparison cards
- **rich_text**: Freeform HTML/text content
- **heading**: Section heading (H1-H4) with alignment
- **image**: Single image with optional caption
- **video**: Embedded video (YouTube/Vimeo/native)
- **two_column**: Side-by-side content layout
- **services**: Grid of service cards (name, description, icon)
- **team**: Team member profiles (name, role, photo, bio)
- **stats**: Key metrics (label, value, suffix)
- **opening_hours**: Business hours schedule
- **faq**: Accordion Q&A list
- **portfolio**: Project cards with tags
- **testimonials**: Customer testimonial cards
- **gallery**: Image gallery grid
- **social_links**: Social media profile links
- **newsletter**: Email signup form
- **reviews_carousel**: Customer review cards with ratings
- **about**: About section with image and text
- **contact**: Contact form and info
- **map**: Embedded map location
- **events_list**: Upcoming events cards
- **blog_grid**: Blog post card grid
- **features_list**: Feature list with icons and descriptions
- **page_media**: Dynamic media from database (usage_type: hero|thumbnail|gallery|background|icon)

## Design Rules
- Each distinct visual section = one block
- Stack blocks vertically — one per section
- Use clear section dividers between blocks
- Label each section with its block type name
`;
