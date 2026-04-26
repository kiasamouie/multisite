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
 *
 * Fields:
 * - blockType:      Our block-registry type key (e.g. "hero")
 * - description:    Human-readable description (used in design system MD)
 * - contentMapping: Stitch field name → our block content key. Used by
 *                   the parser to translate Stitch component props into
 *                   our block.content shape.
 * - imageFields:    List of content keys that hold image URLs/paths.
 *                   These trigger image download + media-record creation
 *                   during provisioning. The downstream content keys are
 *                   replaced with our local media URLs.
 */
export interface StitchBlockMapping {
  blockType: string;
  description: string;
  contentMapping: Record<string, string>;
  imageFields: string[];
}

export const STITCH_BLOCK_MAP: Record<string, StitchBlockMapping> = {
  // ── Hero / Promo ───────────────────────────────────────────────────────
  hero: {
    blockType: "hero",
    description: "Full-width hero with title, subtitle, CTA",
    contentMapping: {
      title: "title",
      headline: "title",
      subtitle: "subtitle",
      tagline: "subtitle",
      ctaText: "ctaText",
      buttonText: "ctaText",
      ctaLink: "ctaLink",
      buttonLink: "ctaLink",
      backgroundImage: "backgroundImage",
      image: "backgroundImage",
    },
    imageFields: ["backgroundImage"],
  },
  "call-to-action": {
    blockType: "cta",
    description: "CTA section",
    contentMapping: {
      title: "title",
      subtitle: "subtitle",
      buttonText: "buttonText",
      buttonLink: "buttonLink",
    },
    imageFields: [],
  },
  "pricing-table": {
    blockType: "pricing_table",
    description: "Pricing tiers",
    contentMapping: { title: "title", subtitle: "subtitle", tiers: "tiers" },
    imageFields: [],
  },

  // ── Content ────────────────────────────────────────────────────────────
  "rich-text": {
    blockType: "rich_text",
    description: "Freeform text content",
    contentMapping: { html: "html", content: "html" },
    imageFields: [],
  },
  heading: {
    blockType: "heading",
    description: "Section heading",
    contentMapping: { text: "text", title: "text", level: "level", alignment: "alignment" },
    imageFields: [],
  },
  image: {
    blockType: "image",
    description: "Single image with caption",
    contentMapping: { url: "url", src: "url", alt: "alt", caption: "caption" },
    imageFields: ["url"],
  },
  video: {
    blockType: "video",
    description: "Embedded video player",
    contentMapping: { url: "url", src: "url", title: "title" },
    imageFields: [],
  },
  "two-column": {
    blockType: "two_column",
    description: "Side-by-side layout",
    contentMapping: { leftHtml: "leftHtml", rightHtml: "rightHtml" },
    imageFields: [],
  },

  // ── Business ───────────────────────────────────────────────────────────
  services: {
    blockType: "services",
    description: "Service cards grid",
    contentMapping: { title: "title", services: "services", items: "services" },
    imageFields: [],
  },
  team: {
    blockType: "team",
    description: "Team member profiles",
    contentMapping: { title: "title", members: "members", items: "members" },
    imageFields: [],
  },
  statistics: {
    blockType: "stats",
    description: "Key numbers and metrics",
    contentMapping: { title: "title", stats: "stats", items: "stats" },
    imageFields: [],
  },
  "opening-hours": {
    blockType: "opening_hours",
    description: "Business hours",
    contentMapping: { title: "title", hours: "hours" },
    imageFields: [],
  },
  faq: {
    blockType: "faq",
    description: "Frequently asked questions",
    contentMapping: { title: "title", items: "items" },
    imageFields: [],
  },
  portfolio: {
    blockType: "portfolio",
    description: "Project showcase grid",
    contentMapping: { title: "title", projects: "projects", items: "projects" },
    imageFields: [],
  },

  // ── Social ─────────────────────────────────────────────────────────────
  testimonials: {
    blockType: "testimonials",
    description: "Customer testimonials",
    contentMapping: { title: "title", testimonials: "testimonials", items: "testimonials" },
    imageFields: [],
  },
  gallery: {
    blockType: "gallery",
    description: "Image gallery grid",
    contentMapping: { title: "title", images: "images", items: "images" },
    imageFields: [],
  },
  "social-links": {
    blockType: "social_links",
    description: "Social media links",
    contentMapping: { title: "title", links: "links" },
    imageFields: [],
  },
  newsletter: {
    blockType: "newsletter",
    description: "Email signup form",
    contentMapping: { title: "title", subtitle: "subtitle", buttonText: "buttonText" },
    imageFields: [],
  },
  reviews: {
    blockType: "reviews_carousel",
    description: "Customer review carousel",
    contentMapping: { title: "title", reviews: "reviews", items: "reviews" },
    imageFields: [],
  },

  // ── Info ───────────────────────────────────────────────────────────────
  about: {
    blockType: "about",
    description: "About section with image",
    contentMapping: { title: "title", content: "content", imageUrl: "imageUrl", image: "imageUrl" },
    imageFields: ["imageUrl"],
  },
  contact: {
    blockType: "contact",
    description: "Contact info and form",
    contentMapping: {
      title: "title",
      subtitle: "subtitle",
      email: "email",
      phone: "phone",
      address: "address",
      showForm: "showForm",
    },
    imageFields: [],
  },
  map: {
    blockType: "map",
    description: "Embedded map location",
    contentMapping: { title: "title", address: "address" },
    imageFields: [],
  },
  events: {
    blockType: "events_list",
    description: "Upcoming events listing",
    contentMapping: { title: "title", events: "events" },
    imageFields: [],
  },
  "blog-grid": {
    blockType: "blog_grid",
    description: "Blog post cards grid",
    contentMapping: { title: "title", posts: "posts" },
    imageFields: [],
  },
  features: {
    blockType: "features_list",
    description: "Feature list with icons",
    contentMapping: { title: "title", subtitle: "subtitle", features: "features" },
    imageFields: [],
  },

  // ── Food & Beverage ────────────────────────────────────────────────────
  "menu-category": {
    blockType: "menu_category",
    description: "Restaurant menu section with items, prices, and optional featured dish",
    contentMapping: {
      title: "title",
      sectionNumber: "sectionNumber",
      items: "items",
      featuredItem: "featuredItem",
      imageUrl: "imageUrl",
    },
    imageFields: ["imageUrl"],
  },
  "menu-section": {
    blockType: "menu_category",
    description: "Restaurant menu section (alias)",
    contentMapping: {
      title: "title",
      sectionNumber: "sectionNumber",
      items: "items",
      featuredItem: "featuredItem",
      imageUrl: "imageUrl",
    },
    imageFields: ["imageUrl"],
  },

  // ── Dynamic ────────────────────────────────────────────────────────────
  "page-media": {
    blockType: "page_media",
    description: "Media from DB associations",
    contentMapping: { usageType: "usage_type", displayMode: "display_mode", title: "title" },
    imageFields: [],
  },
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
- **menu_category**: Restaurant menu section (items with name, description, price; optional featured dish and category image)
- **page_media**: Dynamic media from database (usage_type: hero|thumbnail|gallery|background|icon)

## Design Rules
- Each distinct visual section = one block
- Stack blocks vertically — one per section
- Use clear section dividers between blocks
- Label each section with its block type name
`;
