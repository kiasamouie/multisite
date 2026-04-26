export interface Tenant {
  id: number;
  name: string;
  domain: string;
  from_email: string | null;
  stripe_customer_id: string | null;
  plan: "starter" | "growth" | "pro";
  admin_enabled: boolean;
  branding: TenantBranding;
  nav_config: TenantNavConfig;
  created_at: string;
}

export interface TenantBranding {
  primary_color?: string;
  accent_color?: string;
  bg_color?: string;
  font_family?: string;
  logo_url?: string;
  favicon_url?: string;
}

export interface TenantNavConfig {
  links?: Array<{ label: string; href: string }>;
  cta?: { label: string; href: string };
}

/**
 * A single slot item used by both the site header and footer.
 * Mirrors `HeaderSlotItem` from @repo/template/types so we avoid a direct
 * dependency from `@repo/lib` onto `@repo/template`.
 */
export interface SlotItem {
  kind: "text" | "image" | "button";
  text?: string;
  imageId?: number | null;
  href?: string;

  textSize?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
  textWeight?: "normal" | "medium" | "semibold" | "bold";
  textColor?: string;
  italic?: boolean;

  imageHeight?: number;
  imageRounded?: "none" | "sm" | "md" | "lg" | "full";
  imageAlt?: string;

  variant?: "default" | "outline" | "ghost";
  buttonSize?: "sm" | "default" | "lg";
  buttonBg?: string;
  buttonFg?: string;

  marginX?: number;
}

/**
 * A nav link entry on the site header. Three flavours:
 *  - `page`     → links to a tenant page (legacy default; `kind` may be omitted)
 *  - `anchor`   → links to a section on a page, e.g. `/about#pricing`
 *  - `external` → arbitrary URL, opens in same tab unless caller forces `_blank`
 *
 * Stored shape stays back-compat with old rows that only have `{id, title, href}`:
 * those are interpreted as `kind: "page"` automatically.
 */
export interface NavPageRef {
  /** Discriminator — defaults to `"page"` when missing. */
  kind?: "page" | "anchor" | "external";
  /** Page id for `page` and `anchor` kinds. Optional for `external`. */
  id?: number;
  /** Section id for `anchor` kinds (links to `/{slug}#{anchor_slug}`). */
  sectionId?: number;
  title: string;
  /** Resolved href used by the renderer. Always pre-computed by the picker. */
  href: string;
}

/**
 * Bulk text style applied to every slot item in a header/footer.
 * Mirrors the typography-only subset of `ContentStyle` from
 * `@repo/template`. Per-item fields override these defaults.
 */
export interface SlotGroupTextStyle {
  color?: string;
  fontSizePx?: number;
  weight?: "normal" | "medium" | "semibold" | "bold" | "extrabold";
  italic?: boolean;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacingEm?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through";
}

/**
 * Header visual settings derived from the `site_header` Puck block
 * stored on the tenant's shared Header & Footer page.
 */
export interface SiteHeaderConfig {
  leftItems?: SlotItem[];
  rightItems?: SlotItem[];
  navPages?: NavPageRef[];
  sticky?: boolean;
  /** Transparent at top of page, solid on scroll. Only effective when `sticky` is true. */
  scrollTransparency?: boolean;
  borderBottom?: boolean;
  /** Hex colour for the header bar background. Empty/undefined = use tenant theme background. */
  backgroundColor?: string;
  /** 0-100. 100 = solid, 0 = fully transparent. */
  backgroundOpacity?: number;
  /** Apply backdrop-blur (translucent frosted-glass effect). */
  backdropBlur?: boolean;
  /** Bulk typography applied to the auto-generated nav-page links only. */
  navPagesTextStyle?: SlotGroupTextStyle;
  headerPageId?: number;
}

/**
 * Footer visual settings derived from the `site_footer` Puck block.
 * Three independent slots — no pages/nav list.
 */
export interface SiteFooterConfig {
  leftItems?: SlotItem[];
  centerItems?: SlotItem[];
  rightItems?: SlotItem[];
  borderTop?: boolean;
  /** Hex colour for the footer background. Empty/undefined = use tenant theme background. */
  backgroundColor?: string;
  /** 0-100. 100 = solid, 0 = fully transparent. */
  backgroundOpacity?: number;
  footerPageId?: number;
}

export interface TenantContext {
  tenant: Tenant;
  userId: string | null;
  role: "owner" | "admin" | "editor" | null;
}
