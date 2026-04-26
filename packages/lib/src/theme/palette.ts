/**
 * Tenant theme palette utilities.
 *
 * Tenant theme presets are stored as 6-digit hex strings under
 * `site_settings.theme.palette`. Public-site blocks consume Tailwind
 * utility classes such as `bg-primary` / `text-foreground` which read
 * `hsl(var(--primary))` etc. To make blocks inherit the tenant theme,
 * we convert each hex value into a `"H S% L%"` tuple and apply it as
 * an override on the public-site wrapper. The admin shell never sees
 * these overrides because the layout gates them by route.
 *
 * NOTE: This module is pure and isomorphic — safe to import from both
 * server components and the Puck editor client component.
 */

export interface TenantPalette {
  primary?: string;
  primaryForeground?: string;
  accent?: string;
  accentForeground?: string;
  background?: string;
  foreground?: string;
  muted?: string;
}

/**
 * Convert a `#rrggbb`, `#rgb`, or bare-hex color into an `"H S% L%"`
 * tuple suitable for inlining as `--primary: <tuple>` so that
 * `hsl(var(--primary))` resolves correctly.
 *
 * Returns `null` for invalid input — callers should fall through to
 * the default admin theme value.
 */
export function hexToHslTuple(hex: string | undefined | null): string | null {
  if (!hex || typeof hex !== "string") return null;
  let h = hex.trim().replace(/^#/, "");

  // Expand 3-digit shorthand (#abc → #aabbcc)
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }

  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;

  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let hue = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        hue = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        hue = (b - r) / d + 2;
        break;
      case b:
        hue = (r - g) / d + 4;
        break;
    }
    hue *= 60;
  }

  // Round to one decimal for compactness
  const H = Math.round(hue * 10) / 10;
  const S = Math.round(s * 1000) / 10;
  const L = Math.round(l * 1000) / 10;
  return `${H} ${S}% ${L}%`;
}

/**
 * Convert a tenant palette (hex values) into a record of CSS custom
 * properties that override the admin theme tokens used by Tailwind
 * utility classes (`bg-primary`, `text-foreground`, `bg-card`, etc.).
 *
 * Only keys with a valid hex value are emitted — missing keys fall
 * through to the admin theme default so the page never breaks.
 *
 * Derived mappings:
 *  - `card`, `popover` ← `background`
 *  - `card-foreground`, `popover-foreground` ← `foreground`
 *  - `border`, `input` ← `muted` (or skipped if absent)
 *  - `ring` ← `primary`
 *  - `secondary` ← `accent`
 *  - `secondary-foreground` ← `accentForeground`
 */
export function paletteToCssVars(
  palette: TenantPalette | null | undefined,
): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!palette) return vars;

  const set = (key: string, hex: string | undefined) => {
    const tuple = hexToHslTuple(hex);
    if (tuple) vars[key] = tuple;
  };

  set("--primary", palette.primary);
  set("--ring", palette.primary);
  set("--primary-foreground", palette.primaryForeground);

  set("--accent", palette.accent);
  set("--secondary", palette.accent);
  set("--accent-foreground", palette.accentForeground);
  set("--secondary-foreground", palette.accentForeground);

  set("--background", palette.background);
  set("--card", palette.background);
  set("--popover", palette.background);

  set("--foreground", palette.foreground);
  set("--card-foreground", palette.foreground);
  set("--popover-foreground", palette.foreground);

  set("--muted", palette.muted);
  set("--border", palette.muted);
  set("--input", palette.muted);
  set("--muted-foreground", palette.foreground);

  return vars;
}
