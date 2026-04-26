"use client";

import type { Config } from "@measured/puck";
import { BLOCK_REGISTRY } from "@repo/template/blocks/registry";
import {
  createMediaPickerRender,
  createGalleryPickerRender,
  createContentPickerRender,
  createLinkPickerRender,
  createPagesMultiPickerRender,
  createEmojiPickerRender,
  createDatePickerRender,
  createAddressPickerRender,
  createSlotItemsFieldRender,
  createStyledFieldRender,
  createChipsFieldRender,
  createBooleanChipsRender,
  createStringBooleanChipsRender,
} from "./fields";

// ── Shared chip renders ────────────────────────────────────────────────────
// Build once at module load so we share the same render across all blocks.
const yesNoBoolChipsRender = createBooleanChipsRender(false);
const yesNoStringChipsRender = createStringBooleanChipsRender("false");
const headingLevelChipsRender = createChipsFieldRender<number>(
  [
    { label: "H1", value: 1 },
    { label: "H2", value: 2 },
    { label: "H3", value: 3 },
    { label: "H4", value: 4 },
  ],
  2,
);
const displayModeChipsRender = createChipsFieldRender<string>(
  [
    { label: "Single", value: "single" },
    { label: "Gallery", value: "gallery" },
    { label: "List", value: "list" },
  ],
  "single",
);

// ── Field definitions for each block type ─────────────────────────────────

