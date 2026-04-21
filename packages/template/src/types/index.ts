export interface BlockContent {
  [key: string]: unknown;
}

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

// ── Existing block content types ──

export interface HeroBlockContent {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
  backgroundImageId?: number | null;
}

export interface ServicesBlockContent {
  title: string;
  services: Array<{
    name: string;
    description: string;
    icon?: string;
  }>;
}

export interface AboutBlockContent {
  title: string;
  content: string;
  imageUrl?: string;
  imageId?: number | null;
}

export interface ContactBlockContent {
  title: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  showForm: boolean;
}

export interface TestimonialsBlockContent {
  title: string;
  testimonials: Array<{
    name: string;
    role?: string;
    content: string;
    avatarUrl?: string;
  }>;
}

export interface CtaBlockContent {
  title: string;
  subtitle?: string;
  buttonText: string;
  buttonLink: string;
}

export interface GalleryBlockContent {
  title?: string;
  images: Array<{
    url: string;
    alt: string;
    caption?: string;
  }>;
}

// ── New block content types ──

export interface RichTextBlockContent {
  html: string;
}

export interface HeadingBlockContent {
  text: string;
  level: 1 | 2 | 3 | 4;
  alignment?: "left" | "center" | "right";
}

export interface ImageBlockContent {
  url: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  mediaId?: number | null;
}

export interface VideoBlockContent {
  url: string;
  title?: string;
  autoplay?: boolean;
}

export interface TwoColumnBlockContent {
  leftHtml: string;
  rightHtml: string;
}

export interface PricingTableBlockContent {
  title?: string;
  subtitle?: string;
  tiers: Array<{
    name: string;
    price: string;
    period?: string;
    features: string[];
    ctaText: string;
    ctaLink: string;
    highlighted?: boolean;
  }>;
}

export interface FaqBlockContent {
  title?: string;
  items: Array<{
    question: string;
    answer: string;
  }>;
}

export interface TeamBlockContent {
  title?: string;
  members: Array<{
    name: string;
    role: string;
    imageUrl?: string;
    bio?: string;
  }>;
}

export interface StatsBlockContent {
  title?: string;
  stats: Array<{
    label: string;
    value: string;
    suffix?: string;
  }>;
}

export interface MapBlockContent {
  title?: string;
  address: string;
  embedUrl?: string;
}

export interface SocialLinksBlockContent {
  title?: string;
  links: Array<{
    platform: string;
    url: string;
    label?: string;
  }>;
}

export interface NewsletterBlockContent {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  buttonText?: string;
}

export interface OpeningHoursBlockContent {
  title?: string;
  hours: Array<{
    day: string;
    open: string;
    close: string;
    closed?: boolean;
  }>;
}

export interface PortfolioBlockContent {
  title?: string;
  projects: Array<{
    title: string;
    description?: string;
    imageUrl: string;
    link?: string;
    tags?: string[];
  }>;
}

export interface EventsListBlockContent {
  title?: string;
  events: Array<{
    name: string;
    date: string;
    venue?: string;
    city?: string;
    ticketUrl?: string;
    description?: string;
  }>;
}

export interface FeaturesListBlockContent {
  title?: string;
  subtitle?: string;
  features: Array<{
    title: string;
    description: string;
    icon?: string;
  }>;
}

export interface ReviewsCarouselBlockContent {
  title?: string;
  reviews: Array<{
    author: string;
    rating: number;
    content: string;
    date?: string;
    source?: string;
  }>;
}

export interface BlogGridBlockContent {
  title?: string;
  posts: Array<{
    title: string;
    excerpt: string;
    imageUrl?: string;
    href: string;
    date?: string;
    author?: string;
  }>;
}

export interface PageMediaBlockContent {
  /** Which media to show — matches usage_type in media_page_associations */
  usage_type: string;
  /** "single" | "gallery" | "list" — how to render multiple assets */
  display_mode?: "single" | "gallery" | "list";
  /** Optional title shown above the media */
  title?: string;
}
