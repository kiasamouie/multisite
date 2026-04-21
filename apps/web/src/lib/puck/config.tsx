"use client";

import type { Config } from "@measured/puck";
import { BLOCK_REGISTRY } from "@repo/template/blocks/registry";
import { createMediaPickerRender } from "./fields/MediaPickerField";
import { createContentPickerRender } from "./fields/ContentPickerField";

// ── Field definitions for each block type ─────────────────────────────────

const BLOCK_FIELDS: Record<string, Record<string, unknown>> = {
  hero: {
    title: { type: "text", label: "Title" },
    subtitle: { type: "textarea", label: "Subtitle" },
    ctaText: { type: "text", label: "Button Text" },
    ctaLink: { type: "text", label: "Button Link" },
    backgroundImage: { type: "text", label: "Background Image URL (legacy)" },
    backgroundImageId: { type: "custom", label: "Background Image", render: null as unknown },
  },
  cta: {
    title: { type: "text", label: "Title" },
    subtitle: { type: "textarea", label: "Subtitle" },
    buttonText: { type: "text", label: "Button Text" },
    buttonLink: { type: "text", label: "Button Link" },
  },
  pricing_table: {
    title: { type: "text", label: "Title" },
    subtitle: { type: "textarea", label: "Subtitle" },
    tiers: {
      type: "array",
      label: "Pricing Tiers",
      arrayFields: {
        name: { type: "text", label: "Plan Name" },
        price: { type: "text", label: "Price" },
        period: { type: "text", label: "Period" },
        features: {
          type: "array",
          label: "Features",
          arrayFields: { value: { type: "text", label: "Feature" } },
        },
        ctaText: { type: "text", label: "CTA Text" },
        ctaLink: { type: "text", label: "CTA Link" },
        highlighted: { type: "radio", label: "Highlighted", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
      },
    },
  },
  rich_text: {
    html: { type: "textarea", label: "HTML Content" },
  },
  heading: {
    text: { type: "text", label: "Text" },
    level: {
      type: "select",
      label: "Heading Level",
      options: [
        { label: "H1", value: 1 },
        { label: "H2", value: 2 },
        { label: "H3", value: 3 },
        { label: "H4", value: 4 },
      ],
    },
    alignment: {
      type: "select",
      label: "Alignment",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
    },
  },
  image: {
    url: { type: "text", label: "Image URL (legacy)" },
    mediaId: { type: "custom", label: "Image", render: null as unknown },
    alt: { type: "text", label: "Alt Text" },
    caption: { type: "text", label: "Caption" },
  },
  video: {
    url: { type: "text", label: "Video URL (legacy)" },
    mediaId: { type: "custom", label: "Video", render: null as unknown },
    title: { type: "text", label: "Title" },
    autoplay: { type: "radio", label: "Autoplay", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
  },
  two_column: {
    leftHtml: { type: "textarea", label: "Left Column HTML" },
    rightHtml: { type: "textarea", label: "Right Column HTML" },
  },
  services: {
    title: { type: "text", label: "Title" },
    services: {
      type: "array",
      label: "Services",
      arrayFields: {
        name: { type: "text", label: "Name" },
        description: { type: "textarea", label: "Description" },
        icon: { type: "text", label: "Icon (emoji)" },
      },
    },
  },
  team: {
    title: { type: "text", label: "Title" },
    teamMemberIds: { type: "custom", label: "Team Members (Library)", render: null as unknown },
    members: {
      type: "array",
      label: "Members (Inline)",
      arrayFields: {
        name: { type: "text", label: "Name" },
        role: { type: "text", label: "Role" },
        imageUrl: { type: "text", label: "Photo URL" },
        bio: { type: "textarea", label: "Bio" },
      },
    },
  },
  stats: {
    title: { type: "text", label: "Title" },
    stats: {
      type: "array",
      label: "Statistics",
      arrayFields: {
        label: { type: "text", label: "Label" },
        value: { type: "text", label: "Value" },
        suffix: { type: "text", label: "Suffix" },
      },
    },
  },
  opening_hours: {
    title: { type: "text", label: "Title" },
    hours: {
      type: "array",
      label: "Hours",
      arrayFields: {
        day: { type: "text", label: "Day" },
        open: { type: "text", label: "Open" },
        close: { type: "text", label: "Close" },
        closed: { type: "radio", label: "Closed", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
      },
    },
  },
  faq: {
    title: { type: "text", label: "Title" },
    items: {
      type: "array",
      label: "Questions",
      arrayFields: {
        question: { type: "text", label: "Question" },
        answer: { type: "textarea", label: "Answer" },
      },
    },
  },
  portfolio: {
    title: { type: "text", label: "Title" },
    portfolioItemIds: { type: "custom", label: "Portfolio Items (Library)", render: null as unknown },
    projects: {
      type: "array",
      label: "Projects (Inline)",
      arrayFields: {
        title: { type: "text", label: "Title" },
        description: { type: "textarea", label: "Description" },
        imageUrl: { type: "text", label: "Image URL" },
        link: { type: "text", label: "Link" },
      },
    },
  },
  testimonials: {
    title: { type: "text", label: "Title" },
    testimonialIds: { type: "custom", label: "Testimonials (Library)", render: null as unknown },
    testimonials: {
      type: "array",
      label: "Testimonials (Inline)",
      arrayFields: {
        name: { type: "text", label: "Name" },
        role: { type: "text", label: "Role" },
        content: { type: "textarea", label: "Quote" },
        avatarUrl: { type: "text", label: "Avatar URL" },
      },
    },
  },
  gallery: {
    title: { type: "text", label: "Title" },
    images: {
      type: "array",
      label: "Images",
      arrayFields: {
        url: { type: "text", label: "URL" },
        alt: { type: "text", label: "Alt Text" },
        caption: { type: "text", label: "Caption" },
      },
    },
  },
  social_links: {
    title: { type: "text", label: "Title" },
    links: {
      type: "array",
      label: "Links",
      arrayFields: {
        platform: { type: "text", label: "Platform" },
        url: { type: "text", label: "URL" },
        label: { type: "text", label: "Label" },
      },
    },
  },
  newsletter: {
    title: { type: "text", label: "Title" },
    subtitle: { type: "textarea", label: "Subtitle" },
    placeholder: { type: "text", label: "Placeholder" },
    buttonText: { type: "text", label: "Button Text" },
  },
  reviews_carousel: {
    title: { type: "text", label: "Title" },
    reviews: {
      type: "array",
      label: "Reviews",
      arrayFields: {
        author: { type: "text", label: "Author" },
        rating: { type: "number", label: "Rating (1-5)" },
        content: { type: "textarea", label: "Review" },
        date: { type: "text", label: "Date" },
        source: { type: "text", label: "Source" },
      },
    },
  },
  about: {
    title: { type: "text", label: "Title" },
    content: { type: "textarea", label: "Content" },
    imageUrl: { type: "text", label: "Image URL (legacy)" },
    imageId: { type: "custom", label: "Image", render: null as unknown },
  },
  contact: {
    title: { type: "text", label: "Title" },
    subtitle: { type: "textarea", label: "Subtitle" },
    email: { type: "text", label: "Email" },
    phone: { type: "text", label: "Phone" },
    showForm: { type: "radio", label: "Show Form", options: [{ label: "Yes", value: true }, { label: "No", value: false }] },
  },
  map: {
    title: { type: "text", label: "Title" },
    address: { type: "text", label: "Address" },
    embedUrl: { type: "text", label: "Embed URL" },
  },
  events_list: {
    title: { type: "text", label: "Title" },
    eventIds: { type: "custom", label: "Events (Library)", render: null as unknown },
    events: {
      type: "array",
      label: "Events (Inline)",
      arrayFields: {
        name: { type: "text", label: "Name" },
        date: { type: "text", label: "Date (YYYY-MM-DD)" },
        venue: { type: "text", label: "Venue" },
        city: { type: "text", label: "City" },
        ticketUrl: { type: "text", label: "Ticket URL" },
        description: { type: "textarea", label: "Description" },
      },
    },
  },
  blog_grid: {
    title: { type: "text", label: "Title" },
    blogPostIds: { type: "custom", label: "Blog Posts (Library)", render: null as unknown },
    posts: {
      type: "array",
      label: "Posts (Inline)",
      arrayFields: {
        title: { type: "text", label: "Title" },
        excerpt: { type: "textarea", label: "Excerpt" },
        imageUrl: { type: "text", label: "Image URL" },
        href: { type: "text", label: "Link" },
        date: { type: "text", label: "Date" },
        author: { type: "text", label: "Author" },
      },
    },
  },
  features_list: {
    title: { type: "text", label: "Title" },
    subtitle: { type: "textarea", label: "Subtitle" },
    features: {
      type: "array",
      label: "Features",
      arrayFields: {
        title: { type: "text", label: "Title" },
        description: { type: "textarea", label: "Description" },
        icon: { type: "text", label: "Icon (emoji)" },
      },
    },
  },
  page_media: {
    usage_type: { type: "text", label: "Usage Type (e.g. hero, gallery)" },
    display_mode: {
      type: "select",
      label: "Display Mode",
      options: [
        { label: "Single", value: "single" },
        { label: "Gallery", value: "gallery" },
        { label: "List", value: "list" },
      ],
    },
    title: { type: "text", label: "Title" },
  },
};

// ── Default props per block type ──────────────────────────────────────────

const BLOCK_DEFAULTS: Record<string, Record<string, unknown>> = {
  hero: { title: "New Hero Section", subtitle: "", ctaText: "", ctaLink: "" },
  cta: { title: "Call to Action", subtitle: "", buttonText: "Learn More", buttonLink: "#" },
  pricing_table: { title: "Pricing", subtitle: "", tiers: [] },
  rich_text: { html: "<p>Enter your content here</p>" },
  heading: { text: "Section Heading", level: 2, alignment: "left" },
  image: { url: "", alt: "", caption: "" },
  video: { url: "", title: "" },
  two_column: { leftHtml: "<p>Left column</p>", rightHtml: "<p>Right column</p>" },
  services: { title: "Our Services", services: [] },
  team: { title: "Our Team", members: [] },
  stats: { title: "Statistics", stats: [] },
  opening_hours: { title: "Business Hours", hours: [] },
  faq: { title: "FAQ", items: [] },
  portfolio: { title: "Portfolio", projects: [] },
  testimonials: { title: "Testimonials", testimonials: [] },
  gallery: { title: "Gallery", images: [] },
  social_links: { title: "Follow Us", links: [] },
  newsletter: { title: "Newsletter", subtitle: "", placeholder: "Enter your email", buttonText: "Subscribe" },
  reviews_carousel: { title: "Reviews", reviews: [] },
  about: { title: "About Us", content: "", imageUrl: "" },
  contact: { title: "Contact Us", subtitle: "", email: "", phone: "", showForm: true },
  map: { title: "Location", address: "" },
  events_list: { title: "Events", events: [] },
  blog_grid: { title: "Blog", posts: [] },
  features_list: { title: "Features", subtitle: "", features: [] },
  page_media: { usage_type: "hero", display_mode: "single", title: "" },
};

// ── Build Puck config dynamically from block registry ─────────────────────

// Media picker placeholder fields that get their render function injected at build time
const MEDIA_PICKER_FIELDS = [
  { blockType: "hero", fieldKey: "backgroundImageId", mediaType: "image" as const },
  { blockType: "image", fieldKey: "mediaId", mediaType: "image" as const },
  { blockType: "about", fieldKey: "imageId", mediaType: "image" as const },
  { blockType: "video", fieldKey: "mediaId", mediaType: "video" as const },
] as const;

// Content picker placeholder fields — injected at build time with tenantId
const CONTENT_PICKER_FIELDS = [
  { blockType: "team", fieldKey: "teamMemberIds", contentType: "team", displayField: "name" },
  { blockType: "testimonials", fieldKey: "testimonialIds", contentType: "testimonials", displayField: "name" },
  { blockType: "portfolio", fieldKey: "portfolioItemIds", contentType: "portfolio", displayField: "title" },
  { blockType: "blog_grid", fieldKey: "blogPostIds", contentType: "blog", displayField: "title" },
  { blockType: "events_list", fieldKey: "eventIds", contentType: "events", displayField: "name" },
] as const;

export function buildPuckConfig(tenantId: number): Config {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: Record<string, any> = {};

  for (const entry of BLOCK_REGISTRY.entries) {
    const Component = entry.component;
    const fields = { ...(BLOCK_FIELDS[entry.type] ?? {}) };
    const defaultProps = BLOCK_DEFAULTS[entry.type] ?? {};

    // Inject media picker render functions for fields that need them
    for (const mp of MEDIA_PICKER_FIELDS) {
      if (mp.blockType === entry.type && fields[mp.fieldKey]) {
        fields[mp.fieldKey] = {
          ...fields[mp.fieldKey] as Record<string, unknown>,
          render: createMediaPickerRender(tenantId, mp.mediaType),
        };
      }
    }

    // Inject content picker render functions for fields that need them
    for (const cp of CONTENT_PICKER_FIELDS) {
      if (cp.blockType === entry.type && fields[cp.fieldKey]) {
        fields[cp.fieldKey] = {
          ...fields[cp.fieldKey] as Record<string, unknown>,
          render: createContentPickerRender(tenantId, cp.contentType, cp.displayField),
        };
      }
    }

    components[entry.type] = {
      label: entry.label,
      fields,
      defaultProps,
      // Puck injects `id` and `puck` into props; strip them before passing to our component
      render: function PuckBlockRender(props: Record<string, unknown>) {
        const { id: _id, puck: _puck, ...content } = props;
        return <Component content={content} />;
      },
    };
  }

  return {
    components,
    categories: {
      hero: {
        title: "Hero & Promo",
        components: ["hero", "cta", "pricing_table"],
      },
      content: {
        title: "Content",
        components: ["rich_text", "heading", "image", "video", "two_column", "page_media"],
      },
      business: {
        title: "Business",
        components: ["services", "team", "stats", "opening_hours", "faq", "portfolio", "features_list"],
      },
      social: {
        title: "Social & Community",
        components: ["testimonials", "gallery", "social_links", "newsletter", "reviews_carousel", "blog_grid"],
      },
      info: {
        title: "Info & Contact",
        components: ["about", "contact", "map", "events_list"],
      },
    },
  };
}

// Re-export for backward compat / convenience
export const puckConfig = buildPuckConfig(0);
