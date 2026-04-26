/**
 * Token extractor: parses a free-form design.md file and pulls out the
 * core branding tokens (colours + font families) we store on
 * tenants.branding JSONB.
 *
 * The parser is deliberately permissive — design.md files vary a lot. It
 * scans for:
 *  - `primary` / `secondary` / `surface` / `background` colour callouts
 *    with associated hex codes
 *  - Font names tagged near "Display", "Body", "Headline" or "Sans-serif"
 *
 * Anything it can't determine is left undefined so the caller can fill
 * gaps manually.
 */

import type { TenantBranding } from "./types";

const HEX = /#([0-9a-f]{3}|[0-9a-f]{6})\b/i;

interface Hit {
  hex: string;
  pos: number;
}

function findHexNear(md: string, ...keywords: string[]): string | undefined {
  const lower = md.toLowerCase();
  for (const kw of keywords) {
    let from = 0;
    while (true) {
      const idx = lower.indexOf(kw.toLowerCase(), from);
      if (idx === -1) break;
      // Look up to 200 chars ahead for a hex code
      const window = md.slice(idx, idx + 200);
      const match = window.match(HEX);
      if (match) return match[0];
      from = idx + kw.length;
    }
  }
  return undefined;
}

function findFontNear(md: string, ...keywords: string[]): string | undefined {
  const lower = md.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw.toLowerCase());
    if (idx === -1) continue;
    const window = md.slice(idx, idx + 200);
    // Match "(Font Name)" or "Font Name:"
    const paren = window.match(/\(([A-Z][A-Za-z0-9 ]{2,30})\)/);
    if (paren) return paren[1].trim();
    const colon = window.match(/[A-Z][A-Za-z]+(?:\s[A-Z][A-Za-z]+)*\s*[:—-]/);
    if (colon) return colon[0].replace(/[:—-]\s*$/, "").trim();
  }
  return undefined;
}

export function extractBrandingFromDesignMd(md: string): TenantBranding {
  const branding: TenantBranding = {};

  const primary = findHexNear(md, "primary", "pomegranate", "brand colour", "brand color");
  const accent = findHexNear(md, "secondary", "accent", "saffron");
  const bg = findHexNear(
    md,
    "surface",
    "background",
    "off-white canvas",
    "canvas",
    "base background"
  );

  if (primary) branding.primary_color = primary;
  if (accent) branding.accent_color = accent;
  if (bg) branding.bg_color = bg;

  const font =
    findFontNear(md, "Body", "Sans-serif", "Manrope") ||
    findFontNear(md, "Headline", "Display", "Serif");
  if (font) branding.font_family = font;

  return branding;
}
