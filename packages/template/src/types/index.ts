export interface BlockContent {
  [key: string]: unknown;
}

import type { ContentStyle } from "../lib/content-style";
export type { ContentStyle } from "../lib/content-style";

export interface Block {
  id: number;
  section_id: number;
  type: string;
  content: BlockContent;
  position: number;
}

export interface Section {
  id: number;
  page_id: number;
  type: string;
  position: number;
  /**
   * Optional URL anchor slug. When set, the public renderer outputs
   * `<section id={anchor_slug}>` so links like `/about#pricing` deep-link
   * directly to this section. Validated kebab-case at the DB level.
   */
  anchor_slug?: string | null;
  blocks: Block[];
}

export interface Page {
  id: number;
  tenant_id: number;
  slug: string;
  title: string;
  is_published: boolean;
  is_homepage: boolean;
  feature_key?: string | null;
  page_type?: string;
  page_config?: Record<string, unknown>;
  sections: Section[];
  media_associations?: PageMediaAsset[];
  feature_flags?: Record<string, boolean>;
  /** Tenant library content referenced by blocks on this page. */
  library_content?: Partial<
    Record<
      "team" | "testimonials" | "portfolio" | "events" | "blog",
      Array<Record<string, unknown> & { id: number }>
    >
  >;
}

export interface PageMediaAsset {
  id: number;
  media_id: number;
  page_id: number;
  usage_type: string;
  position: number;
  signedUrl: string;
  filename: string;
  /** "image" | "video" | "audio" | "document" | "unknown" */
  type: string;
  metadata: Record<string, unknown>;
}

export interface TenantBranding {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  fontFamily?: string;
}

// ── Generic styling shapes ──
//
// `Styled<string>` lets a title/subtitle field accept either a plain string
// (legacy data) or `{ value, style }` produced by the new editor. Block
// components funnel both through `readStyledText()` so they don't care.
type ContentStyleRef = import("../lib/content-style").ContentStyle;
export type StyledTextValue = string | { value: string; style?: ContentStyleRef };

// ── Existing block content types ──

export interface HeroBlockContent {
  title: StyledTextValue;
  subtitle?: StyledTextValue;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
  backgroundImageId?: number | null;
  /** Styling for the CTA button. */
  ctaButtonStyle?: ContentStyleRef;
  sectionStyle?: ContentStyleRef;
}