const BLOCK_FIELDS: Record<string, Record<string, unknown>> = {
  hero: {
    title: { type: "custom", label: "Title", render: null as unknown },
    subtitle: { type: "custom", label: "Subtitle", render: null as unknown },
    ctaText: { type: "text", label: "Button Text" },
    ctaLink: { type: "text", label: "Button Link" },
    backgroundImage: { type: "text", label: "Background Image URL (legacy)" },
    backgroundImageId: { type: "custom", label: "Background Image", render: null as unknown },
    ctaButtonStyle: { type: "custom", label: "Button styling", render: null as unknown },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  cta: {
    title: { type: "custom", label: "Title", render: null as unknown },
    subtitle: { type: "custom", label: "Subtitle", render: null as unknown },
    buttonText: { type: "text", label: "Button Text" },
    buttonLink: { type: "custom", label: "Button Link", render: null as unknown },
    ctaButtonStyle: { type: "custom", label: "Button styling", render: null as unknown },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  pricing_table: {
    title: { type: "custom", label: "Title", render: null as unknown },
    subtitle: { type: "custom", label: "Subtitle", render: null as unknown },
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
        highlighted: { type: "custom", label: "Highlighted", render: yesNoBoolChipsRender },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  rich_text: {
    html: { type: "textarea", label: "HTML Content" },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  heading: {
    text: { type: "custom", label: "Text", render: null as unknown },
    level: {
      type: "custom",
      label: "Heading Level",
      render: headingLevelChipsRender,
    },
    // Alignment is provided by the heading text's own Style panel (align).
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  image: {
    url: { type: "text", label: "Image URL (legacy)" },
    mediaId: { type: "custom", label: "Image", render: null as unknown },
    alt: { type: "text", label: "Alt Text" },
    caption: { type: "custom", label: "Caption", render: null as unknown },
    imageStyle: { type: "custom", label: "Image styling", render: null as unknown },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  video: {
    url: { type: "text", label: "Video URL (legacy)" },
    mediaId: { type: "custom", label: "Video", render: null as unknown },
    title: { type: "custom", label: "Title", render: null as unknown },
    autoplay: { type: "custom", label: "Autoplay", render: yesNoBoolChipsRender },
    videoStyle: { type: "custom", label: "Video styling", render: null as unknown },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  two_column: {
    leftHtml: { type: "textarea", label: "Left Column HTML" },
    rightHtml: { type: "textarea", label: "Right Column HTML" },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  services: {
    title: { type: "custom", label: "Title", render: null as unknown },
    services: {
      type: "array",
      label: "Services",
      arrayFields: {
        name: { type: "text", label: "Name" },
        description: { type: "textarea", label: "Description" },
        icon: { type: "custom", label: "Icon", render: null as unknown },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  team: {
    title: { type: "custom", label: "Title", render: null as unknown },
    teamMemberIds: { type: "custom", label: "Team Members (Library)", render: null as unknown },
    members: {
      type: "array",
      label: "Members (Inline)",
      arrayFields: {
        name: { type: "text", label: "Name" },
        role: { type: "text", label: "Role" },
        imageUrl: { type: "custom", label: "Photo", render: null as unknown },
        bio: { type: "textarea", label: "Bio" },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  stats: {
    title: { type: "custom", label: "Title", render: null as unknown },
    stats: {
      type: "array",
      label: "Statistics",
      arrayFields: {
        label: { type: "text", label: "Label" },
        value: { type: "text", label: "Value" },
        suffix: { type: "text", label: "Suffix" },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  opening_hours: {
    title: { type: "custom", label: "Title", render: null as unknown },
    hours: {
      type: "array",
      label: "Hours",
      arrayFields: {
        day: { type: "text", label: "Day" },
        open: { type: "text", label: "Open" },
        close: { type: "text", label: "Close" },
        closed: { type: "custom", label: "Closed", render: yesNoBoolChipsRender },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  faq: {
    title: { type: "custom", label: "Title", render: null as unknown },
    items: {
      type: "array",
      label: "Questions",
      arrayFields: {
        question: { type: "text", label: "Question" },
        answer: { type: "textarea", label: "Answer" },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  portfolio: {
    title: { type: "custom", label: "Title", render: null as unknown },
    portfolioItemIds: { type: "custom", label: "Portfolio Items (Library)", render: null as unknown },
    projects: {
      type: "array",
      label: "Projects (Inline)",
      arrayFields: {
        title: { type: "text", label: "Title" },
        description: { type: "textarea", label: "Description" },
        imageUrl: { type: "custom", label: "Image", render: null as unknown },
        link: { type: "text", label: "Link" },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  testimonials: {
    title: { type: "custom", label: "Title", render: null as unknown },
    testimonialIds: { type: "custom", label: "Testimonials (Library)", render: null as unknown },
    testimonials: {
      type: "array",
      label: "Testimonials (Inline)",
      arrayFields: {
        name: { type: "text", label: "Name" },
        role: { type: "text", label: "Role" },
        content: { type: "textarea", label: "Quote" },
        avatarUrl: { type: "custom", label: "Avatar", render: null as unknown },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  gallery: {
    title: { type: "custom", label: "Title", render: null as unknown },
    galleryMediaIds: { type: "custom", label: "Gallery Images (Library)", render: null as unknown },
    images: {
      type: "array",
      label: "Images (Inline)",
      arrayFields: {
        url: { type: "custom", label: "Image", render: null as unknown },
        alt: { type: "text", label: "Alt Text" },
        caption: { type: "text", label: "Caption" },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  social_links: {
    title: { type: "custom", label: "Title", render: null as unknown },
    links: {
      type: "array",
      label: "Links",
      arrayFields: {
        platform: { type: "text", label: "Platform" },
        url: { type: "text", label: "URL" },
        label: { type: "text", label: "Label" },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  newsletter: {
    title: { type: "custom", label: "Title", render: null as unknown },
    subtitle: { type: "custom", label: "Subtitle", render: null as unknown },
    placeholder: { type: "text", label: "Placeholder" },
    buttonText: { type: "text", label: "Button Text" },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  reviews_carousel: {
    title: { type: "custom", label: "Title", render: null as unknown },
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
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  about: {
    title: { type: "custom", label: "Title", render: null as unknown },
    content: { type: "custom", label: "Content", render: null as unknown },
    imageUrl: { type: "text", label: "Image URL (legacy)" },
    imageId: { type: "custom", label: "Image", render: null as unknown },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  contact: {
    title: { type: "custom", label: "Title", render: null as unknown },
    subtitle: { type: "custom", label: "Subtitle", render: null as unknown },
    email: { type: "text", label: "Email" },
    phone: { type: "text", label: "Phone" },
    showForm: { type: "custom", label: "Show Form", render: yesNoBoolChipsRender },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  map: {
    title: { type: "custom", label: "Title", render: null as unknown },
    address: { type: "custom", label: "Address", render: null as unknown },
    embedUrl: { type: "text", label: "Embed URL (auto-filled on address select)" },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  events_list: {
    title: { type: "custom", label: "Title", render: null as unknown },
    eventIds: { type: "custom", label: "Events (Library)", render: null as unknown },
    events: {
      type: "array",
      label: "Events (Inline)",
      arrayFields: {
        name: { type: "text", label: "Name" },
        date: { type: "custom", label: "Date", render: null as unknown },
        venue: { type: "custom", label: "Venue", render: null as unknown },
        city: { type: "custom", label: "City", render: null as unknown },
        ticketUrl: { type: "text", label: "Ticket URL" },
        description: { type: "textarea", label: "Description" },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  blog_grid: {
    title: { type: "custom", label: "Title", render: null as unknown },
    blogPostIds: { type: "custom", label: "Blog Posts (Library)", render: null as unknown },
    posts: {
      type: "array",
      label: "Posts (Inline)",
      arrayFields: {
        title: { type: "text", label: "Title" },
        excerpt: { type: "textarea", label: "Excerpt" },
        imageUrl: { type: "custom", label: "Image", render: null as unknown },
        href: { type: "text", label: "Link" },
        date: { type: "text", label: "Date" },
        author: { type: "text", label: "Author" },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  features_list: {
    title: { type: "custom", label: "Title", render: null as unknown },
    subtitle: { type: "custom", label: "Subtitle", render: null as unknown },
    features: {
      type: "array",
      label: "Features",
      arrayFields: {
        title: { type: "text", label: "Title" },
        description: { type: "textarea", label: "Description" },
        icon: { type: "custom", label: "Icon", render: null as unknown },
      },
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  page_media: {
    usage_type: { type: "text", label: "Usage Type (e.g. hero, gallery)" },
    display_mode: {
      type: "custom",
      label: "Display Mode",
      render: displayModeChipsRender,
    },
    title: { type: "text", label: "Title" },
  },
  site_header: {
    leftItems: { type: "custom", label: "Left Side Items", render: null as unknown },
    navPages: { type: "custom", label: "Navigation Pages", render: null as unknown },
    navPagesTextStyle: { type: "custom", label: "Nav Pages Typography", render: null as unknown },
    rightItems: { type: "custom", label: "Right Side Items", render: null as unknown },
    sticky: {
      type: "custom",
      label: "Sticky (fixed to top while scrolling)",
      render: yesNoStringChipsRender,
    },
    scrollTransparency: {
      type: "custom",
      label: "Transparent at top, solid on scroll (sticky only)",
      render: yesNoStringChipsRender,
    },
    borderBottom: {
      type: "custom",
      label: "Show Bottom Border",
      render: yesNoStringChipsRender,
    },
    backdropBlur: {
      type: "custom",
      label: "Backdrop blur (frosted glass effect)",
      render: yesNoStringChipsRender,
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  site_footer: {
    leftItems: { type: "custom", label: "Left Column Items", render: null as unknown },
    centerItems: { type: "custom", label: "Center Column Items", render: null as unknown },
    rightItems: { type: "custom", label: "Right Column Items", render: null as unknown },
    borderTop: {
      type: "custom",
      label: "Show Top Border",
      render: yesNoStringChipsRender,
    },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  booking_block: {
    title: { type: "custom", label: "Headline", render: null as unknown },
    subtitle: { type: "custom", label: "Subtitle", render: null as unknown },
    sectionLabel: { type: "text", label: "Form Section Label" },
    buttonText: { type: "text", label: "Button Text" },
    cancelPolicy: { type: "text", label: "Cancel Policy Note" },
    showPartySize: {
      type: "custom",
      label: "Show Party / Group Size",
      render: yesNoStringChipsRender,
    },
    availableTimes: {
      type: "array",
      label: "Available Times",
      arrayFields: { time: { type: "text", label: "Time (HH:MM)" } },
    },
    address: { type: "custom", label: "Address", render: null as unknown },
    phone: { type: "text", label: "Phone" },
    contactEmail: { type: "text", label: "Contact Email" },
    backgroundImageUrl: { type: "text", label: "Background Image URL (legacy)" },
    backgroundImageId: { type: "custom", label: "Background Image", render: null as unknown },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
  menu_category: {
    title: { type: "custom", label: "Category Title", render: null as unknown },
    sectionNumber: { type: "text", label: "Section Number (e.g. 01)" },
    items: {
      type: "array",
      label: "Menu Items",
      arrayFields: {
        name: { type: "text", label: "Dish Name" },
        description: { type: "text", label: "Description" },
        price: { type: "text", label: "Price" },
      },
    },
    imageUrl: { type: "text", label: "Category Image URL" },
    sectionStyle: { type: "custom", label: "Section styling", render: null as unknown },
  },
};

// ── Default props per block type ──────────────────────────────────────────

const BLOCK_DEFAULTS: Record<string, Record<string, unknown>> = {
  hero: { title: { value: "New Hero Section" }, subtitle: { value: "" }, ctaText: "", ctaLink: "", ctaButtonStyle: {}, sectionStyle: {} },
  cta: { title: { value: "Call to Action" }, subtitle: { value: "" }, buttonText: "Learn More", buttonLink: "#", ctaButtonStyle: {}, sectionStyle: {} },
  pricing_table: { title: { value: "Pricing" }, subtitle: { value: "" }, tiers: [], sectionStyle: {} },
  rich_text: { html: "<p>Enter your content here</p>", sectionStyle: {} },
  heading: { text: { value: "Section Heading" }, level: 2, alignment: "left", sectionStyle: {} },
  image: { url: "", alt: "", caption: { value: "" }, imageStyle: {}, sectionStyle: {} },
  video: {
    url: "",
    title: { value: "" },
    videoStyle: {},
    sectionStyle: {},
  },
  two_column: { leftHtml: "<p>Left column</p>", rightHtml: "<p>Right column</p>", sectionStyle: {} },
  services: { title: { value: "Our Services" }, services: [], sectionStyle: {} },
  team: { title: { value: "Our Team" }, members: [], sectionStyle: {} },
  stats: { title: { value: "Statistics" }, stats: [], sectionStyle: {} },
  opening_hours: { title: { value: "Business Hours" }, hours: [], sectionStyle: {} },
  faq: { title: { value: "FAQ" }, items: [], sectionStyle: {} },
  portfolio: { title: { value: "Portfolio" }, projects: [], sectionStyle: {} },
  testimonials: { title: { value: "Testimonials" }, testimonials: [], sectionStyle: {} },
  gallery: { title: { value: "Gallery" }, galleryMediaIds: [], images: [], sectionStyle: {} },
  social_links: { title: { value: "Follow Us" }, links: [], sectionStyle: {} },
  newsletter: { title: { value: "Newsletter" }, subtitle: { value: "" }, placeholder: "Enter your email", buttonText: "Subscribe", sectionStyle: {} },
  reviews_carousel: { title: { value: "Reviews" }, reviews: [], sectionStyle: {} },
  about: { title: { value: "About Us" }, content: { value: "" }, imageUrl: "", sectionStyle: {} },
  contact: { title: { value: "Contact Us" }, subtitle: { value: "" }, email: "", phone: "", showForm: true, sectionStyle: {} },
  map: { title: { value: "Location" }, address: "", sectionStyle: {} },
  events_list: { title: { value: "Events" }, events: [], sectionStyle: {} },
  blog_grid: { title: { value: "Blog" }, posts: [], sectionStyle: {} },
  features_list: { title: { value: "Features" }, subtitle: { value: "" }, features: [], sectionStyle: {} },
  page_media: { usage_type: "hero", display_mode: "single", title: "" },
  site_header: {
    leftItems: [
      { kind: "text", text: "Your Brand", imageId: null, href: "/", variant: "default" },
    ],
    sectionStyle: {},
    navPages: [],
    navPagesTextStyle: {},
    rightItems: [
      { kind: "button", text: "Book Now", imageId: null, href: "/booking", variant: "default" },
    ],
    sticky: "true",
    scrollTransparency: "false",
    borderBottom: "true",
    backdropBlur: "true",
  },
  site_footer: {
    leftItems: [
      { kind: "text", text: "© Your Company", imageId: null, href: "", variant: "default" },
    ],
    centerItems: [],
    rightItems: [],
    borderTop: "true",
    sectionStyle: {},
  },
  booking_block: {
    title: { value: "Book Your Visit" },
    subtitle: { value: "Reserve your spot today. We look forward to welcoming you." },
    sectionLabel: "Secure your booking",
    buttonText: "Confirm Booking",
    cancelPolicy: "By confirming, you agree to our 24-hour cancellation policy.",
    showPartySize: "true",
    availableTimes: [
      { time: "18:00" },
      { time: "18:30" },
      { time: "19:15" },
      { time: "20:00" },
      { time: "20:30" },
      { time: "21:00" },
      { time: "21:45" },
    ],
    address: "",
    phone: "",
    contactEmail: "",
    backgroundImageUrl: "",
    sectionStyle: {},
  },
  menu_category: {
    title: { value: "Menu Category" },
    sectionNumber: "01",
    items: [],
    imageUrl: "",
    sectionStyle: {},
  },
};

// ── Build Puck config dynamically from block registry ─────────────────────

// Media picker placeholder fields that get their render function injected at build time
const MEDIA_PICKER_FIELDS = [
  { blockType: "hero", fieldKey: "backgroundImageId", mediaType: "image" as const },
  { blockType: "image", fieldKey: "mediaId", mediaType: "image" as const },
  { blockType: "about", fieldKey: "imageId", mediaType: "image" as const },
  { blockType: "video", fieldKey: "mediaId", mediaType: "video" as const },
  { blockType: "booking_block", fieldKey: "backgroundImageId", mediaType: "image" as const },
] as const;

// Multi-media (gallery) fields
const GALLERY_PICKER_FIELDS = [
  { blockType: "gallery", fieldKey: "galleryMediaIds", mediaType: "image" as const },
] as const;

// Content picker placeholder fields — injected at build time with tenantId
const CONTENT_PICKER_FIELDS = [
  { blockType: "team", fieldKey: "teamMemberIds", contentType: "team", displayField: "name" },
  { blockType: "testimonials", fieldKey: "testimonialIds", contentType: "testimonials", displayField: "name" },
  { blockType: "portfolio", fieldKey: "portfolioItemIds", contentType: "portfolio", displayField: "title" },
  { blockType: "blog_grid", fieldKey: "blogPostIds", contentType: "blog", displayField: "title" },
  { blockType: "events_list", fieldKey: "eventIds", contentType: "events", displayField: "name" },
] as const;

// Link picker fields (Pages tab + custom URL)
const LINK_PICKER_FIELDS = [
  { blockType: "cta", fieldKey: "buttonLink" },
] as const;

// Multi-page picker fields (denormalized nav pages array).
// Only the header has a page-list slot; the footer is pure slot items.
const PAGES_MULTI_PICKER_FIELDS = [
  { blockType: "site_header", fieldKey: "navPages" },
] as const;

// Address picker fields (Nominatim autocomplete)
const ADDRESS_PICKER_FIELDS = [
  { blockType: "map", fieldKey: "address", fieldKind: "full" as const },
  { blockType: "booking_block", fieldKey: "address", fieldKind: "full" as const },
] as const;

// Emoji picker fields inside array sub-fields: [blockType, arrayFieldKey, subFieldKey]
const EMOJI_PICKER_ARRAY_FIELDS = [
  { blockType: "services", arrayField: "services", subField: "icon" },
  { blockType: "features_list", arrayField: "features", subField: "icon" },
] as const;

// Date picker fields inside array sub-fields
const DATE_PICKER_ARRAY_FIELDS = [
  { blockType: "events_list", arrayField: "events", subField: "date" },
] as const;

// Address picker fields inside array sub-fields
const ADDRESS_PICKER_ARRAY_FIELDS = [
  { blockType: "events_list", arrayField: "events", subField: "venue", fieldKind: "venue" as const },
  { blockType: "events_list", arrayField: "events", subField: "city", fieldKind: "city" as const },
] as const;

// Media URL picker inside array sub-fields (value stored as a URL string
// for backward compat with existing inline-array content).
const MEDIA_URL_ARRAY_FIELDS = [
  { blockType: "gallery", arrayField: "images", subField: "url", mediaType: "image" as const },
  { blockType: "team", arrayField: "members", subField: "imageUrl", mediaType: "image" as const },
  { blockType: "portfolio", arrayField: "projects", subField: "imageUrl", mediaType: "image" as const },
  { blockType: "testimonials", arrayField: "testimonials", subField: "avatarUrl", mediaType: "image" as const },
  { blockType: "blog_grid", arrayField: "posts", subField: "imageUrl", mediaType: "image" as const },
] as const;

// Slot-items custom field (header & footer slot arrays).
// Each slot uses the bespoke `SlotItemsEditor` UI: a card-per-item editor
// with a kind-select that swaps the visible sub-fields (text / image /
// button) and exposes a full style surface (colour, size, weight, rounding,
// margin, etc.). Value shape: `HeaderSlotItem[]`.
const SLOT_ITEMS_FIELDS = [
  { blockType: "site_header", fieldKey: "leftItems", label: "Left Side Items" },
  { blockType: "site_header", fieldKey: "rightItems", label: "Right Side Items" },
  { blockType: "site_footer", fieldKey: "leftItems", label: "Left Column Items" },
  { blockType: "site_footer", fieldKey: "centerItems", label: "Center Column Items" },
  { blockType: "site_footer", fieldKey: "rightItems", label: "Right Column Items" },
] as const;

// Generic styled-field bindings. Each entry turns a `type:"custom"` field
// into a content-input + collapsible Style panel. Add new entries here to
// give any block field per-element styling — no per-block code needed.
//
//   blockType  — registry key (must have a matching `type:"custom"` field)
//   fieldKey   — the prop key on the block content
//   kind       — controls which style controls appear ("text" | "heading"
//                | "image" | "video" | "button" | "section")
//   base       — input control rendered above the style panel
//                ("text" | "textarea" | "media-image" | "media-video")
const STYLED_FIELDS: Array<{
  blockType: string;
  fieldKey: string;
  kind: "text" | "heading" | "image" | "video" | "button" | "section";
  base: "text" | "textarea" | "media-image" | "media-video" | "none";
  label?: string;
  placeholder?: string;
}> = [
  // Video block.
  { blockType: "video", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "video", fieldKey: "videoStyle", kind: "video", base: "none", label: "Video styling" },
  { blockType: "video", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },

  // Hero / CTA / Pricing.
  { blockType: "hero", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "hero", fieldKey: "subtitle", kind: "text", base: "textarea", label: "Subtitle" },
  { blockType: "hero", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "cta", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "cta", fieldKey: "subtitle", kind: "text", base: "textarea", label: "Subtitle" },
  { blockType: "cta", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "pricing_table", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "pricing_table", fieldKey: "subtitle", kind: "text", base: "textarea", label: "Subtitle" },
  { blockType: "pricing_table", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },

  // About.
  { blockType: "about", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "about", fieldKey: "content", kind: "text", base: "textarea", label: "Content" },
  { blockType: "about", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "about", fieldKey: "imageStyle", kind: "image", base: "none", label: "Image styling" },

  // Image block.
  { blockType: "image", fieldKey: "caption", kind: "text", base: "text", label: "Caption" },
  { blockType: "image", fieldKey: "imageStyle", kind: "image", base: "none", label: "Image styling" },
  { blockType: "image", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },

  // Two-column block.
  { blockType: "two_column", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },

  // Booking block.
  { blockType: "booking_block", fieldKey: "title", kind: "heading", base: "text", label: "Headline" },
  { blockType: "booking_block", fieldKey: "subtitle", kind: "text", base: "textarea", label: "Subtitle" },
  { blockType: "booking_block", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },

  // Menu category.
  { blockType: "menu_category", fieldKey: "title", kind: "heading", base: "text", label: "Category Title" },
  { blockType: "menu_category", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },

  // Hero / CTA button styling.
  { blockType: "hero", fieldKey: "ctaButtonStyle", kind: "button", base: "none", label: "Button styling" },
  { blockType: "cta", fieldKey: "ctaButtonStyle", kind: "button", base: "none", label: "Button styling" },

  // Heading / Rich text.
  { blockType: "heading", fieldKey: "text", kind: "heading", base: "text", label: "Text" },
  { blockType: "heading", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "rich_text", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },

  // Title-only blocks (heading + sectionStyle).
  { blockType: "services", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "services", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "team", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "team", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "stats", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "stats", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "opening_hours", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "opening_hours", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "faq", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "faq", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "portfolio", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "portfolio", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "testimonials", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "testimonials", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "gallery", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "gallery", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "social_links", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "social_links", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "reviews_carousel", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "reviews_carousel", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "map", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "map", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "events_list", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "events_list", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "blog_grid", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "blog_grid", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },

  // Header & footer section styling + nav-pages typography (header only).
  { blockType: "site_header", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "site_header", fieldKey: "navPagesTextStyle", kind: "text", base: "none", label: "Nav Pages Typography" },
  { blockType: "site_footer", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },

  // Title + subtitle blocks.
  { blockType: "contact", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "contact", fieldKey: "subtitle", kind: "text", base: "textarea", label: "Subtitle" },
  { blockType: "contact", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "newsletter", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "newsletter", fieldKey: "subtitle", kind: "text", base: "textarea", label: "Subtitle" },
  { blockType: "newsletter", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
  { blockType: "features_list", fieldKey: "title", kind: "heading", base: "text", label: "Title" },
  { blockType: "features_list", fieldKey: "subtitle", kind: "text", base: "textarea", label: "Subtitle" },
  { blockType: "features_list", fieldKey: "sectionStyle", kind: "section", base: "none", label: "Section styling" },
];


// Per-component permissions applied inside the Header & Footer editor:
// tenants can edit the two blocks' props, but CANNOT reorder, duplicate,
// delete, drag or insert new copies of them. This keeps the special
// `site_header` page limited to exactly [site_header, site_footer].
const HEADER_FOOTER_PERMISSIONS = {
  drag: false,
  duplicate: false,
  delete: false,
  insert: false,
  edit: true,
} as const;

export function buildPuckConfig(tenantId: number, variant: "page" | "site_header" = "page"): Config {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: Record<string, any> = {};

  const entries =
    variant === "site_header"
      ? BLOCK_REGISTRY.entries.filter(
          (e) =>
            e.type === "site_header" ||
            e.type === "site_footer" ||
            e.type === "page_content_placeholder",
        )
      : BLOCK_REGISTRY.entries.filter(
          (e) =>
            e.type !== "site_header" &&
            e.type !== "site_footer" &&
            e.type !== "page_content_placeholder",
        );

  for (const entry of entries) {
    const Component = entry.component;
    const fields = { ...(BLOCK_FIELDS[entry.type] ?? {}) };
    const defaultProps = BLOCK_DEFAULTS[entry.type] ?? {};

    // Inject single-media picker renders
    for (const mp of MEDIA_PICKER_FIELDS) {
      if (mp.blockType === entry.type && fields[mp.fieldKey]) {
        fields[mp.fieldKey] = {
          ...fields[mp.fieldKey] as Record<string, unknown>,
          render: createMediaPickerRender(tenantId, mp.mediaType),
        };
      }
    }

    // Inject gallery (multi-media) picker renders
    for (const gp of GALLERY_PICKER_FIELDS) {
      if (gp.blockType === entry.type && fields[gp.fieldKey]) {
        fields[gp.fieldKey] = {
          ...fields[gp.fieldKey] as Record<string, unknown>,
          render: createGalleryPickerRender(tenantId, gp.mediaType),
        };
      }
    }

    // Inject content library picker renders
    for (const cp of CONTENT_PICKER_FIELDS) {
      if (cp.blockType === entry.type && fields[cp.fieldKey]) {
        fields[cp.fieldKey] = {
          ...fields[cp.fieldKey] as Record<string, unknown>,
          render: createContentPickerRender(tenantId, cp.contentType, cp.displayField),
        };
      }
    }

    // Inject link picker renders
    for (const lp of LINK_PICKER_FIELDS) {
      if (lp.blockType === entry.type && fields[lp.fieldKey]) {
        fields[lp.fieldKey] = {
          ...fields[lp.fieldKey] as Record<string, unknown>,
          render: createLinkPickerRender(tenantId),
        };
      }
    }

    // Inject multi-page picker renders (stored denormalized)
    for (const pp of PAGES_MULTI_PICKER_FIELDS) {
      if (pp.blockType === entry.type && fields[pp.fieldKey]) {
        fields[pp.fieldKey] = {
          ...fields[pp.fieldKey] as Record<string, unknown>,
          render: createPagesMultiPickerRender(tenantId),
        };
      }
    }

    // Inject address picker renders (top-level fields)
    for (const ap of ADDRESS_PICKER_FIELDS) {
      if (ap.blockType === entry.type && fields[ap.fieldKey]) {
        fields[ap.fieldKey] = {
          ...fields[ap.fieldKey] as Record<string, unknown>,
          render: createAddressPickerRender({ fieldKind: ap.fieldKind }),
        };
      }
    }

    // Inject emoji / date / address pickers inside array sub-fields
    const injectArrayFieldRender = (
      arrayField: string,
      subField: string,
      render: unknown
    ) => {
      const arr = fields[arrayField] as
        | { arrayFields?: Record<string, Record<string, unknown>> }
        | undefined;
      if (arr?.arrayFields?.[subField]) {
        arr.arrayFields[subField] = {
          ...arr.arrayFields[subField],
          render,
        };
      }
    };

    for (const ep of EMOJI_PICKER_ARRAY_FIELDS) {
      if (ep.blockType === entry.type) {
        injectArrayFieldRender(ep.arrayField, ep.subField, createEmojiPickerRender());
      }
    }
    for (const dp of DATE_PICKER_ARRAY_FIELDS) {
      if (dp.blockType === entry.type) {
        injectArrayFieldRender(dp.arrayField, dp.subField, createDatePickerRender());
      }
    }
    for (const ap of ADDRESS_PICKER_ARRAY_FIELDS) {
      if (ap.blockType === entry.type) {
        injectArrayFieldRender(
          ap.arrayField,
          ap.subField,
          createAddressPickerRender({ fieldKind: ap.fieldKind })
        );
      }
    }
    for (const mp of MEDIA_URL_ARRAY_FIELDS) {
      if (mp.blockType === entry.type) {
        injectArrayFieldRender(
          mp.arrayField,
          mp.subField,
          createMediaPickerRender(tenantId, mp.mediaType, { storeAs: "url" })
        );
      }
    }

    // Inject slot-items editor renders (header/footer custom fields)
    for (const sp of SLOT_ITEMS_FIELDS) {
      if (sp.blockType === entry.type && fields[sp.fieldKey]) {
        fields[sp.fieldKey] = {
          ...fields[sp.fieldKey] as Record<string, unknown>,
          render: createSlotItemsFieldRender(tenantId, { label: sp.label }),
        };
      }
    }

    // Inject styled-field renders (generic content + style editor).
    // Each entry wraps an existing custom field with a base input and a
    // collapsible "Style" panel — works for text/headings/images/videos/
    // buttons/sections.
    for (const sf of STYLED_FIELDS) {
      if (sf.blockType === entry.type && fields[sf.fieldKey]) {
        fields[sf.fieldKey] = {
          ...fields[sf.fieldKey] as Record<string, unknown>,
          render: createStyledFieldRender(tenantId, {
            kind: sf.kind,
            base: sf.base,
            label: sf.label,
            placeholder: sf.placeholder,
          }),
        };
      }
    }

    // Safety net: any custom field that wasn't wired up by an injector above
    // would crash Puck with "Field type for custom did not exist". Convert
    // those to a plain text input so the editor stays usable while we fix
    // the missing wiring.
    for (const [fk, fv] of Object.entries(fields)) {
      const f = fv as { type?: string; render?: unknown; label?: string };
      if (f && f.type === "custom" && (f.render === null || typeof f.render !== "function")) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.warn(
            `[puck/config] Missing render for custom field "${entry.type}.${fk}" — falling back to text input.`,
          );
        }
        fields[fk] = { type: "text", label: f.label ?? fk };
      }
    }

    const isHeaderFooter =
      entry.type === "site_header" ||
      entry.type === "site_footer" ||
      entry.type === "page_content_placeholder";

    components[entry.type] = {
      label: entry.label,
      fields,
      defaultProps,
      ...(isHeaderFooter ? { permissions: HEADER_FOOTER_PERMISSIONS } : {}),
      // Puck injects `id` and `puck` into props; strip them before passing to our component
      render: function PuckBlockRender(props: Record<string, unknown>) {
        const { id: _id, puck: _puck, ...content } = props;
        return <Component content={content} />;
      },
    };
  }

  if (variant === "site_header") {
    return {
      components,
      categories: {
        layout: {
          title: "Header & Footer",
          components: [
            "site_header",
            "page_content_placeholder",
            "site_footer",
          ],
        },
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
        components: ["services", "team", "stats", "opening_hours", "faq", "portfolio", "features_list", "menu_category", "booking_block"],
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
