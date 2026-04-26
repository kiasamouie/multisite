/**
 * Generic content-style schema shared across blocks.
 *
 * A `ContentStyle` describes "how a piece of content looks" — applied to
 * text, images, videos, buttons or whole sections. The same shape is used
 * everywhere; the editor (and `resolveContentStyle`) decide which subset
 * is actually meaningful for a given `ContentStyleKind`.
 *
 * Block components consume styled values like:
 *   `{ text: "Title", style: { color: "#f00", size: "2xl" } }`
 * and call `resolveContentStyle("text", value.style)` to get
 * `{ className, style }` to spread on the rendered element.
 */
import type { CSSProperties } from "react";

export type ContentStyleKind =
  | "text"
  | "heading"
  | "image"
  | "video"
  | "button"
  | "section";

export interface ContentStyle {
  // ── Typography (text / heading / button label) ─────────────────────
  color?: string;
  size?: "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  /** Pixel font size (slider). When set, takes precedence over `size`. */
  fontSizePx?: number;
  weight?: "normal" | "medium" | "semibold" | "bold" | "extrabold";
  italic?: boolean;
  align?: "left" | "center" | "right";  /** CSS font-family token — see FONT_FAMILY_OPTIONS for the curated list. */
  fontFamily?: string;
  /** Line height (unitless multiplier, e.g. 1.5). */
  lineHeight?: number;
  /** Letter spacing in em (e.g. 0.05 = 0.05em). Negative tightens. */
  letterSpacingEm?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through";
  // ── Box (any element) ──────────────────────────────────────────────
  backgroundColor?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /** Pixel border-radius (slider). When set, takes precedence over `rounded`. */
  borderRadius?: number;
  shadow?: "none" | "sm" | "md" | "lg" | "xl";

  // ── Layout (section / container) ───────────────────────────────────
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  paddingY?: "none" | "sm" | "md" | "lg" | "xl";
  paddingX?: "none" | "sm" | "md" | "lg" | "xl";
  /** Pixel vertical padding (slider). When set, takes precedence over `paddingY`. */
  paddingYPx?: number;
  /** Pixel horizontal padding (slider). When set, takes precedence over `paddingX`. */
  paddingXPx?: number;
  selfAlign?: "left" | "center" | "right"; // alignment of the element itself

  // ── Image / Video specific ─────────────────────────────────────────
  height?: number; // px
  aspectRatio?: "16/9" | "4/3" | "1/1" | "21/9";

  // ── Button specific ────────────────────────────────────────────────
  variant?: "default" | "outline" | "ghost";
}

// ── Class-name maps ─────────────────────────────────────────────────

const SIZE_CLASS: Record<string, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
};

const WEIGHT_CLASS: Record<string, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
};

const ALIGN_CLASS: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const SELF_ALIGN_CLASS: Record<string, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

const ROUNDED_CLASS: Record<string, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  full: "rounded-full",
};

const SHADOW_CLASS: Record<string, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
};

const MAX_WIDTH_CLASS: Record<string, string> = {
  sm: "max-w-xl",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
  full: "max-w-none",
};

const PAD_Y_CLASS: Record<string, string> = {
  none: "py-0",
  sm: "py-4",
  md: "py-8",
  lg: "py-12",
  xl: "py-20",
};

const PAD_X_CLASS: Record<string, string> = {
  none: "px-0",
  sm: "px-2",
  md: "px-4",
  lg: "px-6",
  xl: "px-10",
};

const ASPECT_PADDING: Record<string, string> = {
  "16/9": "56.25%",
  "4/3": "75%",
  "1/1": "100%",
  "21/9": "42.857%",
};

// ── Resolver ────────────────────────────────────────────────────────

export interface ResolvedStyle {
  className: string;
  style: CSSProperties;
  /**
   * For images / video embeds: padding-top % to use on a wrapper for
   * locked aspect ratios. Only set when `aspectRatio` was provided.
   */
  aspectPadding?: string;
}

/**
 * Translate a `ContentStyle` into Tailwind classes + inline styles for
 * a given content kind. Anything irrelevant for that kind is ignored.
 */
