/**
 * Stitch MCP / export types.
 *
 * These represent the intermediate format used when ingesting Stitch screens
 * into our provisioning pipeline. The exact shape returned by mcp_stitch_*
 * tools may vary; the parser normalises into these types.
 */

export interface StitchProject {
  id: string;
  title: string;
  designSystem?: string;
  designTokens?: Record<string, unknown>;
}

/** A section of a Stitch screen. Each section maps to one of our blocks. */
export interface StitchSection {
  /** The section identifier as it appears in the Stitch screen.
   *  Should match a key in STITCH_BLOCK_MAP. e.g. "hero", "services". */
  type: string;
  /** Free-form props for this section, in Stitch's vocabulary. */
  props: Record<string, unknown>;
}

export interface StitchScreen {
  id: string;
  name: string;
  /** Suggested page slug. If omitted, derived from name. */
  slug?: string;
  sections: StitchSection[];
  /** Image URLs referenced anywhere in the screen (top-level convenience). */
  imageUrls?: string[];
}

/** A block that has been resolved against STITCH_BLOCK_MAP. */
export interface ParsedBlock {
  /** Our block-registry type (e.g. "hero"). */
  type: string;
  position: number;
  content: Record<string, unknown>;
  /** When set, content references this image which still needs downloading. */
  imageRefs?: Array<{ contentKey: string; remoteUrl: string }>;
}

export interface ParsedPage {
  slug: string;
  title: string;
  blocks: ParsedBlock[];
  warnings: UnmappedComponent[];
}

export interface UnmappedComponent {
  stitchType: string;
  page: string;
  position: number;
  fallback: string;
  suggestion: string;
}

/**
 * Branding shape we store in tenants.branding JSONB.
 * Matches the columns the admin tenant form already writes.
 */
export interface TenantBranding {
  primary_color?: string;
  accent_color?: string;
  bg_color?: string;
  font_family?: string;
  logo_url?: string;
  favicon_url?: string;
}

/** Result of running the image downloader for a single screen. */
export interface MediaUploadResult {
  /** The original URL as referenced in Stitch. */
  remoteUrl: string;
  /** Supabase storage path (e.g. "media/12/hero-abc.png"). */
  storagePath: string;
  /** Public/signed URL for immediate use. */
  publicUrl: string;
  /** Inserted media row ID. */
  mediaId: number;
}
