/**
 * Site settings — per-tenant, namespaced JSONB config.
 *
 * Every namespace is independent: a settings panel reads/writes its own
 * namespace through `getSettings`/`upsertSettings`. Adding a namespace
 * requires no migration — only types here and a UI panel.
 *
 * Rule of thumb: anything that controls site-wide *non-content* concerns
 * (theme, navigation behaviour, header/footer, SEO defaults, etc.) lives
 * here. Page content stays in the `pages`/`sections`/`blocks` tables.
 */

import type { SlotItem, NavPageRef } from "../tenant/context";

/** Stable, well-known namespace identifiers. */
export type SettingsNamespace =
  | "theme"
  | "navigation"
  | "header"
  | "footer"
  | "seo"
  | "advanced";

// ── theme ───────────────────────────────────────────────────────────────
export interface ThemeSettings {
  /** Whether the public site renders light or dark. Admin theme is independent. */
  mode?: "light" | "dark";
  palette?: {
    primary?: string;          // hex (#rrggbb)
    primaryForeground?: string;
    accent?: string;
    accentForeground?: string;
    background?: string;
    foreground?: string;
    muted?: string;
  };
  font?: {
    family?: string;
    headingFamily?: string;
  };
  /** Optional per-tenant accent for the admin chrome. Independent from public theme. */
  adminAccent?: string;
}

// ── navigation ──────────────────────────────────────────────────────────
export interface NavigationSettings {
  /** Smooth-scroll behaviour for `#anchor` links on the public site. */
  smoothScroll?: boolean;
  /** When true, anchors that don't resolve fall back to `/{slug}` page link. */
  anchorFallbackToPage?: boolean;
}

// ── header / footer ────────────────────────────────────────────────────
// These mirror SiteHeaderConfig / SiteFooterConfig shapes from
// `@repo/lib/tenant/context`. They are NOT yet the canonical storage —
// header/footer remain in the phantom `site_header` page row for now to keep
// the existing Puck editor working unchanged. The settings table is wired
// up so a future migration can move them here without a schema change.
export interface HeaderSettings {
  leftItems?: SlotItem[];
  rightItems?: SlotItem[];
  navPages?: NavPageRef[];
  sticky?: boolean;
  borderBottom?: boolean;
}

export interface FooterSettings {
  leftItems?: SlotItem[];
  centerItems?: SlotItem[];
  rightItems?: SlotItem[];
  borderTop?: boolean;
}

// ── seo ────────────────────────────────────────────────────────────────
export interface SeoSettings {
  defaultMetaTitle?: string;
  metaTitlePattern?: string;        // e.g. "{pageTitle} — {siteName}"
  defaultMetaDescription?: string;
  defaultOgImageMediaId?: number | null;
  robotsAllow?: boolean;             // false = "noindex, nofollow"
  sitemapEnabled?: boolean;
}

// ── advanced ───────────────────────────────────────────────────────────
export interface AdvancedSettings {
  customCss?: string;
  customHeadHtml?: string;
}

/** Map a namespace string to its strongly-typed value shape. */
export interface SettingsByNamespace {
  theme: ThemeSettings;
  navigation: NavigationSettings;
  header: HeaderSettings;
  footer: FooterSettings;
  seo: SeoSettings;
  advanced: AdvancedSettings;
}