export function resolveContentStyle(
  kind: ContentStyleKind,
  s: ContentStyle | undefined,
): ResolvedStyle {
  const style: CSSProperties = {};
  const cls: string[] = [];

  if (!s) return { className: "", style };

  // Typography — text/heading/button
  if (kind === "text" || kind === "heading" || kind === "button") {
    if (typeof s.fontSizePx === "number" && s.fontSizePx > 0) {
      style.fontSize = `${s.fontSizePx}px`;
    } else if (s.size) {
      cls.push(SIZE_CLASS[s.size] ?? "");
    }
    if (s.weight) cls.push(WEIGHT_CLASS[s.weight] ?? "");
    if (s.italic) cls.push("italic");
    if (s.align) cls.push(ALIGN_CLASS[s.align] ?? "");
    if (s.color) style.color = s.color;
    if (s.fontFamily) style.fontFamily = s.fontFamily;
    if (typeof s.lineHeight === "number" && s.lineHeight > 0) {
      style.lineHeight = s.lineHeight;
    }
    if (typeof s.letterSpacingEm === "number") {
      style.letterSpacing = `${s.letterSpacingEm}em`;
    }
    if (s.textTransform && s.textTransform !== "none") {
      style.textTransform = s.textTransform;
    }
    if (s.textDecoration && s.textDecoration !== "none") {
      style.textDecoration = s.textDecoration;
    }
  }

  // Box styling — only meaningful for elements rendered as a visible
  // "box" (sections, buttons, images, videos). For sections we now hide
  // rounded corners + shadow from the editor (they look odd on a full-
  // width section), but we still apply them here if persisted, for
  // backward compatibility with existing content.
  if (
    kind === "section" ||
    kind === "button" ||
    kind === "image" ||
    kind === "video"
  ) {
    if (typeof s.borderRadius === "number" && s.borderRadius >= 0) {
      style.borderRadius = `${s.borderRadius}px`;
    } else if (s.rounded) {
      cls.push(ROUNDED_CLASS[s.rounded] ?? "");
    }
    if (s.shadow) cls.push(SHADOW_CLASS[s.shadow] ?? "");
    if (s.backgroundColor) style.backgroundColor = s.backgroundColor;
  }

  // Layout — sections / containers
  if (kind === "section") {
    if (s.maxWidth) cls.push(MAX_WIDTH_CLASS[s.maxWidth] ?? "");
    if (typeof s.paddingYPx === "number" && s.paddingYPx >= 0) {
      style.paddingTop = `${s.paddingYPx}px`;
      style.paddingBottom = `${s.paddingYPx}px`;
    } else if (s.paddingY) {
      cls.push(PAD_Y_CLASS[s.paddingY] ?? "");
    }
    if (typeof s.paddingXPx === "number" && s.paddingXPx >= 0) {
      style.paddingLeft = `${s.paddingXPx}px`;
      style.paddingRight = `${s.paddingXPx}px`;
    } else if (s.paddingX) {
      cls.push(PAD_X_CLASS[s.paddingX] ?? "");
    }
  }

  // Self-alignment (image/video centred or floated)
  if ((kind === "image" || kind === "video") && s.selfAlign) {
    cls.push(SELF_ALIGN_CLASS[s.selfAlign] ?? "");
  }

  // Image / video sizing
  if (kind === "image" || kind === "video") {
    if (typeof s.height === "number" && s.height > 0) {
      style.height = `${s.height}px`;
    }
  }

  // Button variant — only sets bg/border if not already overridden by the
  // explicit `variant` prop on the consuming component.
  if (kind === "button" && s.variant) {
    if (s.variant === "outline") cls.push("border border-current");
  }

  const aspectPadding =
    (kind === "image" || kind === "video") && s.aspectRatio
      ? ASPECT_PADDING[s.aspectRatio]
      : undefined;

  return {
    className: cls.filter(Boolean).join(" "),
    style,
    aspectPadding,
  };
}

// ── Styled value shapes ─────────────────────────────────────────────

/** Generic wrapper: any value plus an optional style override. */
export interface Styled<V> {
  value: V;
  style?: ContentStyle;
}

export type StyledText = Styled<string>;

/** Helper for legacy migration: accept either a plain string or `{ value, style }`. */
export function readStyledText(v: unknown): StyledText {
  if (v && typeof v === "object" && "value" in v) {
    const o = v as { value?: unknown; style?: ContentStyle };
    return { value: typeof o.value === "string" ? o.value : "", style: o.style };
  }
  return { value: typeof v === "string" ? v : "" };
}

// ── Font family options ─────────────────────────────────────────────
//
// Curated list of font stacks the editor exposes in the font-family
// picker. Fonts are loaded via `next/font/google` in
// `apps/web/src/app/layout.tsx` and exposed as CSS custom properties on
// `<body>` (e.g. `--font-inter`). We reference those variables first
// with literal-name fallbacks for robustness.

export const FONT_FAMILY_OPTIONS: Array<{
  value: string;
  label: string;
  category: "Sans-serif" | "Serif" | "Display" | "Monospace";
}> = [
  { value: 'var(--font-manrope), "Manrope", ui-sans-serif, system-ui, sans-serif', label: "Manrope (default)", category: "Sans-serif" },
  { value: 'var(--font-inter), "Inter", ui-sans-serif, system-ui, sans-serif', label: "Inter", category: "Sans-serif" },
  { value: 'var(--font-roboto), "Roboto", ui-sans-serif, system-ui, sans-serif', label: "Roboto", category: "Sans-serif" },
  { value: 'var(--font-poppins), "Poppins", ui-sans-serif, system-ui, sans-serif', label: "Poppins", category: "Sans-serif" },
  { value: 'var(--font-montserrat), "Montserrat", ui-sans-serif, system-ui, sans-serif', label: "Montserrat", category: "Sans-serif" },
  { value: 'var(--font-lora), "Lora", ui-serif, Georgia, serif', label: "Lora", category: "Serif" },
  { value: 'var(--font-playfair), "Playfair Display", ui-serif, Georgia, serif', label: "Playfair Display", category: "Serif" },
  { value: 'var(--font-merriweather), "Merriweather", ui-serif, Georgia, serif', label: "Merriweather", category: "Serif" },
  { value: 'var(--font-oswald), "Oswald", ui-sans-serif, system-ui, sans-serif', label: "Oswald", category: "Display" },
  { value: 'var(--font-bebas), "Bebas Neue", ui-sans-serif, system-ui, sans-serif', label: "Bebas Neue", category: "Display" },
  { value: 'var(--font-jetbrains), "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace', label: "JetBrains Mono", category: "Monospace" },
];