export interface ServicesBlockContent {
  title: StyledTextValue;
  services: Array<{
    name: string;
    description: string;
    icon?: string;
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface AboutBlockContent {
  title: StyledTextValue;
  content: StyledTextValue;
  imageUrl?: string;
  imageId?: number | null;
  imageStyle?: ContentStyleRef;
  sectionStyle?: ContentStyleRef;
}

export interface ContactBlockContent {
  title: StyledTextValue;
  subtitle?: StyledTextValue;
  email?: string;
  phone?: string;
  showForm: boolean;
  sectionStyle?: ContentStyleRef;
}

export interface TestimonialsBlockContent {
  title: StyledTextValue;
  /** IDs of testimonials from the tenant content library (preferred). */
  testimonialIds?: number[];
  testimonials: Array<{
    name: string;
    role?: string;
    content: string;
    avatarUrl?: string;
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface CtaBlockContent {
  title: StyledTextValue;
  subtitle?: StyledTextValue;
  buttonText: string;
  buttonLink: string;
  /** Styling for the CTA button. */
  ctaButtonStyle?: ContentStyleRef;
  sectionStyle?: ContentStyleRef;
}

export interface GalleryBlockContent {
  title?: StyledTextValue;
  /** IDs of media from the tenant library (preferred). */
  galleryMediaIds?: number[];
  images: Array<{
    url: string;
    alt: string;
    caption?: string;
  }>;
  sectionStyle?: ContentStyleRef;
}

// ── New block content types ──

export interface RichTextBlockContent {
  html: string;
  sectionStyle?: ContentStyleRef;
}

export interface HeadingBlockContent {
  text: StyledTextValue;
  level: 1 | 2 | 3 | 4;
  alignment?: "left" | "center" | "right";
  sectionStyle?: ContentStyleRef;
}

export interface ImageBlockContent {
  url: string;
  alt: string;
  /** Caption text or `{ value, style }` styled text. */
  caption?: string | { value: string; style?: import("../lib/content-style").ContentStyle };
  width?: number;
  height?: number;
  mediaId?: number | null;
  /** Generic styling applied to the <img>. */
  imageStyle?: import("../lib/content-style").ContentStyle;
  /** Generic styling applied to the wrapping <section>. */
  sectionStyle?: import("../lib/content-style").ContentStyle;
}

export interface VideoBlockContent {
  url: string;
  /** Title text or `{ value, style }` styled text. */
  title?: string | { value: string; style?: import("../lib/content-style").ContentStyle };
  autoplay?: boolean;
  mediaId?: number | null;
  /** Generic styling applied to the video element/container. */
  videoStyle?: import("../lib/content-style").ContentStyle;
  /** Generic styling applied to the wrapping <section>. */
  sectionStyle?: import("../lib/content-style").ContentStyle;
}

export interface TwoColumnBlockContent {
  leftHtml: string;
  rightHtml: string;
  sectionStyle?: ContentStyleRef;
}

export interface PricingTableBlockContent {
  title?: StyledTextValue;
  subtitle?: StyledTextValue;
  tiers: Array<{
    name: string;
    price: string;
    period?: string;
    features: string[];
    ctaText: string;
    ctaLink: string;
    highlighted?: boolean;
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface FaqBlockContent {
  title?: StyledTextValue;
  items: Array<{
    question: string;
    answer: string;
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface TeamBlockContent {
  title?: StyledTextValue;
  /** IDs of team members from the tenant content library (preferred). */
  teamMemberIds?: number[];
  members: Array<{
    name: string;
    role: string;
    imageUrl?: string;
    bio?: string;
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface StatsBlockContent {
  title?: StyledTextValue;
  stats: Array<{
    label: string;
    value: string;
    suffix?: string;
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface MapBlockContent {
  title?: StyledTextValue;
  address: string;
  embedUrl?: string;
  sectionStyle?: ContentStyleRef;
}

export interface SocialLinksBlockContent {
  title?: StyledTextValue;
  links: Array<{
    platform: string;
    url: string;
    label?: string;
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface NewsletterBlockContent {
  title?: StyledTextValue;
  subtitle?: StyledTextValue;
  placeholder?: string;
  buttonText?: string;
  sectionStyle?: ContentStyleRef;
}

export interface OpeningHoursBlockContent {
  title?: StyledTextValue;
  hours: Array<{
    day: string;
    open: string;
    close: string;
    closed?: boolean;
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface PortfolioBlockContent {
  title?: StyledTextValue;
  /** IDs of portfolio items from the tenant content library (preferred). */
  portfolioItemIds?: number[];
  projects: Array<{
    title: string;
    description?: string;
    imageUrl: string;
    link?: string;
    tags?: string[];
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface EventsListBlockContent {
  title?: StyledTextValue;
  /** IDs of events from the tenant content library (preferred). */
  eventIds?: number[];
  events: Array<{
    name: string;
    date: string;
    venue?: string;
    city?: string;
    ticketUrl?: string;
    description?: string;
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface FeaturesListBlockContent {
  title?: StyledTextValue;
  subtitle?: StyledTextValue;
  features: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface ReviewsCarouselBlockContent {
  title?: StyledTextValue;
  reviews: Array<{
    author: string;
    rating: number;
    content: string;
    date?: string;
    source?: string;
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface BlogGridBlockContent {
  title?: StyledTextValue;
  /** IDs of blog posts from the tenant content library (preferred). */
  blogPostIds?: number[];
  posts: Array<{
    title: string;
    excerpt: string;
    imageUrl?: string;
    href: string;
    date?: string;
    author?: string;
  }>;
  sectionStyle?: ContentStyleRef;
}

export interface PageMediaBlockContent {
  /** Which media to show — matches usage_type in media_page_associations */
  usage_type: string;
  /** "single" | "gallery" | "list" — how to render multiple assets */
  display_mode?: "single" | "gallery" | "list";
  /** Optional title shown above the media */
  title?: string;
}

/**
 * Content stored for the `site_header` Puck block.
 * This block lives on a special `page_type: "site_header"` page.
 * `layout.tsx` reads it to configure `SiteNav`.
 */
/**
 * Nav link entry on the site header. Discriminated union (back-compat —
 * old rows without `kind` are interpreted as `"page"`).
 *
 *  - `page`     → links to a tenant page
 *  - `anchor`   → deep-links to a section, e.g. `/about#pricing`
 *  - `external` → arbitrary URL
 *
 * Mirrors `NavPageRef` in `@repo/lib/tenant/context`.
 */
export interface NavPageRef {
  /** Discriminator — defaults to `"page"` when missing. */
  kind?: "page" | "anchor" | "external";
  /** Page id for `page` and `anchor` kinds. Optional for `external`. */
  id?: number;
  /** Section id for `anchor` kinds. */
  sectionId?: number;
  title: string;
  /** Pre-resolved href used by the renderer. */
  href: string;
}

export type HeaderSlotItemKind = "text" | "image" | "button";

export type SlotTextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
export type SlotTextWeight = "normal" | "medium" | "semibold" | "bold";
export type SlotButtonSize = "sm" | "default" | "lg";
export type SlotRounded = "none" | "sm" | "md" | "lg" | "full";

/**
 * A single item inside a header/footer slot.
 * `kind` determines which subset of fields is meaningful.
 * All style fields are optional — omit for sensible defaults.
 */
export interface HeaderSlotItem {
  kind: HeaderSlotItemKind;
  /** Text content for `text` or `button` kinds. */
  text?: string;
  /** Media library id for `image` kind. */
  imageId?: number | null;
  /** Optional link — works for all kinds. */
  href?: string;

  // ── Text style (kind === "text") ──
  textSize?: SlotTextSize;
  /** Pixel font size (slider). When set, takes precedence over `textSize`. */
  textSizePx?: number;
  textWeight?: SlotTextWeight;
  textColor?: string;          // CSS colour (hex / rgb / var)
  italic?: boolean;
  /** CSS font-family stack — see FONT_FAMILIES for the curated list. */
  fontFamily?: string;
  /** Unitless line-height multiplier (e.g. 1.5). */
  lineHeight?: number;
  /** Letter spacing in em (e.g. 0.05 = 0.05em). Negative tightens. */
  letterSpacingEm?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through";

  // ── Image style (kind === "image") ──
  imageHeight?: number;        // in px, applied to `height`
  imageRounded?: SlotRounded;
  /** Pixel border-radius (slider). When set, takes precedence over `imageRounded`. */
  imageRoundedPx?: number;
  imageAlt?: string;

  // ── Button style (kind === "button") ──
  variant?: "default" | "outline" | "ghost";
  buttonSize?: SlotButtonSize;
  buttonBg?: string;           // custom bg colour (hex) — only for variant=default
  buttonFg?: string;           // custom text colour (hex)

  // ── Shared ──
  marginX?: number;            // extra horizontal margin in px
}

export interface MenuCategoryBlockContent {
  /** Section heading, e.g. "Mezze", "Mains", "Desserts" */
  title: StyledTextValue;
  /** Short ordinal label shown beside the heading, e.g. "01" */
  sectionNumber?: string;
  /** Menu items in this category */
  items: Array<{
    name: string;
    description?: string;
    price?: string;
  }>;
  /**
   * Optional editorial highlight — rendered more prominently than a regular item.
   * Useful for a signature dish or chef's recommendation.
   */
  featuredItem?: {
    title: string;
    description?: string;
    price?: string;
    imageUrl?: string;
  };
  /** Optional category image shown alongside the items list */
  imageUrl?: string;
  sectionStyle?: ContentStyleRef;
}

export interface SiteHeaderBlockContent {
  leftItems?: HeaderSlotItem[];
  rightItems?: HeaderSlotItem[];
  /** Published pages to show as nav links between left and right slots. */
  navPages?: NavPageRef[];
  sticky?: boolean;
  /**
   * When true AND `sticky` is true, the header renders fully transparent
   * at the top of the page and smoothly transitions to its configured
   * background colour once the user scrolls. No effect if `sticky` is false.
   */
  scrollTransparency?: boolean;
  borderBottom?: boolean;
  /**
   * Bulk text styling applied to the auto-generated nav page links
   * (the middle list, between left and right slot items).
   * Does NOT affect leftItems or rightItems.
   */
  navPagesTextStyle?: ContentStyle;
  sectionStyle?: ContentStyle;
}

/**
 * Footer content — three independent slot arrays.
 * The footer has NO navPages field (that is a header-only concept);
 * tenants add any links they want as slot items.
 */
export interface SiteFooterBlockContent {
  leftItems?: HeaderSlotItem[];
  centerItems?: HeaderSlotItem[];
  rightItems?: HeaderSlotItem[];
  borderTop?: boolean;

  sectionStyle?: ContentStyle;
}
