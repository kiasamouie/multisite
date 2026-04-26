import type { BlockContent } from "../types";

// ── Render components (existing) ──
import { HeroBlock } from "../components/blocks/HeroBlock";
import { ServicesBlock } from "../components/blocks/ServicesBlock";
import { AboutBlock } from "../components/blocks/AboutBlock";
import { ContactBlock } from "../components/blocks/ContactBlock";
import { TestimonialsBlock } from "../components/blocks/TestimonialsBlock";
import { CtaBlock } from "../components/blocks/CtaBlock";
import { GalleryBlock } from "../components/blocks/GalleryBlock";

// ── Render components (new) ──
import { RichTextBlock } from "../components/blocks/RichTextBlock";
import { HeadingBlock } from "../components/blocks/HeadingBlock";
import { ImageBlock } from "../components/blocks/ImageBlock";
import { VideoBlock } from "../components/blocks/VideoBlock";
import { TwoColumnBlock } from "../components/blocks/TwoColumnBlock";
import { PricingTableBlock } from "../components/blocks/PricingTableBlock";
import { FaqBlock } from "../components/blocks/FaqBlock";
import { TeamBlock } from "../components/blocks/TeamBlock";
import { StatsBlock } from "../components/blocks/StatsBlock";
import { MapBlock } from "../components/blocks/MapBlock";
import { SocialLinksBlock } from "../components/blocks/SocialLinksBlock";
import { NewsletterBlock } from "../components/blocks/NewsletterBlock";
import { OpeningHoursBlock } from "../components/blocks/OpeningHoursBlock";
import { PortfolioBlock } from "../components/blocks/PortfolioBlock";
import { EventsListBlock } from "../components/blocks/EventsListBlock";
import { FeaturesListBlock } from "../components/blocks/FeaturesListBlock";
import { ReviewsCarouselBlock } from "../components/blocks/ReviewsCarouselBlock";
import { BlogGridBlock } from "../components/blocks/BlogGridBlock";
import { PageMediaBlock } from "../components/blocks/PageMediaBlock";
import { BookingBlock } from "../components/blocks/BookingBlock";
import { NavbarBlock } from "../components/blocks/NavbarBlock";
import { SiteFooterBlock } from "../components/blocks/SiteFooterBlock";
import { PageContentPlaceholderBlock } from "../components/blocks/PageContentPlaceholderBlock";
import { MenuCategoryBlock } from "../components/blocks/MenuCategoryBlock";

export type BlockCategory =
  | "hero"
  | "content"
  | "business"
  | "social"
  | "info"
  | "layout";

export interface BlockRegistryEntry {
  type: string;
  label: string;
  category: BlockCategory;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<{ content: any }>;
}

const entries: BlockRegistryEntry[] = [
  // ── Hero / Promo ──
  { type: "hero", label: "Hero", category: "hero", description: "Full-width hero with title, subtitle, CTA", component: HeroBlock },
  { type: "cta", label: "Call to Action", category: "hero", description: "Attention-grabbing CTA section", component: CtaBlock },
  { type: "pricing_table", label: "Pricing Table", category: "hero", description: "Plan comparison with pricing tiers", component: PricingTableBlock },

  // ── Content ──
  { type: "rich_text", label: "Rich Text", category: "content", description: "Freeform text content", component: RichTextBlock },
  { type: "heading", label: "Heading", category: "content", description: "Section heading (H1–H4)", component: HeadingBlock },
  { type: "image", label: "Image", category: "content", description: "Single image with caption", component: ImageBlock },
  { type: "video", label: "Video", category: "content", description: "Embedded video player", component: VideoBlock },
  { type: "two_column", label: "Two Column", category: "content", description: "Side-by-side content layout", component: TwoColumnBlock },

  // ── Business ──
  { type: "services", label: "Services", category: "business", description: "Service cards grid", component: ServicesBlock },
  { type: "team", label: "Team", category: "business", description: "Team member profiles", component: TeamBlock },
  { type: "stats", label: "Statistics", category: "business", description: "Key numbers and metrics", component: StatsBlock },
  { type: "opening_hours", label: "Opening Hours", category: "business", description: "Business hours schedule", component: OpeningHoursBlock },
  { type: "faq", label: "FAQ", category: "business", description: "Frequently asked questions", component: FaqBlock },
  { type: "portfolio", label: "Portfolio", category: "business", description: "Project showcase grid", component: PortfolioBlock },
  { type: "menu_category", label: "Menu Category", category: "business", description: "Restaurant menu section with items, prices, and optional featured dish", component: MenuCategoryBlock },
  { type: "booking_block", label: "Booking / Reservations", category: "business", description: "Let customers book appointments or reserve tables. Works for restaurants, barbers, salons, gyms, and more.", component: BookingBlock },

  // ── Layout ──
  { type: "site_header", label: "Site Header / Navbar", category: "layout", description: "Customise the site-wide navigation bar with any mix of text, images, and buttons on either side.", component: NavbarBlock },
  { type: "site_footer", label: "Site Footer", category: "layout", description: "Customise the site-wide footer with any mix of text, images, and buttons on either side.", component: SiteFooterBlock },
  // Editor-only spacer used inside the Header & Footer Puck variant. Never
  // saved to real content pages — see editor.tsx normalizedData and the
  // BlockRenderer denylist.
  { type: "page_content_placeholder", label: "Page content", category: "layout", description: "Placeholder used in the editor to keep the footer at the bottom of the preview.", component: PageContentPlaceholderBlock },

  // ── Social / Community ──
  { type: "testimonials", label: "Testimonials", category: "social", description: "Customer testimonial cards", component: TestimonialsBlock },
  { type: "gallery", label: "Gallery", category: "social", description: "Image gallery grid", component: GalleryBlock },
  { type: "social_links", label: "Social Links", category: "social", description: "Social media profile links", component: SocialLinksBlock },
  { type: "newsletter", label: "Newsletter", category: "social", description: "Email signup form", component: NewsletterBlock },
  { type: "reviews_carousel", label: "Reviews", category: "social", description: "Customer review carousel", component: ReviewsCarouselBlock },

  // ── Info ──
  { type: "about", label: "About", category: "info", description: "About section with image", component: AboutBlock },
  { type: "contact", label: "Contact", category: "info", description: "Contact info and form", component: ContactBlock },
  { type: "map", label: "Map", category: "info", description: "Embedded map location", component: MapBlock },
  { type: "events_list", label: "Events", category: "info", description: "Upcoming events listing", component: EventsListBlock },
  { type: "blog_grid", label: "Blog Grid", category: "info", description: "Blog post cards grid", component: BlogGridBlock },
  { type: "features_list", label: "Features", category: "info", description: "Feature list with icons", component: FeaturesListBlock },
  // Dynamic
  { type: "page_media", label: "Page Media", category: "content", description: "Renders media attached to this page by usage type", component: PageMediaBlock },
];

// ── Lookups ──
const byType = new Map<string, BlockRegistryEntry>();
entries.forEach((e) => byType.set(e.type, e));

export const BLOCK_REGISTRY = {
  entries,
  get(type: string): BlockRegistryEntry | undefined {
    return byType.get(type);
  },
  getComponent(type: string): React.ComponentType<{ content: BlockContent }> | undefined {
    return byType.get(type)?.component as React.ComponentType<{ content: BlockContent }> | undefined;
  },
  allTypes(): string[] {
    return entries.map((e) => e.type);
  },
  byCategory(category: BlockCategory): BlockRegistryEntry[] {
    return entries.filter((e) => e.category === category);
  },
  categories(): BlockCategory[] {
    return ["hero", "content", "business", "social", "info"];
  },
};
